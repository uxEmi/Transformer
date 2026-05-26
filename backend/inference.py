import base64
from typing import List, Dict, Any

import torch
import torch.nn.functional as F

from midi_utils import abc_to_midi_bytes, midi_bytes_to_abc, tokens_to_abc


MODEL_NAME = "ehcalabres/distilgpt2-abc-irish-music-generation"
TOKENIZER_NAME = "distilgpt2"
_model = None
_tokenizer = None


def _load_model():
    global _model, _tokenizer
    if _model is not None:
        return _model, _tokenizer

    from transformers import AutoModelForCausalLM, AutoTokenizer

    print(f"Loading {MODEL_NAME}... (this happens once)")
    _tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_NAME)
    _model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, attn_implementation="eager")
    _model.eval()
    if _tokenizer.pad_token is None:
        _tokenizer.pad_token = _tokenizer.eos_token

    return _model, _tokenizer


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
    max_new_tokens: int = 50,
    sampling: str = "top_p",
    top_k: int = 40,
    top_p: float = 0.9,
) -> Dict[str, Any]:
    model, tokenizer = _load_model()

    input_abc = midi_bytes_to_abc(midi_bytes)
    input_ids = tokenizer.encode(input_abc, return_tensors="pt")
    input_token_strings = [tokenizer.decode([i]) for i in input_ids[0].tolist()]

    generated_token_strings: List[str] = []
    steps: List[Dict[str, Any]] = []

    with torch.no_grad():
        for step in range(max_new_tokens):
            outputs = model(input_ids, output_attentions=True)
            logits = outputs.logits[0, -1, :]

            scaled_logits = apply_temperature(logits, temperature)

            probs = F.softmax(scaled_logits, dim=-1)

            top5_probs, top5_idx = torch.topk(probs, 5)
            top_candidates = [
                {"token": tokenizer.decode([idx.item()]), "prob": float(p.item())}
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

            chosen_token = tokenizer.decode([next_id])
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

            if next_id == tokenizer.eos_token_id:
                break

    full_text = tokenizer.decode(input_ids[0].tolist())
    abc_output = tokens_to_abc(full_text)
    midi_bytes = abc_to_midi_bytes(abc_output)
    midi_base64 = base64.b64encode(midi_bytes).decode("utf-8")

    return {
        "midi_base64": midi_base64,
        "input_tokens": input_token_strings,
        "generated_tokens": generated_token_strings,
        "steps": steps,
    }
