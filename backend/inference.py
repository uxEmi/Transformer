"""
The heart of the project: custom generation loop (NOT model.generate()).

We:
  1. Load the pretrained model once at startup (lazy global).
  2. Tokenize the seed with the model's own tokenizer.
  3. Generate one token at a time, manually:
       forward pass -> logits -> temperature -> sampling -> append -> repeat
  4. Extract attention and top-k candidates at each step for visualization.

Person A's main file. Most of the "I understand transformers" credit lives here.
"""

import base64
from typing import List, Dict, Any

import torch
import torch.nn.functional as F

from midi_utils import abc_to_midi_bytes, tokens_to_abc
from tokenizer import MusicBPE


# ---------- Model loading (lazy global) ----------
# Replace MODEL_NAME with the actual pretrained music model you choose.
# Candidates to try on Hugging Face:
#   - "sander-wood/text-to-music"
#   - "fredguth/abc-music-gpt2"
#   - any GPT-2 fine-tuned on ABC notation
MODEL_NAME = "gpt2"  # TODO: swap for an ABC-music model
_model = None
_tokenizer = None
_music_bpe = None


def _load_model():
    """Load model and tokenizer once. Called lazily on first request."""
    global _model, _tokenizer, _music_bpe
    if _model is not None:
        return _model, _tokenizer, _music_bpe

    from transformers import AutoModelForCausalLM, AutoTokenizer

    print(f"Loading {MODEL_NAME}... (this happens once)")
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    _model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    _model.eval()
    if _tokenizer.pad_token is None:
        _tokenizer.pad_token = _tokenizer.eos_token

    # Our BPE for music analysis (separate from the model's tokenizer).
    # See tokenizer.py — this is the week-1 BPE wrapped for music tokens.
    _music_bpe = MusicBPE()

    return _model, _tokenizer, _music_bpe


# ---------- Sampling strategies ----------

def apply_temperature(logits: torch.Tensor, temperature: float) -> torch.Tensor:
    """Scale logits by temperature. Lower = sharper, higher = flatter."""
    if temperature <= 0:
        raise ValueError("temperature must be > 0")
    return logits / temperature


def sample_top_k(probs: torch.Tensor, k: int) -> int:
    """Sample from the top-k tokens only."""
    top_probs, top_idx = torch.topk(probs, k)
    top_probs = top_probs / top_probs.sum()
    choice = torch.multinomial(top_probs, 1).item()
    return top_idx[choice].item()


def sample_top_p(probs: torch.Tensor, p: float) -> int:
    """Nucleus sampling: smallest set of tokens whose cumulative prob >= p."""
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
    """Always pick the most likely token."""
    return torch.argmax(probs).item()


# ---------- Custom generation loop ----------

def generate_continuation(
    seed_abc: str,
    temperature: float = 0.8,
    max_new_tokens: int = 50,
    sampling: str = "top_p",
    top_k: int = 40,
    top_p: float = 0.9,
) -> Dict[str, Any]:
    """
    The core function. NOT a call to model.generate().
    We write the generation loop ourselves so we can:
      - control every step
      - extract attention and candidates per step for visualization
    """
    model, tokenizer, _ = _load_model()

    # Encode the seed
    input_ids = tokenizer.encode(seed_abc, return_tensors="pt")
    seed_token_strings = [tokenizer.decode([i]) for i in input_ids[0].tolist()]

    generated_token_strings: List[str] = []
    steps: List[Dict[str, Any]] = []

    with torch.no_grad():
        for step in range(max_new_tokens):
            # ----- Step 1: forward pass -----
            outputs = model(input_ids, output_attentions=True)
            logits = outputs.logits[0, -1, :]  # logits for the last position

            # ----- Step 2: temperature -----
            scaled_logits = apply_temperature(logits, temperature)

            # ----- Step 3: softmax -> probabilities -----
            probs = F.softmax(scaled_logits, dim=-1)

            # ----- Step 4: top candidates (for visualization) -----
            top5_probs, top5_idx = torch.topk(probs, 5)
            top_candidates = [
                {"token": tokenizer.decode([idx.item()]), "prob": float(p.item())}
                for p, idx in zip(top5_probs, top5_idx)
            ]

            # ----- Step 5: sample -----
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

            # ----- Step 6: attention extraction (last layer, averaged over heads) -----
            # outputs.attentions is a tuple of tensors, one per layer.
            # Each is [batch, num_heads, seq_len, seq_len]. We take the last layer,
            # average over heads, and the row corresponding to the last token.
            last_layer_attn = outputs.attentions[-1][0]      # [heads, seq, seq]
            avg_attn = last_layer_attn.mean(dim=0)            # [seq, seq]
            last_row = avg_attn[-1].tolist()                  # what the last token attended to
            # Keep matrix small: just one row per step
            attention_matrix = [last_row]

            steps.append({
                "step": step,
                "chosen_token": chosen_token,
                "top_candidates": top_candidates,
                "attention": attention_matrix,
            })

            # ----- Step 7: append and continue -----
            input_ids = torch.cat(
                [input_ids, torch.tensor([[next_id]])], dim=1
            )

            # Optional early stop: model emits EOS
            if next_id == tokenizer.eos_token_id:
                break

    # ---------- Build the MIDI output ----------
    full_text = tokenizer.decode(input_ids[0].tolist())
    abc_output = tokens_to_abc(full_text)  # cleanup / format for music21
    midi_bytes = abc_to_midi_bytes(abc_output)
    midi_base64 = base64.b64encode(midi_bytes).decode("utf-8")

    return {
        "midi_base64": midi_base64,
        "seed_tokens": seed_token_strings,
        "generated_tokens": generated_token_strings,
        "steps": steps,
    }


# ---------- BPE patterns (week-1 work, used for analysis) ----------

def get_bpe_patterns() -> List[Dict[str, Any]]:
    """
    Returns the top learned BPE merges from our music BPE, with descriptions.

    These come from our week-1 BPE trained on a music corpus. They are NOT
    the model's tokenizer — they're a parallel analysis layer that surfaces
    musical motifs the BPE discovered as recurring patterns.
    """
    _, _, music_bpe = _load_model()
    return music_bpe.top_patterns()
