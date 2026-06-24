# Seq Drum Machine

`Seq Drum Machine` is a React + TypeScript drum sequencer built with Vite and the Web Audio API.

It includes four synthesized drum voices:

- `Kick`
- `Snare`
- `Hi-Hat`
- `Tom`

## Features

- Step sequencer with `1` to `16` loop bars
- Sticky bottom transport with `play/stop`, `tempo`, `loop bars`, and `swing`
- Per-instrument synthesis controls
- Random pattern generation
- Clear grid action
- Horizontal drag to paint steps
- Vertical drag to change step velocity
- Velocity-driven color brightness
- Velocity-driven playback volume

## Controls

### Transport

- `Play / Stop`: starts or stops the loop
- `BPM`: adjusts tempo
- `Loop Bars`: changes loop length from `1` to `16`
- `Swing`: offsets step timing for groove

### Grid

- `Click`: toggle a step on or off
- `Drag left/right`: paint the same velocity across steps
- `Drag up/down on a step`: increase or decrease that step's velocity
- `Brighter step`: louder hit
- `Dimmer step`: softer hit

### Sound Design

Each drum has a small set of synth parameters for quick shaping:

- `Kick`: tone, decay, drive
- `Snare`: noise, snap, decay
- `Hi-Hat`: tone, decay, grit
- `Tom`: pitch, decay, bend

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Type-check the project:

```bash
./node_modules/.bin/tsc -b
```

Build for production:

```bash
npm run build
```

## Project Structure

```text
src/
  App.tsx                  App state and composition
  components/
    InstrumentControls.tsx Drum parameter controls
    StepGrid.tsx           Sequencer grid and drag editing
    Transport.tsx          Sticky transport dock
  data/
    drums.ts               Drum definitions, defaults, loop helpers
  hooks/
    useDrumMachine.ts      Playback scheduler and transport state
  lib/
    audio.ts               Web Audio drum synthesis
  styles.css               App styling
  types.ts                 Shared TypeScript types
```

## Notes

- Audio playback depends on browser Web Audio support.
- The sequencer uses synthesized drum voices, not audio samples.
- On this machine, `tsc -b` passes, but `npm run build` may fail if `esbuild` was installed for a different CPU architecture than the active Node runtime.
