// Alert tones generated on the fly via the Web Audio API — no bundled audio files needed,
// and it's the same "plain Web API first" convention this app already uses for speech
// synthesis/recognition in the Guard Kiosk module.
let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function tone(ctx: AudioContext, freq: number, startAt: number, durationSec: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  tone(ctx, 880, now, 0.18);
  tone(ctx, 1320, now + 0.16, 0.22);
}

function playBeep(ctx: AudioContext) {
  const now = ctx.currentTime;
  tone(ctx, 1000, now, 0.12, 'square');
  tone(ctx, 1000, now + 0.18, 0.12, 'square');
}

function playSiren(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(0.25, now);
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
  osc.frequency.linearRampToValueAtTime(600, now + 0.8);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.85);
}

export function playAlertSound(soundKey: string): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (soundKey === 'siren') playSiren(ctx);
  else if (soundKey === 'beep') playBeep(ctx);
  else playChime(ctx);
}

export function vibrateAlert(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([300, 150, 300, 150, 300]);
  }
}
