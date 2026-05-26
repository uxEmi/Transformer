"""
Preset seed melodies in ABC notation.
ABC is a text-based music format: letters = notes, numbers = duration, | = bar line.

These are intentionally short and chosen to produce varied outputs.
Add more by appending to SEEDS — each needs a unique id.
"""

SEEDS = [
    {
        "id": "twinkle",
        "name": "Twinkle Twinkle",
        "preview": "C C G G A A G",
        "abc": "X:1\nT:Twinkle\nM:4/4\nK:C\nCCGG AAG2|",
    },
    {
        "id": "sad_piano",
        "name": "Sad Piano Motif",
        "preview": "A C E A G F",
        "abc": "X:1\nT:Sad\nM:4/4\nK:Am\nA2 c2 e2 A2|G2 F2 E4|",
    },
    {
        "id": "jazz_lick",
        "name": "Jazz Lick",
        "preview": "D F A C E G",
        "abc": "X:1\nT:Jazz\nM:4/4\nK:D\nD F A c|e g f e|",
    },
    {
        "id": "folk_tune",
        "name": "Folk Tune",
        "preview": "G A B D G B",
        "abc": "X:1\nT:Folk\nM:4/4\nK:G\nG2 A2 B2 d2|G2 B2 d4|",
    },
    {
        "id": "minor_scale",
        "name": "Minor Scale Ascent",
        "preview": "A B C D E F G A",
        "abc": "X:1\nT:Minor\nM:4/4\nK:Am\nA B c d e f g a|",
    },
]


def get_seed_by_id(seed_id: str):
    """Return the seed dict for a given id, or None."""
    for s in SEEDS:
        if s["id"] == seed_id:
            return s
    return None
