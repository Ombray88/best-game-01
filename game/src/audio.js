// Pure WebAudio synthesis module for Mothlight sound effects and cues.

export function createAudio() {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
      masterGain.connect(ctx.destination);
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      unlocked = true;
    } catch (e) {
      ctx = null;
    }
  }

  function setMuted(m) {
    muted = !!m;
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 0.25, ctx.currentTime);
    }
  }

  function isMuted() {
    return muted;
  }

  function playTone(freq, type, startTime, duration, startGain = 0.2) {
    if (!ctx || !masterGain || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(startGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Ignore audio synthesis errors
    }
  }

  return {
    unlock,
    setMuted,
    isMuted,
    collect(combo = 1) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const baseFreq = 587.33; // D5
      const mult = Math.min(5, Math.max(1, combo));
      const freq = baseFreq * Math.pow(1.12, mult - 1);
      playTone(freq, 'sine', t, 0.15, 0.25);
      playTone(freq * 1.5, 'triangle', t + 0.02, 0.1, 0.15);
    },
    hit() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      playTone(110, 'triangle', t, 0.25, 0.35);
      playTone(55, 'sine', t, 0.3, 0.4);
    },
    power() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      playTone(440, 'sine', t, 0.12, 0.2);
      playTone(554.37, 'sine', t + 0.08, 0.12, 0.2);
      playTone(659.25, 'sine', t + 0.16, 0.25, 0.25);
    },
    level() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      playTone(523.25, 'triangle', t, 0.15, 0.2);
      playTone(659.25, 'triangle', t + 0.1, 0.15, 0.2);
      playTone(783.99, 'triangle', t + 0.2, 0.15, 0.2);
      playTone(1046.50, 'sine', t + 0.3, 0.3, 0.25);
    },
    over() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      playTone(330, 'triangle', t, 0.2, 0.3);
      playTone(277.18, 'triangle', t + 0.15, 0.2, 0.3);
      playTone(220, 'sine', t + 0.3, 0.4, 0.35);
    },
    start() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      playTone(440, 'sine', t, 0.15, 0.2);
      playTone(880, 'sine', t + 0.12, 0.25, 0.25);
    },
  };
}
