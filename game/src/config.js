// Configuration and tuning constants for Mothlight.
// The playfield is a fixed 1280x720 logical area scaled to the viewport.

export const FIELD = { width: 1280, height: 720 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 22,
  speed: 520,
  lerp: 0.18,
  invulnerable: 1.5,
};

export const LIVES = 3;

export const ORB = {
  size: 26,
  speed: 180,
  speedPerLevel: 15,
  interval: 1.2,
  intervalJitter: 0.6,
  points: 100,
  comboWindow: 2.5,
};

export const THORN = {
  size: 32,
  speed: 260,
  speedPerLevel: 25,
  speedJitter: 80,
  interval: 0.9,
  intervalScale: 0.9,
  minInterval: 0.25,
};

export const BAT = {
  size: 38,
  speed: 220,
  speedPerLevel: 20,
  interval: 2.5,
  intervalScale: 0.92,
  drift: 90,
};

export const POWERUP = {
  size: 30,
  interval: 14.0,
  shieldDuration: 6.0,
  slowDuration: 4.0,
  magnetDuration: 5.0,
};

export const LEVEL = { seconds: 20, max: 12 };

export const POOL_SIZE = 64;

export const PALETTE = {
  backdrop: '#0b0f19',
  foliage: '#162a3b',
  player: '#ffb703',
  playerGlow: '#ffd166',
  orb: '#8ecae6',
  orbGlow: '#219ebc',
  thorn: '#e056fd',
  bat: '#ff4757',
  shield: '#4cc9f0',
  slow: '#7209b7',
  magnet: '#f72585',
  text: '#f8f9fa',
  muted: '#adb5bd',
  panel: '#1f2937',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'mothlight.best';
