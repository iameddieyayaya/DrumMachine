import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { STEPS_PER_BAR } from "../data/drums";
import type { DrumDefinition, LoopBars, Patterns } from "../types";

interface StepGridProps {
  currentStep: number | null;
  drums: DrumDefinition[];
  loopBars: LoopBars;
  onClearPatterns: () => void;
  onRandomizePatterns: () => void;
  onSetStep: (
    drumId: DrumDefinition["id"],
    step: number,
    nextValue: boolean,
  ) => void;
  patterns: Patterns;
  onToggleStep: (drumId: DrumDefinition["id"], step: number) => void;
}

interface DragState {
  paintValue: boolean;
  pointerId: number;
  touchedSteps: Set<string>;
}

export function StepGrid({
  currentStep,
  drums,
  loopBars,
  onClearPatterns,
  onRandomizePatterns,
  onSetStep,
  patterns,
  onToggleStep,
}: StepGridProps) {
  const stepCount = loopBars * STEPS_PER_BAR;
  const steps = Array.from({ length: stepCount }, (_, index) => index);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    function clearDragState() {
      dragStateRef.current = null;
    }

    window.addEventListener("pointerup", clearDragState);
    window.addEventListener("pointercancel", clearDragState);

    return () => {
      window.removeEventListener("pointerup", clearDragState);
      window.removeEventListener("pointercancel", clearDragState);
    };
  }, []);

  function handleStepPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    drumId: DrumDefinition["id"],
    step: number,
    isActive: boolean,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const nextValue = !isActive;
    dragStateRef.current = {
      paintValue: nextValue,
      pointerId: event.pointerId,
      touchedSteps: new Set([createStepKey(drumId, step)]),
    };

    onSetStep(drumId, step, nextValue);
  }

  function handleStepPointerEnter(
    event: PointerEvent<HTMLButtonElement>,
    drumId: DrumDefinition["id"],
    step: number,
  ) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const stepKey = createStepKey(drumId, step);
    if (dragState.touchedSteps.has(stepKey)) {
      return;
    }

    dragState.touchedSteps.add(stepKey);
    onSetStep(drumId, step, dragState.paintValue);
  }

  function handleStepKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    drumId: DrumDefinition["id"],
    step: number,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onToggleStep(drumId, step);
  }

  return (
    <section className="sequencer panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pattern Grid</p>
          <h2>Program the loop</h2>
        </div>

        <div className="sequencer__actions">
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
        <p>Each bar holds 8 pulses. Hold and drag to paint or erase steps.</p>
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
              <div className="sequencer__track-label">
                <strong>{drum.label}</strong>
                <span>{drum.description}</span>
              </div>

              {steps.map((step) => {
                const isActive = patterns[drum.id][step];
                const isCurrent = currentStep === step;
                const isBarStart = step % STEPS_PER_BAR === 0;

                return (
                  <button
                    aria-label={`${drum.label} step ${step + 1}`}
                    aria-pressed={isActive}
                    className={[
                      "step-button",
                      isActive ? "is-active" : "",
                      isCurrent ? "is-current" : "",
                      isBarStart ? "is-bar-start" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={step}
                    onClick={(event) => {
                      event.preventDefault();
                    }}
                    onKeyDown={(event) =>
                      handleStepKeyDown(event, drum.id, step)
                    }
                    onPointerDown={(event) =>
                      handleStepPointerDown(event, drum.id, step, isActive)
                    }
                    onPointerEnter={(event) =>
                      handleStepPointerEnter(event, drum.id, step)
                    }
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
