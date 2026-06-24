import { startTransition, useState } from "react";
import { InstrumentControls } from "./components/InstrumentControls";
import { StepGrid } from "./components/StepGrid";
import { Transport } from "./components/Transport";
import {
  DEFAULT_BPM,
  DRUMS,
  clampUnit,
  clampLoopBars,
  clampVelocity,
  createEmptyPatterns,
  createInitialPatterns,
  createRandomPatterns,
  createInitialSettings,
  DEFAULT_STEP_VELOCITY,
  resizePatterns,
} from "./data/drums";
import { useDrumMachine } from "./hooks/useDrumMachine";
import type { DrumId, DrumSettings, LoopBars, Patterns } from "./types";

export default function App() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [loopBars, setLoopBars] = useState<LoopBars>(8);
  const [swing, setSwing] = useState(0);
  const [patterns, setPatterns] = useState<Patterns>(() => createInitialPatterns(8));
  const [settings, setSettings] = useState<DrumSettings>(createInitialSettings);
  const activeSteps = Object.values(patterns).reduce(
    (count, track) => count + track.filter((velocity) => velocity > 0).length,
    0,
  );

  const { currentStep, isPlaying, togglePlayback } = useDrumMachine({
    bpm,
    loopBars,
    patterns,
    settings,
    swing,
  });

  function handleLoopBarsChange(nextLoopBars: LoopBars) {
    const safeLoopBars = clampLoopBars(nextLoopBars);
    setLoopBars(safeLoopBars);
    setPatterns((previous) => resizePatterns(previous, safeLoopBars));
  }

  function handleSetStepVelocity(
    drumId: DrumId,
    step: number,
    nextVelocity: number,
  ) {
    setPatterns((previous) => ({
      ...previous,
      [drumId]: previous[drumId].map((value, index) =>
        index === step ? clampVelocity(nextVelocity) : value,
      ),
    }));
  }

  function handleToggleStep(drumId: DrumId, step: number) {
    setPatterns((previous) => ({
      ...previous,
      [drumId]: previous[drumId].map((value, index) =>
        index === step ? (value > 0 ? 0 : DEFAULT_STEP_VELOCITY) : value,
      ),
    }));
  }

  function handleClearPatterns() {
    startTransition(() => {
      setPatterns(createEmptyPatterns(loopBars));
    });
  }

  function handleRandomizePatterns() {
    startTransition(() => {
      setPatterns(createRandomPatterns(loopBars));
    });
  }

  function handleParamChange(drumId: DrumId, key: string, value: number) {
    setSettings((previous) => ({
      ...previous,
      [drumId]: {
        ...previous[drumId],
        [key]: clampUnit(value),
      },
    }));
  }

  return (
    <main className="app-shell">
      <div className="background-glow background-glow--left" />
      <div className="background-glow background-glow--right" />
      <div className="background-grid" />

      <section className="masthead panel">
        <div className="masthead__copy">
          <p className="eyebrow">Seq Drum Machine</p>
          <h1>Pick your rhythm!</h1>
          <p className="masthead__summary">
            A fast browser sequencer with synthesized drums, velocity shading,
            drag editing, swing, and a bottom transport that feels closer to a
            modern piece of hardware than a default web app.
          </p>
        </div>

        <div className="masthead__stats">
          <div className="masthead__stat">
            <span>Loop</span>
            <strong>{loopBars} Bars</strong>
          </div>
          <div className="masthead__stat">
            <span>Active Hits</span>
            <strong>{activeSteps}</strong>
          </div>
          <div className="masthead__stat">
            <span>Swing</span>
            <strong>{swing}%</strong>
          </div>
          <div className="masthead__stat">
            <span>BPM</span>
            <strong>{bpm}</strong>
          </div>
        </div>
      </section>

      <InstrumentControls
        drums={DRUMS}
        onParamChange={handleParamChange}
        settings={settings}
      />

      <StepGrid
        currentStep={currentStep}
        drums={DRUMS}
        loopBars={loopBars}
        onClearPatterns={handleClearPatterns}
        onRandomizePatterns={handleRandomizePatterns}
        onSetStepVelocity={handleSetStepVelocity}
        onToggleStep={handleToggleStep}
        patterns={patterns}
      />

      <Transport
        bpm={bpm}
        isPlaying={isPlaying}
        loopBars={loopBars}
        onBpmChange={setBpm}
        onLoopBarsChange={handleLoopBarsChange}
        onSwingChange={setSwing}
        onTogglePlayback={() => {
          void togglePlayback();
        }}
        swing={swing}
      />
    </main>
  );
}
