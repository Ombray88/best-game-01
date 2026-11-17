// Mothlight world simulation module.
// Manages player movement, entity pooling, spawning, collisions, combo, power-ups, and level progression.

import { BAT, FIELD, LEVEL, LIVES, ORB, PLAYER, POOL_SIZE, POWERUP, THORN } from './config.js';

export const KIND_ORB = 0;
export const KIND_THORN = 1;
export const KIND_BAT = 2;
export const KIND_POWER = 3;

export const EVENT_HIT = 1;
export const EVENT_ORB = 2;
export const EVENT_OVER = 4;
export const EVENT_POWER = 8;
export const EVENT_LEVEL = 16;
export const EVENT_SHIELD = 32;

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    invulnerable: 0,
  };

  const items = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    items.push({
      active: false,
      kind: KIND_ORB,
      x: 0,
      y: 0,
      radius: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      power: 0,
      phase: 0,
      spin: 0,
    });
  }

  const state = {
    player,
    items,
    score: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    combo: 1,
    comboTimer: 999.0,
    shieldUntil: 0,
    slowUntil: 0,
    magnetUntil: 0,
    flash: 0,
    bloom: 0,
    orbTimer: ORB.interval,
    thornTimer: THORN.interval,
    batTimer: BAT.interval,
    powerTimer: POWERUP.interval,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.invulnerable = 0;
    for (let i = 0; i < items.length; i++) {
      items[i].active = false;
    }
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 1;
    state.comboTimer = 999.0;
    state.shieldUntil = 0;
    state.slowUntil = 0;
    state.magnetUntil = 0;
    state.flash = 0;
    state.bloom = 0;
    state.orbTimer = ORB.interval;
    state.thornTimer = THORN.interval;
    state.batTimer = BAT.interval;
    state.powerTimer = POWERUP.interval;
  }

  function freeItem() {
    for (let i = 0; i < items.length; i++) {
      if (!items[i].active) return items[i];
    }
    return null;
  }

  function spawnOrb() {
    const item = freeItem();
    if (!item) return;
    item.active = true;
    item.kind = KIND_ORB;
    item.radius = ORB.size / 2;
    item.x = item.radius + random() * (FIELD.width - item.radius * 2);
    item.y = -item.radius;
    item.speed = ORB.speed + ORB.speedPerLevel * (state.level - 1);
    item.vx = (random() - 0.5) * 40;
    item.vy = item.speed;
    item.power = 0;
    item.phase = random() * Math.PI * 2;
    item.spin = (random() - 0.5) * 2;
  }

  function spawnThorn() {
    const item = freeItem();
    if (!item) return;
    item.active = true;
    item.kind = KIND_THORN;
    item.radius = THORN.size / 2;
    item.x = item.radius + random() * (FIELD.width - item.radius * 2);
    item.y = -item.radius;
    item.speed = THORN.speed + THORN.speedPerLevel * (state.level - 1) + random() * THORN.speedJitter;
    item.vx = (random() - 0.5) * 60;
    item.vy = item.speed;
    item.power = 0;
    item.phase = random() * Math.PI * 2;
    item.spin = (random() - 0.5) * 4;
  }

  function spawnBat() {
    const item = freeItem();
    if (!item) return;
    item.active = true;
    item.kind = KIND_BAT;
    item.radius = BAT.size / 2;
    const side = random();
    if (side < 0.4) {
      item.x = item.radius + random() * (FIELD.width - item.radius * 2);
      item.y = -item.radius;
    } else if (side < 0.7) {
      item.x = -item.radius;
      item.y = item.radius + random() * (FIELD.height * 0.6);
    } else {
      item.x = FIELD.width + item.radius;
      item.y = item.radius + random() * (FIELD.height * 0.6);
    }
    item.speed = BAT.speed + BAT.speedPerLevel * (state.level - 1);
    item.vx = 0;
    item.vy = 0;
    item.power = 0;
    item.phase = random() * Math.PI * 2;
    item.spin = (random() - 0.5) * 5;
  }

  function spawnPower() {
    const item = freeItem();
    if (!item) return;
    item.active = true;
    item.kind = KIND_POWER;
    item.radius = POWERUP.size / 2;
    item.x = item.radius + random() * (FIELD.width - item.radius * 2);
    item.y = -item.radius;
    item.speed = 120;
    item.vx = 0;
    item.vy = item.speed;
    item.power = Math.floor(random() * 3);
    item.phase = random() * Math.PI * 2;
    item.spin = (random() - 0.5) * 3;
  }

  function step(dt, input, harmless) {
    let events = 0;
    state.elapsed += dt;

    // Level progression
    const newLevel = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (newLevel > state.level) {
      state.level = newLevel;
      state.bloom = 1.0;
      events |= EVENT_LEVEL;
    }

    // Player movement
    if (input && input.useMouse) {
      player.x += (input.mx - player.x) * PLAYER.lerp;
      player.y += (input.my - player.y) * PLAYER.lerp;
    } else if (input) {
      player.x += input.dx * PLAYER.speed * dt;
      player.y += input.dy * PLAYER.speed * dt;
    }

    const margin = player.radius;
    player.x = Math.min(FIELD.width - margin, Math.max(margin, player.x));
    player.y = Math.min(FIELD.height - margin, Math.max(margin, player.y));

    if (player.invulnerable > 0) {
      player.invulnerable = Math.max(0, player.invulnerable - dt);
    }

    if (state.flash > 0) {
      state.flash = Math.max(0, state.flash - dt * 3.0);
    }
    if (state.bloom > 0) {
      state.bloom = Math.max(0, state.bloom - dt * 3.0);
    }

    state.comboTimer += dt;

    // Spawning timers
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer += ORB.interval + random() * ORB.intervalJitter;
    }

    state.thornTimer -= dt;
    if (state.thornTimer <= 0) {
      spawnThorn();
      state.thornTimer += Math.max(THORN.minInterval, THORN.interval * Math.pow(THORN.intervalScale, state.level - 1));
    }

    state.batTimer -= dt;
    if (state.batTimer <= 0) {
      spawnBat();
      state.batTimer += Math.max(0.5, BAT.interval * Math.pow(BAT.intervalScale, state.level - 1));
    }

    state.powerTimer -= dt;
    if (state.powerTimer <= 0) {
      spawnPower();
      state.powerTimer += POWERUP.interval;
    }

    const isSlow = state.elapsed < state.slowUntil;
    const isMagnet = state.elapsed < state.magnetUntil;
    const slowFactor = isSlow ? 0.5 : 1.0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.active) continue;

      item.phase += dt * 3.0;

      if (item.kind === KIND_BAT) {
        const targetX = harmless ? FIELD.width / 2 : player.x;
        const targetY = harmless ? FIELD.height / 2 : player.y;
        const dx = targetX - item.x;
        const dy = targetY - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const nx = dx / dist;
          const ny = dy / dist;
          const targetVx = nx * item.speed;
          const targetVy = ny * item.speed;
          item.vx += (targetVx - item.vx) * Math.min(1.0, BAT.drift * dt);
          item.vy += (targetVy - item.vy) * Math.min(1.0, BAT.drift * dt);
        }
        item.x += item.vx * dt * slowFactor;
        item.y += item.vy * dt * slowFactor;
      } else {
        let vx = item.vx;
        let vy = item.speed;

        if (item.kind === KIND_THORN) {
          vx = Math.sin(item.phase) * 60;
        } else if (item.kind === KIND_ORB && isMagnet && !harmless) {
          const dx = player.x - item.x;
          const dy = player.y - item.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 260 && dist > 1) {
            const pull = 400 * (1 - dist / 260);
            vx += (dx / dist) * pull;
            vy += (dy / dist) * pull;
          }
        }

        item.x += vx * dt * slowFactor;
        item.y += vy * dt * slowFactor;
      }

      // Deactivate if out of bounds
      if (item.y > FIELD.height + item.radius * 2 || item.x < -200 || item.x > FIELD.width + 200) {
        item.active = false;
        continue;
      }

      if (harmless) continue;

      // Circle-circle collision check
      const pdx = item.x - player.x;
      const pdy = item.y - player.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      const minDist = item.radius + player.radius;

      if (pdist < minDist) {
        if (item.kind === KIND_ORB) {
          item.active = false;
          if (state.comboTimer <= ORB.comboWindow) {
            state.combo = Math.min(5, state.combo + 1);
          } else {
            state.combo = 1;
          }
          state.comboTimer = 0;
          state.score += ORB.points * state.combo;
          events |= EVENT_ORB;
        } else if (item.kind === KIND_POWER) {
          item.active = false;
          if (item.power === 0) {
            state.shieldUntil = state.elapsed + POWERUP.shieldDuration;
          } else if (item.power === 1) {
            state.slowUntil = state.elapsed + POWERUP.slowDuration;
          } else if (item.power === 2) {
            state.magnetUntil = state.elapsed + POWERUP.magnetDuration;
          }
          events |= EVENT_POWER;
        } else if (item.kind === KIND_THORN || item.kind === KIND_BAT) {
          const hasShield = state.elapsed < state.shieldUntil;
          if (hasShield) {
            item.active = false;
            state.shieldUntil = 0;
            state.flash = 1.0;
            events |= EVENT_SHIELD;
          } else if (player.invulnerable === 0) {
            item.active = false;
            state.lives -= 1;
            player.invulnerable = PLAYER.invulnerable;
            state.combo = 1;
            state.flash = 1.0;
            events |= EVENT_HIT;
            if (state.lives <= 0) {
              events |= EVENT_OVER;
              break;
            }
          }
        }
      }
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
