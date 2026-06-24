import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  clampVelocity,
  DEFAULT_STEP_VELOCITY,
  isStepActive,
  STEPS_PER_BAR,
} from "../data/drums";
import {
  type PatternPreset,
  type PatternPresetId,
  type TrackOperationId,
} from "../lib/sequencerState";
import type {
  DrumDefinition,
  LoopBars,
  Patterns,
  SelectedStep,
} from "../types";

interface StepGridProps {
  clipboardTrackAvailable: boolean;
  currentStep: number | null;
  drums: DrumDefinition[];
  loopBars: LoopBars;
  onApplyPreset: (presetId: PatternPresetId) => void;
  onApplyTrackOperation: (operation: TrackOperationId) => void;
  onClearPatterns: () => void;
  onCopyTrack: () => void;
  onPasteTrack: () => void;
  onRandomizePatterns: () => void;
  onSelectStep: (selectedStep: SelectedStep | null) => void;
  onSelectTrack: (drumId: DrumDefinition["id"]) => void;
  onSetStepVelocity: (
    drumId: DrumDefinition["id"],
    step: number,
    nextValue: number,
  ) => void;
  patterns: Patterns;
  patternPresets: PatternPreset[];
  selectedStep: SelectedStep | null;
  selectedTrack: DrumDefinition["id"];
  onToggleStep: (drumId: DrumDefinition["id"], step: number) => void;
}

interface DragState {
  mode: "pending" | "paint" | "velocity";
  pointerId: number;
  paintVelocity: number;
  startDrumId: DrumDefinition["id"];
  startStep: number;
  startVelocity: number;
  startX: number;
  startY: number;
  startedActive: boolean;
  touchedSteps: Set<string>;
}

