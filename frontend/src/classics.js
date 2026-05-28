

const ev = (midi, durationQL) => ({ midi, durationQL, isRest: false });
const rest = (durationQL) => ({ midi: null, durationQL, isRest: true });

// --- Happy Birthday (G major, anacrusis on G) ---
// "Hap-py birth-day to you, hap-py birth-day to you"
const HAPPY_BIRTHDAY = [
  ev(67, 0.75), ev(67, 0.25),   // G G  (hap-py)
  ev(69, 1.0),                  // A    (birth-)
  ev(67, 1.0),                  // G    (day)
  ev(72, 1.0),                  // C    (to)
  ev(71, 2.0),                  // B    (you)
  ev(67, 0.75), ev(67, 0.25),   // G G  (hap-py)
  ev(69, 1.0),                  // A    (birth-)
  ev(67, 1.0),                  // G    (day)
  ev(74, 1.0),                  // D    (to)
  ev(72, 2.0),                  // C    (you)
];

// --- Twinkle Twinkle Little Star (C major) ---
// "Twin-kle twin-kle lit-tle star, how I won-der what you are"
const TWINKLE = [
  ev(60, 1.0), ev(60, 1.0),     // C C
  ev(67, 1.0), ev(67, 1.0),     // G G
  ev(69, 1.0), ev(69, 1.0),     // A A
  ev(67, 2.0),                  // G
  ev(65, 1.0), ev(65, 1.0),     // F F
  ev(64, 1.0), ev(64, 1.0),     // E E
  ev(62, 1.0), ev(62, 1.0),     // D D
  ev(60, 2.0),                  // C
];

// --- Ode to Joy (Beethoven, C major; original is D major, transposed here) ---
const ODE_TO_JOY = [
  ev(64, 1.0), ev(64, 1.0), ev(65, 1.0), ev(67, 1.0),  // E E F G
  ev(67, 1.0), ev(65, 1.0), ev(64, 1.0), ev(62, 1.0),  // G F E D
  ev(60, 1.0), ev(60, 1.0), ev(62, 1.0), ev(64, 1.0),  // C C D E
  ev(64, 1.5), ev(62, 0.5), ev(62, 2.0),               // E. D  D
];

// --- Greensleeves (A minor, in 6/8 feel approximated as quarters/eighths) ---
const GREENSLEEVES = [
  ev(69, 1.0),                                // A
  ev(72, 1.5), ev(74, 0.5),                   // C D
  ev(76, 1.0),                                // E
  ev(77, 1.0), ev(76, 0.5), ev(74, 0.5),      // F E D
  ev(72, 1.5), ev(69, 0.5),                   // C A
  ev(67, 1.0), ev(69, 0.5), ev(72, 0.5),      // G A C
  ev(71, 1.5), ev(67, 0.5),                   // B G
  ev(69, 2.0),                                // A
];

// --- Frère Jacques (C major) ---
const FRERE_JACQUES = [
  ev(60, 1.0), ev(62, 1.0), ev(64, 1.0), ev(60, 1.0),  // C D E C
  ev(60, 1.0), ev(62, 1.0), ev(64, 1.0), ev(60, 1.0),  // C D E C
  ev(64, 1.0), ev(65, 1.0), ev(67, 2.0),               // E F G
  ev(64, 1.0), ev(65, 1.0), ev(67, 2.0),               // E F G
];

// --- C major scale, ascending and descending (always useful as a clean seed) ---
const C_MAJOR_SCALE = [
  ev(60, 0.5), ev(62, 0.5), ev(64, 0.5), ev(65, 0.5),
  ev(67, 0.5), ev(69, 0.5), ev(71, 0.5), ev(72, 0.5),
  ev(72, 0.5), ev(71, 0.5), ev(69, 0.5), ev(67, 0.5),
  ev(65, 0.5), ev(64, 0.5), ev(62, 0.5), ev(60, 1.0),
];

// --- Amazing Grace (G major, opening phrase) ---
const AMAZING_GRACE = [
  ev(67, 1.5), ev(72, 0.5),                  // G C   (A-ma-)
  ev(76, 1.0), ev(72, 1.0),                  // E C   (zing grace)
  ev(76, 1.5), ev(74, 0.5),                  // E D   (how sweet)
  ev(72, 2.0),                               // C     (the sound)
  ev(67, 1.5), ev(72, 0.5),                  // G C
  ev(76, 1.0), ev(72, 1.0),                  // E C
  ev(76, 1.5), ev(78, 0.5),                  // E F#
  ev(79, 2.0),                               // G
];

export const CLASSICS = [
  {
    id: "happy_birthday",
    name: "Happy Birthday",
    note: "everyone knows it",
    bpm: 120,
    events: HAPPY_BIRTHDAY,
  },
  {
    id: "twinkle",
    name: "Twinkle Twinkle",
    note: "nursery rhyme, simple",
    bpm: 110,
    events: TWINKLE,
  },
  {
    id: "ode_to_joy",
    name: "Ode to Joy",
    note: "Beethoven, dignified",
    bpm: 100,
    events: ODE_TO_JOY,
  },
  {
    id: "greensleeves",
    name: "Greensleeves",
    note: "old English, plaintive",
    bpm: 90,
    events: GREENSLEEVES,
  },
  {
    id: "frere_jacques",
    name: "Frère Jacques",
    note: "round, repetitive",
    bpm: 120,
    events: FRERE_JACQUES,
  },
  {
    id: "amazing_grace",
    name: "Amazing Grace",
    note: "hymn, soaring",
    bpm: 80,
    events: AMAZING_GRACE,
  },
  {
    id: "c_scale",
    name: "C Major Scale",
    note: "up and down, neutral test seed",
    bpm: 140,
    events: C_MAJOR_SCALE,
  },
];
