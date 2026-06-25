import { useEffect, useReducer } from "react";
import { InstrumentControls } from "./components/InstrumentControls";
import { StepGrid } from "./components/StepGrid";
import { Transport } from "./components/Transport";
import { DRUMS, STEPS_PER_BAR, totalSteps } from "./data/drums";
import { useDrumMachine } from "./hooks/useDrumMachine";
import {
  PATTERN_PRESETS,
  loadSequencerState,
  saveSequencerState,
  sequencerReducer,
} from "./lib/sequencerState";

export default function App() {
  const [state, dispatch] = useReducer(sequencerReducer, undefined, loadSequencerState);
  const {
    bpm,
    clipboardTrack,
    loopBars,
    patterns,
    selectedStep,
    selectedTrack,
    settings,
    swing,
  } = state;
  const activeSteps = Object.values(patterns).reduce(
    (count, track) => count + track.filter((velocity) => velocity > 0).length,
    0,
  );
  const stepCount = totalSteps(loopBars);
  const selectedTrackDefinition =
    DRUMS.find((drum) => drum.id === selectedTrack) ?? DRUMS[0];
  const selectedTrackPattern = patterns[selectedTrack];
  const selectedTrackHits = selectedTrackPattern.filter(
    (velocity) => velocity > 0,
  ).length;
  const selectedTrackAverageVelocity =
    selectedTrackHits > 0
      ? Math.round(
          (selectedTrackPattern.reduce(
            (sum, velocity) => sum + (velocity > 0 ? velocity : 0),
            0,
          ) /
            selectedTrackHits) *
            100,
        )
      : 0;

  const { currentStep, isPlaying, togglePlayback } = useDrumMachine({
    bpm,
    loopBars,
    patterns,
    settings,
    swing,
  });
  const currentBar =
    currentStep === null ? null : Math.floor(currentStep / STEPS_PER_BAR) + 1;
  const currentPulse =
    currentStep === null ? null : (currentStep % STEPS_PER_BAR) + 1;

  useEffect(() => {
    saveSequencerState(state);
  }, [state]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        void togglePlayback();
        return;
      }

      if (event.key >= "1" && event.key <= "4") {
        const index = Number(event.key) - 1;
        const drum = DRUMS[index];
        if (drum) {
          dispatch({ type: "selectTrack", drumId: drum.id });
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        dispatch({ type: "copyTrack" });
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        dispatch({ type: "pasteTrack" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlayback]);

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
        onParamChange={(drumId, key, value) => {
          dispatch({ type: "setParam", drumId, key, value });
        }}
        settings={settings}
      />

      <StepGrid
        activeHits={activeSteps}
        clipboardTrackAvailable={Boolean(clipboardTrack)}
        currentStep={currentStep}
        drums={DRUMS}
        loopBars={loopBars}
        onApplyPreset={(presetId) => {
          dispatch({ type: "applyPreset", presetId });
        }}
        onApplyTrackOperation={(operation) => {
          dispatch({ type: "applyTrackOperation", operation });
        }}
        onClearPatterns={() => {
          dispatch({ type: "clearPatterns" });
        }}
        onCopyTrack={() => {
          dispatch({ type: "copyTrack" });
        }}
        onPasteTrack={() => {
          dispatch({ type: "pasteTrack" });
        }}
        onRandomizePatterns={() => {
          dispatch({ type: "randomizePatterns" });
        }}
        onSelectStep={(nextSelectedStep) => {
          dispatch({ type: "selectStep", selectedStep: nextSelectedStep });
        }}
        onSelectTrack={(drumId) => {
          dispatch({ type: "selectTrack", drumId });
        }}
        onSetStepVelocity={(drumId, step, velocity) => {
          dispatch({ type: "setStepVelocity", drumId, step, velocity });
        }}
        onToggleStep={(drumId, step) => {
          dispatch({ type: "toggleStep", drumId, step });
        }}
        patternPresets={PATTERN_PRESETS}
        patterns={patterns}
        selectedStep={selectedStep}
        selectedTrack={selectedTrack}
        selectedTrackLabel={selectedTrackDefinition.label}
        selectedTrackAverageVelocity={selectedTrackAverageVelocity}
        selectedTrackHits={selectedTrackHits}
      />

      <Transport
        bpm={bpm}
        currentBar={currentBar}
        currentPulse={currentPulse}
        isPlaying={isPlaying}
        loopBars={loopBars}
        onBpmChange={(nextBpm) => {
          dispatch({ type: "setBpm", bpm: nextBpm });
        }}
        onLoopBarsChange={(nextLoopBars) => {
          dispatch({ type: "setLoopBars", loopBars: nextLoopBars });
        }}
        onSwingChange={(nextSwing) => {
          dispatch({ type: "setSwing", swing: nextSwing });
        }}
        onTogglePlayback={() => {
          void togglePlayback();
        }}
        selectedTrackLabel={selectedTrackDefinition.label}
        stepCount={stepCount}
        swing={swing}
      />

      <footer className="app-footer">
        <a
          className="app-footer__link"
          href="https://github.com/iameddieyayaya/DrumMachine"
          rel="noreferrer"
          target="_blank"
        >
          iameddieyayaya/DrumMachine
        </a>
      </footer>
    </main>
  );
}
