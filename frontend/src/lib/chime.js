// Soft bell chime synthesized via Web Audio (no assets required).
// Includes a mute toggle persisted in localStorage.

const MUTE_KEY = "rc_chime_muted";

let ctx = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

const bellVoice = (audio, freq, startAt, duration, gainPeak) => {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
};

export const isMuted = () => {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
};

export const setMuted = (v) => {
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
};

export const playChime = () => {
  if (isMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  const t0 = audio.currentTime;
  // Two-note "ding-dong": E6 (1318.5), C6 (1046.5) — soft & short
  bellVoice(audio, 1318.5, t0, 0.55, 0.18);
  bellVoice(audio, 1046.5, t0 + 0.14, 0.65, 0.15);
  // A subtle fifth for warmth
  bellVoice(audio, 1568.0, t0, 0.35, 0.06);
};

// Call once on a real user gesture (e.g. login click) to unlock audio.
export const primeAudio = () => { getCtx(); };
