"""
Wrapper around our week-1 BPE tokenizer, applied to music data.

This is NOT the tokenizer the transformer model uses (that one comes with
the pretrained model). This is a PARALLEL analysis layer:
  - Trained on a music corpus (ABC notation or MIDI events)
  - Used to surface learned musical patterns
  - Annotates the model's output to show "this passage matches BPE pattern X"

TODO (Person A):
  - Import the actual BPE class from week 1
  - Train it on a music corpus (Nottingham, The Session, etc.) OR load saved merges
  - Replace the placeholder patterns below with real learned ones

For Day 1, the placeholder lets the frontend render something while you
wire up the real BPE.
"""

from typing import List, Dict, Any


class MusicBPE:
    def __init__(self):
        # TODO: load your week-1 BPE here, e.g.:
        #   from your_bpe_module import BPE
        #   self.bpe = BPE.load("trained_on_music.json")
        self.bpe = None
        self._patterns_cache = None

    def encode(self, text: str) -> List[str]:
        """Tokenize a music string with our BPE. Returns token strings."""
        if self.bpe is None:
            # Fallback: just split by whitespace until the real BPE is wired in
            return text.split()
        return self.bpe.encode(text)

    def decode(self, tokens: List[str]) -> str:
        """Convert tokens back to a music string."""
        if self.bpe is None:
            return " ".join(tokens)
        return self.bpe.decode(tokens)

    def top_patterns(self) -> List[Dict[str, Any]]:
        """
        Return the most frequent / interesting BPE merges with human descriptions.
        Shown in the BpeMergesPanel on the frontend.

        TODO: replace with real merges from the trained BPE. The descriptions
        can be hand-annotated for the top ~10 patterns.
        """
        if self._patterns_cache is not None:
            return self._patterns_cache

        # Placeholder — swap with real merges once the BPE is trained on music data
        self._patterns_cache = [
            {"token": "C_E_G", "description": "C major arpeggio", "frequency": 1247},
            {"token": "A_C_E", "description": "A minor arpeggio", "frequency": 982},
            {"token": "D_F#_A", "description": "D major chord", "frequency": 743},
            {"token": "G_B_D", "description": "G major arpeggio", "frequency": 689},
            {"token": "E_G_B", "description": "E minor arpeggio", "frequency": 612},
            {"token": "F_A_C", "description": "F major chord", "frequency": 587},
            {"token": "C_D_E_F", "description": "Ascending scale fragment", "frequency": 503},
            {"token": "G_F_E_D", "description": "Descending scale fragment", "frequency": 478},
            {"token": "C_G_C", "description": "Octave leap and return", "frequency": 421},
            {"token": "A_G_F_E", "description": "Minor descent", "frequency": 389},
        ]
        return self._patterns_cache
