import { MAX_LOOP_BARS, MIN_LOOP_BARS } from "../data/drums";
import type { LoopBars } from "../types";

interface TransportProps {
  bpm: number;
  isPlaying: boolean;
  loopBars: LoopBars;
  onBpmChange: (value: number) => void;
  onLoopBarsChange: (value: LoopBars) => void;
  onSwingChange: (value: number) => void;
  onTogglePlayback: () => void;
  swing: number;
}

export function Transport({
  bpm,
  isPlaying,
  loopBars,
  onBpmChange,
  onLoopBarsChange,
  onSwingChange,
  onTogglePlayback,
  swing,
}: TransportProps) {
  return (
    <section className="transport panel">
      <div className="transport__dock-label">
        <p className="eyebrow">Transport</p>
        <p className="transport__summary">
          Sticky playback controls with adjustable loop length.
        </p>
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
        </label>
      </div>
    </section>
  );
}
