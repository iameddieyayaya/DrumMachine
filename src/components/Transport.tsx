import { MAX_LOOP_BARS, MIN_LOOP_BARS } from "../data/drums";
import type { LoopBars } from "../types";

interface TransportProps {
  bpm: number;
  currentBar: number | null;
  currentPulse: number | null;
  isPlaying: boolean;
  loopBars: LoopBars;
  onBpmChange: (value: number) => void;
  onLoopBarsChange: (value: LoopBars) => void;
  onSwingChange: (value: number) => void;
  onTogglePlayback: () => void;
  selectedTrackLabel: string;
  stepCount: number;
  swing: number;
}

export function Transport({
  bpm,
  currentBar,
  currentPulse,
  isPlaying,
  loopBars,
  onBpmChange,
  onLoopBarsChange,
  onSwingChange,
  onTogglePlayback,
  selectedTrackLabel,
  stepCount,
  swing,
}: TransportProps) {
  return (
    <section className="transport panel">
      <div className="transport__dock-label">
        <p className="eyebrow">Performance Dock</p>
        <strong className="transport__dock-title">
          {isPlaying
            ? `Running bar ${currentBar ?? 1}, pulse ${currentPulse ?? 1}`
            : "Ready to play"}
        </strong>
        <p className="transport__summary">
          {isPlaying
            ? `Looping ${loopBars} bars across ${stepCount} steps.`
            : "Press play or hit space to start the loop."}
        </p>
        <div className="transport__meta">
          <span>{selectedTrackLabel} selected</span>
          <span>{loopBars} bars</span>
          <span>{stepCount} steps</span>
        </div>
      </div>

      <div className="transport__controls">
        <button
          aria-label={isPlaying ? "Stop playback" : "Start playback"}
          className={`transport__play ${isPlaying ? "is-playing" : ""}`}
          onClick={onTogglePlayback}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`transport__play-icon ${
              isPlaying ? "is-stop" : "is-play"
            }`}
          />
          <span>{isPlaying ? "Stop" : "Play"}</span>
        </button>

        <label className="transport__field">
          <span>BPM</span>
          <strong>{bpm}</strong>
          <input
            aria-label="Tempo"
            max={168}
            min={72}
            onChange={(event) => onBpmChange(Number(event.target.value))}
            type="range"
            value={bpm}
          />
        </label>

        <label className="transport__field">
          <span>Loop Bars</span>
          <strong>{loopBars}</strong>
          <input
            aria-label="Loop bars"
            max={MAX_LOOP_BARS}
            min={MIN_LOOP_BARS}
            onChange={(event) => onLoopBarsChange(Number(event.target.value))}
            step={1}
            type="range"
            value={loopBars}
          />
          <small>1 to 16 bars</small>
        </label>

        <label className="transport__field">
          <span>Swing</span>
          <strong>{swing}%</strong>
          <input
            aria-label="Swing"
            max={100}
            min={0}
            onChange={(event) => onSwingChange(Number(event.target.value))}
            step={1}
            type="range"
            value={swing}
          />
          <small>Pushes the off-beat later</small>
        </label>
      </div>
    </section>
  );
}
