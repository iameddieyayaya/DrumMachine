import {
  DEFAULT_BPM,
  DEFAULT_STEP_VELOCITY,
  DRUM_ORDER,
  clampLoopBars,
  clampUnit,
  clampVelocity,
  createEmptyPatterns,
  createInitialPatterns,
  createInitialSettings,
  createRandomPatterns,
  resizePatterns,
  totalSteps,
} from "../data/drums";
import type {
  DrumId,
  DrumSettings,
  LoopBars,
  Patterns,
  SelectedStep,
} from "../types";

export const SEQUENCER_STORAGE_KEY = "seq-drum-machine-state-v2";

export type PatternPresetId = "house" | "broken" | "halfTime";
export type TrackOperationId =
  | "fill2"
  | "fill4"
  | "fill8"
  | "nudgeLeft"
  | "nudgeRight"
  | "humanize"
  | "clearTrack";

export interface PatternPreset {
  id: PatternPresetId;
  label: string;
}

export interface SequencerState {
  bpm: number;
  loopBars: LoopBars;
  swing: number;
  patterns: Patterns;
  settings: DrumSettings;
  selectedStep: SelectedStep | null;
  selectedTrack: DrumId;
  clipboardTrack: number[] | null;
}

interface PersistedSequencerState {
  bpm: number;
  loopBars: number;
  swing: number;
  patterns: Patterns;
  settings: DrumSettings;
  selectedTrack: DrumId;
}

export type SequencerAction =
  | { type: "setBpm"; bpm: number }
  | { type: "setLoopBars"; loopBars: LoopBars }
  | { type: "setSwing"; swing: number }
  | { type: "setStepVelocity"; drumId: DrumId; step: number; velocity: number }
  | { type: "toggleStep"; drumId: DrumId; step: number }
  | { type: "setParam"; drumId: DrumId; key: string; value: number }
  | { type: "clearPatterns" }
  | { type: "randomizePatterns" }
  | { type: "selectStep"; selectedStep: SelectedStep | null }
  | { type: "selectTrack"; drumId: DrumId }
  | { type: "copyTrack" }
  | { type: "pasteTrack" }
  | { type: "applyTrackOperation"; operation: TrackOperationId }
  | { type: "applyPreset"; presetId: PatternPresetId };

export const PATTERN_PRESETS: PatternPreset[] = [
  { id: "house", label: "House" },
  { id: "broken", label: "Broken" },
  { id: "halfTime", label: "Half-Time" },
];

export function createInitialSequencerState(): SequencerState {
  return {
    bpm: DEFAULT_BPM,
    loopBars: 8,
    swing: 0,
    patterns: createInitialPatterns(8),
    settings: createInitialSettings(),
    selectedStep: null,
    selectedTrack: DRUM_ORDER[0],
    clipboardTrack: null,
  };
}

export function loadSequencerState(): SequencerState {
  const initialState = createInitialSequencerState();

  if (typeof window === "undefined") {
    return initialState;
  }

  const raw = window.localStorage.getItem(SEQUENCER_STORAGE_KEY);
  if (!raw) {
    return initialState;
  }

  try {
    const persisted = JSON.parse(raw) as PersistedSequencerState;
    const loopBars = clampLoopBars(persisted.loopBars);

    return {
      ...initialState,
      bpm: persisted.bpm,
      loopBars,
      swing: clampSwing(persisted.swing),
      patterns: resizePatterns(persisted.patterns, loopBars),
      settings: persisted.settings,
      selectedTrack: DRUM_ORDER.includes(persisted.selectedTrack)
        ? persisted.selectedTrack
        : initialState.selectedTrack,
    };
  } catch {
    return initialState;
  }
}

export function saveSequencerState(state: SequencerState) {
  if (typeof window === "undefined") {
    return;
  }

  const persisted: PersistedSequencerState = {
    bpm: state.bpm,
    loopBars: state.loopBars,
    swing: state.swing,
    patterns: state.patterns,
    settings: state.settings,
    selectedTrack: state.selectedTrack,
  };

  window.localStorage.setItem(SEQUENCER_STORAGE_KEY, JSON.stringify(persisted));
}

