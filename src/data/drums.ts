import type {
  DrumDefinition,
  DrumId,
  DrumSettings,
  LoopBars,
  Patterns,
} from "../types";

export const STEPS_PER_BAR = 8;
export const DEFAULT_BPM = 116;
export const MIN_LOOP_BARS = 1;
export const MAX_LOOP_BARS = 16;

export const DRUMS: DrumDefinition[] = [
  {
    id: "kick",
    label: "Kick",
    shortLabel: "K",
    color: "#ff8a3d",
    description: "Rounded low-end pulse with a short punch envelope.",
    defaults: {
      tone: 0.56,
      decay: 0.5,
      drive: 0.32,
    },
    params: [
      { key: "tone", label: "Tone", hint: "deep to tight" },
      { key: "decay", label: "Decay", hint: "short to long" },
      { key: "drive", label: "Drive", hint: "clean to pushed" },
    ],
    barPattern: [1, 0, 0, 1, 1, 0, 0, 1],
  },
  {
    id: "snare",
    label: "Snare",
    shortLabel: "S",
    color: "#8bd450",
    description: "Filtered noise with a tonal snap sitting in the mids.",
    defaults: {
      noise: 0.62,
      snap: 0.48,
      decay: 0.34,
    },
    params: [
      { key: "noise", label: "Noise", hint: "dry to wide" },
      { key: "snap", label: "Snap", hint: "soft to crisp" },
      { key: "decay", label: "Decay", hint: "tight to open" },
    ],
    barPattern: [0, 0, 1, 0, 0, 0, 1, 0],
  },
  {
    id: "hihat",
    label: "Hi-Hat",
    shortLabel: "H",
    color: "#57c7ff",
    description: "Metallic click stack with adjustable bite and tail.",
    defaults: {
      tone: 0.72,
      decay: 0.22,
      grit: 0.3,
    },
    params: [
      { key: "tone", label: "Tone", hint: "dark to bright" },
      { key: "decay", label: "Decay", hint: "choke to ring" },
      { key: "grit", label: "Grit", hint: "smooth to sharp" },
    ],
    barPattern: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: "tom",
    label: "Tom",
    shortLabel: "T",
    color: "#cf7dff",
    description: "Pitch-bent body with a restrained resonant tail.",
    defaults: {
      pitch: 0.46,
      decay: 0.4,
      bend: 0.36,
    },
    params: [
      { key: "pitch", label: "Pitch", hint: "low to high" },
      { key: "decay", label: "Decay", hint: "tight to roomy" },
      { key: "bend", label: "Bend", hint: "flat to sweep" },
    ],
    barPattern: [0, 0, 0, 1, 0, 0, 1, 0],
  },
];

export const DRUM_ORDER = DRUMS.map((drum) => drum.id);

export function createInitialPatterns(loopBars: LoopBars): Patterns {
  return DRUMS.reduce<Patterns>((patterns, drum) => {
    patterns[drum.id] = repeatBarPattern(drum.barPattern, loopBars);
    return patterns;
  }, {} as Patterns);
}

export function createInitialSettings(): DrumSettings {
  return DRUMS.reduce<DrumSettings>((settings, drum) => {
    settings[drum.id] = { ...drum.defaults };
    return settings;
  }, {} as DrumSettings);
}

export function resizePatterns(
  previous: Patterns,
  loopBars: LoopBars,
): Patterns {
  const nextLength = loopBars * STEPS_PER_BAR;

  return DRUMS.reduce<Patterns>((patterns, drum) => {
    const current = previous[drum.id] ?? [];
    const fallback = repeatBarPattern(drum.barPattern, loopBars);
    const resized = Array.from({ length: nextLength }, (_, index) => {
      if (index < current.length) {
        return current[index];
      }

      return fallback[index];
    });

    patterns[drum.id] = resized;
    return patterns;
  }, {} as Patterns);
}

export function totalSteps(loopBars: LoopBars) {
  return clampLoopBars(loopBars) * STEPS_PER_BAR;
}

export function createEmptyPatterns(loopBars: LoopBars): Patterns {
  return DRUMS.reduce<Patterns>((patterns, drum) => {
    patterns[drum.id] = Array.from(
      { length: totalSteps(loopBars) },
      () => false,
    );
    return patterns;
  }, {} as Patterns);
}

export function createRandomPatterns(loopBars: LoopBars): Patterns {
  return DRUMS.reduce<Patterns>((patterns, drum) => {
    patterns[drum.id] = Array.from(
      { length: totalSteps(loopBars) },
      (_, index) => shouldEnableRandomStep(drum.id, index),
    );
    return patterns;
  }, {} as Patterns);
}

export function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function drumById(id: DrumId) {
  return DRUMS.find((drum) => drum.id === id);
}

function repeatBarPattern(barPattern: number[], loopBars: LoopBars) {
  const safeLoopBars = clampLoopBars(loopBars);

  return Array.from(
    { length: safeLoopBars * STEPS_PER_BAR },
    (_, index) => Boolean(barPattern[index % barPattern.length]),
  );
}

export function clampLoopBars(value: number): LoopBars {
  return Math.min(MAX_LOOP_BARS, Math.max(MIN_LOOP_BARS, Math.round(value)));
}

function shouldEnableRandomStep(drumId: DrumId, step: number) {
  const pulse = step % STEPS_PER_BAR;
  const evenPulse = pulse % 2 === 0;

  switch (drumId) {
    case "kick":
      return roll(
        pulse === 0 ? 0.96 : pulse === 4 ? 0.74 : evenPulse ? 0.24 : 0.08,
      );
    case "snare":
      return roll(
        pulse === 2 || pulse === 6
          ? 0.82
          : pulse === 7
            ? 0.18
            : evenPulse
              ? 0.08
              : 0.03,
      );
    case "hihat":
      return roll(pulse === 0 || pulse === 4 ? 0.92 : evenPulse ? 0.84 : 0.62);
    case "tom":
      return roll(
        pulse === 3 || pulse === 6
          ? 0.48
          : pulse === 7
            ? 0.24
            : evenPulse
              ? 0.14
              : 0.06,
      );
  }
}

function roll(probability: number) {
  return Math.random() < probability;
}
