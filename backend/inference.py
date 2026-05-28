import base64
import os
import tempfile
from typing import List, Dict, Any

import torch
import torch.nn.functional as F

from anticipation.convert import midi_to_events, events_to_midi
from anticipation.ops import (
    TIME_OFFSET,
    DUR_OFFSET,
    NOTE_OFFSET,
    MIDI_END_OFFSET,
    SPECIAL_OFFSET,
    EVENT_SIZE,
)


MODEL_NAME = "stanford-crfm/music-medium-800k"
_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model

    from transformers import AutoModelForCausalLM

    print(f"Loading {MODEL_NAME}... (this happens once, ~30s)")
    _model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, attn_implementation="eager"
    )
    _model.eval()
    return _model


def _token_to_string(token_id: int) -> str:
    if token_id < DUR_OFFSET:
        return f"t={token_id}"
    if token_id < NOTE_OFFSET:
        return f"d={token_id - DUR_OFFSET}"
    if token_id < MIDI_END_OFFSET:
        offset = token_id - NOTE_OFFSET
        pitch = offset % 128
        instrument = offset // 128
        return f"p={pitch}/i{instrument}"
    if token_id < SPECIAL_OFFSET:
        return f"<ctrl:{token_id}>"
    return f"<sep:{token_id}>"


def apply_temperature(logits: torch.Tensor, temperature: float) -> torch.Tensor:
    if temperature <= 0:
        raise ValueError("temperature must be > 0")
    return logits / temperature


def sample_top_k(probs: torch.Tensor, k: int) -> int:
    top_probs, top_idx = torch.topk(probs, k)
    top_probs = top_probs / top_probs.sum()
    choice = torch.multinomial(top_probs, 1).item()
    return top_idx[choice].item()


def sample_top_p(probs: torch.Tensor, p: float) -> int:
    sorted_probs, sorted_idx = torch.sort(probs, descending=True)
    cumulative = torch.cumsum(sorted_probs, dim=0)
    cutoff = (cumulative <= p).sum().item() + 1
    cutoff = max(cutoff, 1)
    kept_probs = sorted_probs[:cutoff]
    kept_idx = sorted_idx[:cutoff]
    kept_probs = kept_probs / kept_probs.sum()
    choice = torch.multinomial(kept_probs, 1).item()
    return kept_idx[choice].item()


def sample_greedy(probs: torch.Tensor) -> int:
    return torch.argmax(probs).item()


def generate_continuation(
    midi_bytes: bytes,
    temperature: float = 0.8,
    max_new_tokens: int = 30,
    sampling: str = "top_p",
    top_k: int = 40,
    top_p: float = 0.9,
) -> Dict[str, Any]:
    model = _load_model()

    with tempfile.NamedTemporaryFile(suffix=".mid", delete=False) as tf:
        tf.write(midi_bytes)
        in_path = tf.name
    try:
        events = midi_to_events(in_path)
    finally:
        try:
            os.unlink(in_path)
        except OSError:
            pass

    if not events:
        raise ValueError("MIDI produced no events after tokenization")

    input_ids = torch.tensor([events], dtype=torch.long)
    input_token_strings = [_token_to_string(t) for t in events]

    generated_token_strings: List[str] = []
    steps: List[Dict[str, Any]] = []

    with torch.no_grad():
        for step in range(max_new_tokens):
            outputs = model(input_ids, output_attentions=True)
            logits = outputs.logits[0, -1, :].clone()

            logits[MIDI_END_OFFSET:] = -1e9
            logits[NOTE_OFFSET + 128 : MIDI_END_OFFSET] = -1e9
            logits[NOTE_OFFSET : NOTE_OFFSET + 36] = -1e9
            logits[NOTE_OFFSET + 96 : NOTE_OFFSET + 128] = -1e9
            logits[DUR_OFFSET : DUR_OFFSET + 20] = -1e9

            seq = input_ids[0].tolist()
            position_in_event = len(seq) % EVENT_SIZE
            if position_in_event == 0:
                logits[DUR_OFFSET:] = -1e9
                last_time = 0
                for i in range(len(seq) - EVENT_SIZE, -1, -EVENT_SIZE):
                    if seq[i] < DUR_OFFSET:
                        last_time = seq[i]
                        break
                if last_time > 0:
                    min_gap = 25
                    max_jump = 200
                    logits[: last_time + min_gap] = -1e9
                    if last_time + max_jump + 1 < DUR_OFFSET:
                        logits[last_time + max_jump + 1 : DUR_OFFSET] = -1e9
            elif position_in_event == 1:
                logits[:DUR_OFFSET] = -1e9
                logits[NOTE_OFFSET:] = -1e9
            else:
                logits[:NOTE_OFFSET] = -1e9

            scaled_logits = apply_temperature(logits, temperature)
            probs = F.softmax(scaled_logits, dim=-1)

            top5_probs, top5_idx = torch.topk(probs, 5)
            top_candidates = [
                {"token": _token_to_string(idx.item()), "prob": float(p.item())}
                for p, idx in zip(top5_probs, top5_idx)
            ]

            if sampling == "greedy":
                next_id = sample_greedy(probs)
            elif sampling == "top_k":
                next_id = sample_top_k(probs, top_k)
            elif sampling == "top_p":
                next_id = sample_top_p(probs, top_p)
            else:
                raise ValueError(f"Unknown sampling: {sampling}")

            chosen_token = _token_to_string(next_id)
            generated_token_strings.append(chosen_token)

            last_layer_attn = outputs.attentions[-1][0]
            avg_attn = last_layer_attn.mean(dim=0)
            last_row = avg_attn[-1].tolist()
            attention_matrix = [last_row]

            steps.append({
                "step": step,
                "chosen_token": chosen_token,
                "top_candidates": top_candidates,
                "attention": attention_matrix,
            })

            input_ids = torch.cat(
                [input_ids, torch.tensor([[next_id]])], dim=1
            )

    all_events = input_ids[0].tolist()
    trim = len(all_events) - (len(all_events) % EVENT_SIZE)
    aligned = all_events[:trim]

    try:
        midi = events_to_midi(aligned)
        for track in midi.tracks:
            for msg in track:
                if msg.type == "note_on" and msg.velocity > 0:
                    msg.velocity = min(msg.velocity, 70)
        with tempfile.NamedTemporaryFile(suffix=".mid", delete=False) as tf:
            out_path = tf.name
        try:
            midi.save(out_path)
            with open(out_path, "rb") as f:
                midi_bytes_out = f.read()
        finally:
            try:
                os.unlink(out_path)
            except OSError:
                pass
    except Exception as e:
        print(f"[inference] events_to_midi failed: {e}")
        midi_bytes_out = b""

    midi_base64 = base64.b64encode(midi_bytes_out).decode("utf-8")

    return {
        "midi_base64": midi_base64,
        "input_tokens": input_token_strings,
        "generated_tokens": generated_token_strings,
        "steps": steps,
    }