export function StepGrid({
  clipboardTrackAvailable,
  currentStep,
  drums,
  loopBars,
  onApplyPreset,
  onApplyTrackOperation,
  onClearPatterns,
  onCopyTrack,
  onPasteTrack,
  onRandomizePatterns,
  onSelectStep,
  onSelectTrack,
  onSetStepVelocity,
  patterns,
  patternPresets,
  selectedStep,
  selectedTrack,
  onToggleStep,
}: StepGridProps) {
  const stepCount = loopBars * STEPS_PER_BAR;
  const steps = Array.from({ length: stepCount }, (_, index) => index);
  const dragStateRef = useRef<DragState | null>(null);
  const selectedVelocity =
    selectedStep ? patterns[selectedStep.drumId][selectedStep.step] : null;

  useEffect(() => {
    function applyVelocityDrag(dragState: DragState, pointerY: number) {
      const deltaY = dragState.startY - pointerY;
      const nextVelocity = clampVelocity(
        dragState.startVelocity + deltaY * 0.0065,
      );

      onSetStepVelocity(
        dragState.startDrumId,
        dragState.startStep,
        nextVelocity,
      );
      onSelectStep({
        drumId: dragState.startDrumId,
        step: dragState.startStep,
      });
    }

    function applyPaintAtPoint(
      dragState: DragState,
      clientX: number,
      clientY: number,
    ) {
      const button = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLButtonElement>("[data-step]");

      if (!button) {
        return;
      }

      const drumId = button.dataset.drumId as DrumDefinition["id"] | undefined;
      const stepValue = button.dataset.step;
      if (!drumId || !stepValue) {
        return;
      }

      const step = Number(stepValue);
      if (Number.isNaN(step)) {
        return;
      }

      const stepKey = createStepKey(drumId, step);
      if (dragState.touchedSteps.has(stepKey)) {
        return;
      }

      dragState.touchedSteps.add(stepKey);
      onSetStepVelocity(drumId, step, dragState.paintVelocity);
      onSelectStep({ drumId, step });
    }

    function clearDragState(event?: globalThis.PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      if (event && dragState.pointerId !== event.pointerId) {
        return;
      }

      if (dragState.mode === "pending") {
        onSetStepVelocity(
          dragState.startDrumId,
          dragState.startStep,
          dragState.startedActive ? 0 : dragState.paintVelocity,
        );
      }

      dragStateRef.current = null;
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (dragState.mode === "pending") {
        if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
          dragState.mode = "velocity";
          applyVelocityDrag(dragState, event.clientY);
          return;
        }

        if (Math.abs(deltaX) > 10) {
          dragState.mode = "paint";
          dragState.touchedSteps.add(
            createStepKey(dragState.startDrumId, dragState.startStep),
          );
          onSetStepVelocity(
            dragState.startDrumId,
            dragState.startStep,
            dragState.paintVelocity,
          );
          applyPaintAtPoint(dragState, event.clientX, event.clientY);
        }

        return;
      }

      if (dragState.mode === "velocity") {
        applyVelocityDrag(dragState, event.clientY);
        return;
      }

      applyPaintAtPoint(dragState, event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", clearDragState);
    window.addEventListener("pointercancel", clearDragState);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", clearDragState);
      window.removeEventListener("pointercancel", clearDragState);
    };
  }, [onSelectStep, onSetStepVelocity]);

  function handleStepPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    drumId: DrumDefinition["id"],
    step: number,
    velocity: number,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const startedActive = isStepActive(velocity);
    const baseVelocity = startedActive ? velocity : DEFAULT_STEP_VELOCITY;
    onSelectStep({ drumId, step });
    onSelectTrack(drumId);
    dragStateRef.current = {
      mode: "pending",
      pointerId: event.pointerId,
      paintVelocity: startedActive ? 0 : baseVelocity,
      startDrumId: drumId,
      startStep: step,
      startVelocity: baseVelocity,
      startX: event.clientX,
      startY: event.clientY,
      startedActive,
      touchedSteps: new Set(),
    };
  }

  function handleStepKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    drumId: DrumDefinition["id"],
    step: number,
  ) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const adjacentStep = getAdjacentStep(drums, drumId, step, event.key, stepCount);
      if (!adjacentStep) {
        return;
      }

      onSelectStep(adjacentStep);
      onSelectTrack(adjacentStep.drumId);
      focusStepButton(adjacentStep);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onSetStepVelocity(drumId, step, 0);
        onSelectStep({ drumId, step });
        onSelectTrack(drumId);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        onSetStepVelocity(
          drumId,
          step,
          clampVelocity(patterns[drumId][step] + 0.08),
        );
        onSelectStep({ drumId, step });
        onSelectTrack(drumId);
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        onSetStepVelocity(
          drumId,
          step,
          clampVelocity(patterns[drumId][step] - 0.08),
        );
        onSelectStep({ drumId, step });
        onSelectTrack(drumId);
      }

      return;
    }

    event.preventDefault();
    onToggleStep(drumId, step);
    onSelectStep({ drumId, step });
    onSelectTrack(drumId);
  }

  return (
    <section className="sequencer panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pattern Grid</p>
          <h2>Program the loop</h2>
        </div>

        <div className="sequencer__actions">
          {patternPresets.map((preset) => (
            <button
              className="sequencer__action-button"
              key={preset.id}
              onClick={() => onApplyPreset(preset.id)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
          <button
            className="sequencer__action-button"
            onClick={onRandomizePatterns}
            type="button"
          >
            Random Pattern
          </button>
          <button
            className="sequencer__action-button sequencer__action-button--danger"
            onClick={onClearPatterns}
            type="button"
          >
            Clear Grid
          </button>
        </div>
      </div>

      <div className="sequencer__legend">
        <p>
          Click to toggle. Drag across to add or remove hits, or drag up and down
          on a step to shape its volume.
        </p>
      </div>

      <div className="sequencer__utility-row">
        <div className="track-selector" aria-label="Track selector" role="tablist">
          {drums.map((drum, index) => {
            const isSelected = selectedTrack === drum.id;

            return (
              <button
                aria-selected={isSelected}
                className={`track-selector__chip ${isSelected ? "is-selected" : ""}`}
                key={drum.id}
                onClick={() => onSelectTrack(drum.id)}
                role="tab"
                style={{ "--drum-color": drum.color } as CSSProperties}
                type="button"
              >
                <span>{index + 1}</span>
                <strong>{drum.label}</strong>
              </button>
            );
          })}
        </div>

        <div className="selected-step-card">
          <span>Selected</span>
          {selectedStep ? (
            <strong>
              {selectedStep.drumId} · step {selectedStep.step + 1} ·{" "}
              {Math.round((selectedVelocity ?? 0) * 100)}%
            </strong>
          ) : (
            <strong>No step selected</strong>
          )}
          <small>Arrow keys move. `+/-` changes velocity. `Delete` clears.</small>
        </div>
      </div>

      <div className="sequencer__tool-row">
        <button
          className="sequencer__tool-button"
          onClick={onCopyTrack}
          type="button"
        >
          Copy Track
        </button>
        <button
          className="sequencer__tool-button"
          disabled={!clipboardTrackAvailable}
          onClick={onPasteTrack}
          type="button"
        >
          Paste Track
        </button>
        <button
          className="sequencer__tool-button"
          onClick={() => onApplyTrackOperation("fill2")}
          type="button"
        >
          Fill 2
        </button>
        <button
          className="sequencer__tool-button"
          onClick={() => onApplyTrackOperation("fill4")}
          type="button"
        >
          Fill 4
        </button>
        <button
          className="sequencer__tool-button"
          onClick={() => onApplyTrackOperation("fill8")}
          type="button"
        >
          Fill 8
        </button>
        <button
          className="sequencer__tool-button"
          onClick={() => onApplyTrackOperation("humanize")}
          type="button"
        >
          Humanize
        </button>
        <button
          className="sequencer__tool-button"
          onClick={() => onApplyTrackOperation("nudgeLeft")}
          type="button"
        >
          Nudge Left
        </button>
        <button
          className="sequencer__tool-button"
          onClick={() => onApplyTrackOperation("nudgeRight")}
          type="button"
        >
          Nudge Right
        </button>
        <button
          className="sequencer__tool-button sequencer__tool-button--danger"
          onClick={() => onApplyTrackOperation("clearTrack")}
          type="button"
        >
          Clear Track
        </button>
      </div>

      <div className="sequencer__velocity-scale" aria-hidden="true">
        <span>Soft</span>
        <div />
        <span>Loud</span>
      </div>

      <div className="sequencer__scroll">
        <div
          className="sequencer__header"
          style={{ gridTemplateColumns: `11rem repeat(${stepCount}, minmax(2.65rem, 1fr))` }}
        >
          <div className="sequencer__track-label sequencer__track-label--top">
            Track
          </div>
          {steps.map((step) => {
            const bar = Math.floor(step / STEPS_PER_BAR) + 1;
            const pulse = (step % STEPS_PER_BAR) + 1;

            return (
              <div
                className={`sequencer__step-meta ${
                  pulse === 1 ? "is-bar-start" : ""
                }`}
                key={step}
              >
                <span>B{bar}</span>
                <strong>{pulse}</strong>
              </div>
            );
          })}
        </div>

        <div className="sequencer__rows">
          {drums.map((drum) => (
            <div
              className="sequencer__row"
              key={drum.id}
              style={
                {
                  "--drum-color": drum.color,
                  gridTemplateColumns: `11rem repeat(${stepCount}, minmax(2.65rem, 1fr))`,
                } as CSSProperties
              }
            >
              <div
                className={`sequencer__track-label ${
                  selectedTrack === drum.id ? "is-selected" : ""
                }`}
              >
                <strong>{drum.label}</strong>
                <span>{drum.description}</span>
              </div>

              {steps.map((step) => {
                const velocity = patterns[drum.id][step];
                const isActive = isStepActive(velocity);
                const isCurrent = currentStep === step;
                const isBarStart = step % STEPS_PER_BAR === 0;
                const isSelected =
                  selectedStep?.drumId === drum.id && selectedStep.step === step;

                return (
                  <button
                    aria-label={`${drum.label} step ${step + 1}`}
                    aria-pressed={isActive}
                    className={[
                      "step-button",
                      isActive ? "is-active" : "",
                      isCurrent ? "is-current" : "",
                      isSelected ? "is-selected" : "",
                      isBarStart ? "is-bar-start" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={step}
                    data-drum-id={drum.id}
                    data-step={step}
                    onClick={(event) => {
                      event.preventDefault();
                    }}
                    onFocus={() => {
                      onSelectStep({ drumId: drum.id, step });
                      onSelectTrack(drum.id);
                    }}
                    onKeyDown={(event) =>
                      handleStepKeyDown(event, drum.id, step)
                    }
                    onPointerDown={(event) =>
                      handleStepPointerDown(event, drum.id, step, velocity)
                    }
                    style={{ "--step-velocity": velocity } as CSSProperties}
                    type="button"
                  >
                    <span />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function createStepKey(drumId: DrumDefinition["id"], step: number) {
  return `${drumId}:${step}`;
}

function getAdjacentStep(
  drums: DrumDefinition[],
  drumId: DrumDefinition["id"],
  step: number,
  key: "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown",
  stepCount: number,
): SelectedStep | null {
  const rowIndex = drums.findIndex((drum) => drum.id === drumId);
  if (rowIndex < 0) {
    return null;
  }

  if (key === "ArrowRight") {
    return step < stepCount - 1 ? { drumId, step: step + 1 } : null;
  }

  if (key === "ArrowLeft") {
    return step > 0 ? { drumId, step: step - 1 } : null;
  }

  if (key === "ArrowUp") {
    return rowIndex > 0 ? { drumId: drums[rowIndex - 1].id, step } : null;
  }

  return rowIndex < drums.length - 1
    ? { drumId: drums[rowIndex + 1].id, step }
    : null;
}

function focusStepButton(selectedStep: SelectedStep) {
  const button = document.querySelector<HTMLButtonElement>(
    `[data-drum-id="${selectedStep.drumId}"][data-step="${selectedStep.step}"]`,
  );

  button?.focus();
}
