// Keyboard and pointer input. Held keys give steering directions (dx, dy);
// one-shot presses (confirm, pause, mute) are queued as bit flags and taken once by the loop.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

const GAME_KEYS = new Set([
  ...LEFT,
  ...RIGHT,
  ...UP,
  ...DOWN,
  ...CONFIRM,
  ...PAUSE,
  ...MUTE,
]);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let mouseX = FIELD.width / 2;
  let mouseY = FIELD.height / 2;
  let mouseActive = false;

  window.addEventListener('keydown', (event) => {
    if (GAME_KEYS.has(event.code)) {
      event.preventDefault();
    }
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });

  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
  });

  if (target) {
    target.addEventListener('pointermove', (event) => {
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
      const offsetX = (rect.width - FIELD.width * scale) / 2;
      const offsetY = (rect.height - FIELD.height * scale) / 2;
      mouseX = (event.clientX - rect.left - offsetX) / scale;
      mouseY = (event.clientY - rect.top - offsetY) / scale;
      mouseActive = true;
    });

    target.addEventListener('pointerdown', () => {
      actions |= ACTION_CONFIRM;
    });
  }

  return {
    /** Keyboard steering direction as { dx, dy }, each -1/0/1. */
    direction() {
      const dx = (right ? 1 : 0) - (left ? 1 : 0);
      const dy = (down ? 1 : 0) - (up ? 1 : 0);
      return { dx, dy };
    },
    /** Current pointer position in logical playfield coordinates { x, y, active }. */
    mouse() {
      return { x: mouseX, y: mouseY, active: mouseActive };
    },
    /** One-shot actions since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
