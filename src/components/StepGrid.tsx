import { useEffect, useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  clampVelocity,
  DEFAULT_STEP_VELOCITY,
  isStepActive,
  STEPS_PER_BAR,
} from "../data/drums";
import type { DrumDefinition, LoopBars, Patterns } from "../types";

interface StepGridProps {
  currentStep: number | null;
  drums: DrumDefinition[];
  loopBars: LoopBars;
  onClearPatterns: () => void;
  onRandomizePatterns: () => void;
  onSetStepVelocity: (
    drumId: DrumDefinition["id"],
    step: number,
    nextValue: number,
  ) => void;
  patterns: Patterns;
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
  currentStep,
  drums,
  loopBars,
  onClearPatterns,
  onRandomizePatterns,
  onSetStepVelocity,
  patterns,
  onToggleStep,
}: StepGridProps) {
  const stepCount = loopBars * STEPS_PER_BAR;
  const steps = Array.from({ length: stepCount }, (_, index) => index);
  const dragStateRef = useRef<DragState | null>(null);

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
    }

    function applyPaintAtPoint(
      dragState: DragState,
      clientX: number,
      clientY: number,
    ) {
      const button = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLButtonElement>("[data-step-button]");

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
  }, [onSetStepVelocity]);

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
    dragStateRef.current = {
      mode: "pending",
      pointerId: event.pointerId,
      paintVelocity: baseVelocity,
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
        <p>
          Click to toggle. Drag across to paint matching velocity, or drag up and
          down on a step to shape its volume.
        </p>
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
                const velocity = patterns[drum.id][step];
                const isActive = isStepActive(velocity);
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
                    data-drum-id={drum.id}
                    data-step={step}
                    onClick={(event) => {
                      event.preventDefault();
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
