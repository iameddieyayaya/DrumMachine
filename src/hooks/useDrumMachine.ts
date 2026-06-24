import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { totalSteps } from "../data/drums";
import { ensureAudioContext, triggerDrum } from "../lib/audio";
import type { DrumId, DrumSettings, LoopBars, Patterns } from "../types";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;

interface DrumMachineArgs {
  bpm: number;
  loopBars: LoopBars;
  patterns: Patterns;
  settings: DrumSettings;
  swing: number;
}

export function useDrumMachine({
  bpm,
  loopBars,
  patterns,
  settings,
  swing,
}: DrumMachineArgs) {
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const bpmRef = useRef(bpm);
  const patternsRef = useRef(patterns);
  const settingsRef = useRef(settings);
  const loopBarsRef = useRef(loopBars);
  const swingRef = useRef(swing);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const deferredStep = useDeferredValue(currentStep);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  useEffect(() => {
    loopBarsRef.current = loopBars;
    stepRef.current %= totalSteps(loopBars);
  }, [loopBars]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }

      const context = contextRef.current;
      if (context) {
        void context.close().catch(() => undefined);
      }
    };
  }, []);

  async function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    const context = contextRef.current ?? ensureAudioContext();
    contextRef.current = context;

    if (context.state === "suspended") {
      await context.resume();
    }

    stepRef.current = 0;
    nextNoteTimeRef.current = context.currentTime + 0.03;
    setCurrentStep(0);
    setIsPlaying(true);
  }

  function stopPlayback() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsPlaying(false);
    setCurrentStep(null);
    stepRef.current = 0;
  }

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    const timerId = window.setInterval(() => {
      scheduleNotes();
    }, LOOKAHEAD_MS);

    timerRef.current = timerId;
    scheduleNotes();

    return () => {
      window.clearInterval(timerId);
      if (timerRef.current === timerId) {
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  function scheduleNotes() {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    const maxSteps = totalSteps(loopBarsRef.current);

    while (nextNoteTimeRef.current < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const scheduledStep = stepRef.current;

      for (const [drumId, track] of Object.entries(patternsRef.current) as [
        DrumId,
        boolean[],
      ][]) {
        if (track[scheduledStep]) {
          triggerDrum(
            context,
            drumId,
            settingsRef.current[drumId],
            nextNoteTimeRef.current,
          );
        }
      }

      startTransition(() => {
        setCurrentStep(scheduledStep);
      });

      nextNoteTimeRef.current += getStepDuration(
        bpmRef.current,
        scheduledStep,
        swingRef.current,
      );
      stepRef.current = (stepRef.current + 1) % maxSteps;
    }
  }

  return {
    currentStep: deferredStep,
    isPlaying,
    stopPlayback,
    togglePlayback,
  };
}

function getStepDuration(bpm: number, step: number, swing: number) {
  const baseStepDuration = 60 / bpm / 2;
  const swingAmount = Math.min(0.34, Math.max(0, swing / 100)) * baseStepDuration;

  return step % 2 === 0
    ? baseStepDuration + swingAmount
    : baseStepDuration - swingAmount;
}
