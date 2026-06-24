import type { DrumId, DrumParams } from "../types";

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

export function ensureAudioContext() {
  const AudioContextClass =
    window.AudioContext ??
    (window as Window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Web Audio is not available in this browser.");
  }

  return new AudioContextClass();
}

export function triggerDrum(
  context: AudioContext,
  drumId: DrumId,
  params: DrumParams,
  time: number,
  velocity: number,
) {
  switch (drumId) {
    case "kick":
      synthKick(context, params, time, velocity);
      break;
    case "snare":
      synthSnare(context, params, time, velocity);
      break;
    case "hihat":
      synthHiHat(context, params, time, velocity);
      break;
    case "tom":
      synthTom(context, params, time, velocity);
      break;
  }
}

function synthKick(
  context: AudioContext,
  params: DrumParams,
  time: number,
  velocity: number,
) {
  const oscillator = context.createOscillator();
  const amp = context.createGain();
  const tone = context.createBiquadFilter();
  const shaper = context.createWaveShaper();

  const basePitch = 42 + params.tone * 34;
  const startPitch = basePitch * (2.1 + params.drive * 0.25);
  const decay = 0.18 + params.decay * 0.6;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(startPitch, time);
  oscillator.frequency.exponentialRampToValueAtTime(basePitch, time + decay * 0.82);

  tone.type = "lowpass";
  tone.frequency.value = 180 + params.tone * 620;
  tone.Q.value = 0.6 + params.drive * 8;

  shaper.curve = makeDriveCurve(50 + params.drive * 220);
  shaper.oversample = "4x";

  const level = scaleVelocity(velocity);
  amp.gain.setValueAtTime(0.001, time);
  amp.gain.exponentialRampToValueAtTime(level, time + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.001, time + decay);

  oscillator.connect(tone);
  tone.connect(shaper);
  shaper.connect(amp);
  amp.connect(context.destination);

  oscillator.start(time);
  oscillator.stop(time + decay + 0.04);
}

function synthSnare(
  context: AudioContext,
  params: DrumParams,
  time: number,
  velocity: number,
) {
  const noiseSource = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  const noiseAmp = context.createGain();
  const toneOsc = context.createOscillator();
  const toneAmp = context.createGain();
  const mix = context.createGain();

  const decay = 0.08 + params.decay * 0.34;
  const noiseBrightness = 1500 + params.noise * 5200;
  const snapPitch = 160 + params.snap * 120;
  const level = scaleVelocity(velocity);

  noiseSource.buffer = getNoiseBuffer(context);
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = noiseBrightness;
  noiseAmp.gain.setValueAtTime(0.001, time);
  noiseAmp.gain.exponentialRampToValueAtTime(0.95 * level, time + 0.002);
  noiseAmp.gain.exponentialRampToValueAtTime(0.001, time + decay);

  toneOsc.type = "triangle";
  toneOsc.frequency.setValueAtTime(snapPitch, time);
  toneAmp.gain.setValueAtTime(0.001, time);
  toneAmp.gain.exponentialRampToValueAtTime(
    (0.28 + params.snap * 0.18) * level,
    time + 0.004,
  );
  toneAmp.gain.exponentialRampToValueAtTime(0.001, time + decay * 0.75);

  mix.gain.value = 0.88;

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseAmp);
  noiseAmp.connect(mix);
  toneOsc.connect(toneAmp);
  toneAmp.connect(mix);
  mix.connect(context.destination);

  noiseSource.start(time);
  noiseSource.stop(time + decay + 0.05);
  toneOsc.start(time);
  toneOsc.stop(time + decay + 0.04);
}

function synthHiHat(
  context: AudioContext,
  params: DrumParams,
  time: number,
  velocity: number,
) {
  const frequencies = [1, 1.33, 1.51, 1.88, 2.05, 2.64];
  const bandpass = context.createBiquadFilter();
  const highpass = context.createBiquadFilter();
  const shaper = context.createWaveShaper();
  const amp = context.createGain();

  const baseFrequency = 320 + params.tone * 210;
  const decay = 0.035 + params.decay * 0.22;

  bandpass.type = "bandpass";
  bandpass.frequency.value = 6200 + params.tone * 2800;
  bandpass.Q.value = 0.9;

  highpass.type = "highpass";
  highpass.frequency.value = 4200 + params.tone * 2600;

  shaper.curve = makeDriveCurve(35 + params.grit * 180);
  shaper.oversample = "2x";

  const level = scaleVelocity(velocity);
  amp.gain.setValueAtTime(0.001, time);
  amp.gain.exponentialRampToValueAtTime(0.65 * level, time + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.001, time + decay);

  frequencies.forEach((ratio) => {
    const oscillator = context.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = baseFrequency * ratio;
    oscillator.connect(bandpass);
    oscillator.start(time);
    oscillator.stop(time + decay + 0.03);
  });

  bandpass.connect(highpass);
  highpass.connect(shaper);
  shaper.connect(amp);
  amp.connect(context.destination);
}

function synthTom(
  context: AudioContext,
  params: DrumParams,
  time: number,
  velocity: number,
) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const amp = context.createGain();

  const basePitch = 92 + params.pitch * 92;
  const bend = 1.2 + params.bend * 1.7;
  const decay = 0.16 + params.decay * 0.5;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(basePitch * bend, time);
  oscillator.frequency.exponentialRampToValueAtTime(basePitch, time + decay * 0.72);

  filter.type = "lowpass";
  filter.frequency.value = 420 + params.pitch * 1200;
  filter.Q.value = 0.6;

  const level = scaleVelocity(velocity);
  amp.gain.setValueAtTime(0.001, time);
  amp.gain.exponentialRampToValueAtTime(0.82 * level, time + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.001, time + decay);

  oscillator.connect(filter);
  filter.connect(amp);
  amp.connect(context.destination);

  oscillator.start(time);
  oscillator.stop(time + decay + 0.05);
}

function getNoiseBuffer(context: BaseAudioContext) {
  const cached = noiseBuffers.get(context);
  if (cached) {
    return cached;
  }

  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  noiseBuffers.set(context, buffer);
  return buffer;
}

function makeDriveCurve(amount: number) {
  const sampleCount = 256;
  const curve = new Float32Array(sampleCount);
  const drive = (Math.PI * amount) / 180;

  for (let index = 0; index < sampleCount; index += 1) {
    const normalized = (index * 2) / sampleCount - 1;
    curve[index] =
      ((3 + drive) * normalized * 20 * (Math.PI / 180)) /
      (Math.PI + drive * Math.abs(normalized));
  }

  return curve;
}

function scaleVelocity(velocity: number) {
  return Math.max(0.08, Math.min(1, velocity));
}