export function sequencerReducer(
  state: SequencerState,
  action: SequencerAction,
): SequencerState {
  switch (action.type) {
    case "setBpm":
      return {
        ...state,
        bpm: action.bpm,
      };
    case "setLoopBars": {
      const loopBars = clampLoopBars(action.loopBars);

      return {
        ...state,
        loopBars,
        patterns: resizePatterns(state.patterns, loopBars),
        selectedStep: sanitizeSelectedStep(state.selectedStep, loopBars),
      };
    }
    case "setSwing":
      return {
        ...state,
        swing: clampSwing(action.swing),
      };
    case "setStepVelocity":
      return {
        ...state,
        patterns: {
          ...state.patterns,
          [action.drumId]: updateTrackStep(
            state.patterns[action.drumId],
            action.step,
            clampVelocity(action.velocity),
          ),
        },
        selectedStep: { drumId: action.drumId, step: action.step },
        selectedTrack: action.drumId,
      };
    case "toggleStep":
      return {
        ...state,
        patterns: {
          ...state.patterns,
          [action.drumId]: updateTrackStep(
            state.patterns[action.drumId],
            action.step,
            state.patterns[action.drumId][action.step] > 0
              ? 0
              : DEFAULT_STEP_VELOCITY,
          ),
        },
        selectedStep: { drumId: action.drumId, step: action.step },
        selectedTrack: action.drumId,
      };
    case "setParam":
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.drumId]: {
            ...state.settings[action.drumId],
            [action.key]: clampUnit(action.value),
          },
        },
      };
    case "clearPatterns":
      return {
        ...state,
        patterns: createEmptyPatterns(state.loopBars),
      };
    case "randomizePatterns":
      return {
        ...state,
        patterns: createRandomPatterns(state.loopBars),
      };
    case "selectStep":
      return {
        ...state,
        selectedStep: action.selectedStep,
        selectedTrack: action.selectedStep?.drumId ?? state.selectedTrack,
      };
    case "selectTrack":
      return {
        ...state,
        selectedTrack: action.drumId,
      };
    case "copyTrack":
      return {
        ...state,
        clipboardTrack: [...state.patterns[state.selectedTrack]],
      };
    case "pasteTrack":
      if (!state.clipboardTrack) {
        return state;
      }

      return {
        ...state,
        patterns: {
          ...state.patterns,
          [state.selectedTrack]: fitTrackLength(
            state.clipboardTrack,
            totalSteps(state.loopBars),
          ),
        },
      };
    case "applyTrackOperation":
      return {
        ...state,
        patterns: {
          ...state.patterns,
          [state.selectedTrack]: applyTrackOperation(
            state.patterns[state.selectedTrack],
            action.operation,
          ),
        },
      };
    case "applyPreset":
      return {
        ...state,
        patterns: createPresetPatterns(action.presetId, state.loopBars),
      };
  }
}

function sanitizeSelectedStep(
  selectedStep: SelectedStep | null,
  loopBars: LoopBars,
) {
  if (!selectedStep) {
    return null;
  }

  return selectedStep.step < totalSteps(loopBars) ? selectedStep : null;
}

function updateTrackStep(track: number[], step: number, velocity: number) {
  return track.map((value, index) => (index === step ? velocity : value));
}

function applyTrackOperation(track: number[], operation: TrackOperationId) {
  switch (operation) {
    case "fill2":
      return fillEvery(track, 2);
    case "fill4":
      return fillEvery(track, 4);
    case "fill8":
      return fillEvery(track, 8);
    case "nudgeLeft":
      return rotateTrack(track, -1);
    case "nudgeRight":
      return rotateTrack(track, 1);
    case "humanize":
      return track.map((velocity) =>
        velocity > 0
          ? clampVelocity(velocity + (Math.random() * 0.24 - 0.12))
          : 0,
      );
    case "clearTrack":
      return track.map(() => 0);
  }
}

function fillEvery(track: number[], interval: number) {
  return track.map((velocity, index) =>
    index % interval === 0 ? Math.max(velocity, DEFAULT_STEP_VELOCITY) : velocity,
  );
}

function rotateTrack(track: number[], offset: number) {
  return track.map((_, index, source) => {
    const nextIndex = (index - offset + source.length) % source.length;
    return source[nextIndex];
  });
}

function fitTrackLength(track: number[], length: number) {
  return Array.from({ length }, (_, index) => track[index % track.length] ?? 0);
}

function clampSwing(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function createPresetPatterns(
  presetId: PatternPresetId,
  loopBars: LoopBars,
): Patterns {
  const patterns = createEmptyPatterns(loopBars);
  const steps = totalSteps(loopBars);

  switch (presetId) {
    case "house":
      for (let step = 0; step < steps; step += 1) {
        const pulse = step % 8;
        patterns.kick[step] = pulse === 0 || pulse === 4 ? 0.92 : 0;
        patterns.snare[step] = pulse === 2 || pulse === 6 ? 0.78 : 0;
        patterns.hihat[step] = pulse % 2 === 0 ? 0.58 : 0.32;
        patterns.tom[step] = pulse === 7 ? 0.42 : 0;
      }
      break;
    case "broken":
      for (let step = 0; step < steps; step += 1) {
        const pulse = step % 8;
        patterns.kick[step] = [0, 3, 5].includes(pulse) ? 0.82 : 0;
        patterns.snare[step] = pulse === 2 || pulse === 6 ? 0.86 : pulse === 7 ? 0.42 : 0;
        patterns.hihat[step] = pulse === 1 || pulse === 3 || pulse === 5 || pulse === 7 ? 0.52 : 0.28;
        patterns.tom[step] = pulse === 4 ? 0.58 : 0;
      }
      break;
    case "halfTime":
      for (let step = 0; step < steps; step += 1) {
        const pulse = step % 8;
        patterns.kick[step] = pulse === 0 || pulse === 5 ? 0.88 : pulse === 3 ? 0.56 : 0;
        patterns.snare[step] = pulse === 4 ? 0.94 : 0;
        patterns.hihat[step] = pulse % 2 === 0 ? 0.48 : pulse === 3 || pulse === 7 ? 0.3 : 0;
        patterns.tom[step] = pulse === 6 ? 0.5 : 0;
      }
      break;
  }

  return patterns;
}
