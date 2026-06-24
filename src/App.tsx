import { startTransition, useState } from "react";
import { InstrumentControls } from "./components/InstrumentControls";
import { StepGrid } from "./components/StepGrid";
import { Transport } from "./components/Transport";
import {
  DEFAULT_BPM,
  DRUMS,
  clampUnit,
  clampLoopBars,
  createEmptyPatterns,
  createInitialPatterns,
  createRandomPatterns,
  createInitialSettings,
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

  function handleSetStep(drumId: DrumId, step: number, nextValue: boolean) {
    setPatterns((previous) => ({
      ...previous,
      [drumId]: previous[drumId].map((value, index) =>
        index === step ? nextValue : value,
      ),
    }));
  }

  function handleToggleStep(drumId: DrumId, step: number) {
    setPatterns((previous) => ({
      ...previous,
      [drumId]: previous[drumId].map((value, index) =>
        index === step ? !value : value,
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
        onSetStep={handleSetStep}
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
