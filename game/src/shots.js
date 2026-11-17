// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from a
// fresh world for a fixed number of steps, steered by the lookahead autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { FIELD, PLAYER, BAT, STEP } from './config.js';
import { EVENT_OVER, KIND_ORB, KIND_THORN, KIND_BAT } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const HORIZON_PLAY = 0.7;
const HORIZON_END = 0.2;
const SUB_DT = 1 / 30;

function autopilot(state, careful) {
  const horizon = careful ? HORIZON_PLAY : HORIZON_END;
  const totalSteps = Math.round(horizon / SUB_DT);

  const candidates = [{ dx: 0, dy: 0 }];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx !== 0 || dy !== 0) {
        candidates.push({ dx, dy });
      }
    }
  }

  let bestOrb = null;
  let bestOrbDistSq = Infinity;
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    if (item.active && item.kind === KIND_ORB) {
      const dx = item.x - state.player.x;
      const dy = item.y - state.player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestOrbDistSq) {
        bestOrbDistSq = distSq;
        bestOrb = item;
      }
    }
  }

  let bestScore = -Infinity;
  let bestCandidate = candidates[0];

  for (let c = 0; c < candidates.length; c++) {
    const cand = candidates[c];
    let px = state.player.x;
    let py = state.player.y;

    const simItems = new Array(state.items.length);
    for (let i = 0; i < state.items.length; i++) {
      const src = state.items[i];
      simItems[i] = {
        active: src.active,
        kind: src.kind,
        x: src.x,
        y: src.y,
        radius: src.radius,
        speed: src.speed,
        vx: src.vx,
        vy: src.vy,
        phase: src.phase
      };
    }

    let safe = true;
    let posAt035x = px;
    let posAt035y = py;
    let orbAt035x = 0;
    let orbAt035y = 0;
    let foundOrbAt035 = false;

    for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
      const currentTime = stepIdx * SUB_DT;

      px += cand.dx * PLAYER.speed * SUB_DT;
      py += cand.dy * PLAYER.speed * SUB_DT;
      const margin = PLAYER.radius;
      px = Math.min(FIELD.width - margin, Math.max(margin, px));
      py = Math.min(FIELD.height - margin, Math.max(margin, py));

      if (Math.abs(currentTime - 0.35) < SUB_DT * 0.5 || stepIdx === totalSteps - 1) {
        posAt035x = px;
        posAt035y = py;
        if (bestOrb) {
          const origIdx = state.items.indexOf(bestOrb);
          if (origIdx >= 0 && simItems[origIdx].active) {
            orbAt035x = simItems[origIdx].x;
            orbAt035y = simItems[origIdx].y;
            foundOrbAt035 = true;
          }
        }
      }

      for (let i = 0; i < simItems.length; i++) {
        const item = simItems[i];
        if (!item.active) continue;

        item.phase += SUB_DT * 3.0;

        if (item.kind === KIND_BAT) {
          const targetX = px;
          const targetY = py;
          const dx = targetX - item.x;
          const dy = targetY - item.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 1) {
            const nx = dx / dist;
            const ny = dy / dist;
            const targetVx = nx * item.speed;
            const targetVy = ny * item.speed;
            item.vx += (targetVx - item.vx) * Math.min(1.0, BAT.drift * SUB_DT);
            item.vy += (targetVy - item.vy) * Math.min(1.0, BAT.drift * SUB_DT);
          }
          item.x += item.vx * SUB_DT;
          item.y += item.vy * SUB_DT;
        } else {
          let vx = item.vx;
          let vy = item.speed;
          if (item.kind === KIND_THORN) {
            vx = Math.sin(item.phase) * 60;
          }
          item.x += vx * SUB_DT;
          item.y += vy * SUB_DT;
        }

        const isHazard = (item.kind === KIND_THORN) || (careful && item.kind === KIND_BAT);
        if (isHazard && item.active) {
          const pdx = item.x - px;
          const pdy = item.y - py;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pdist < item.radius + PLAYER.radius) {
            safe = false;
          }
        }
      }

      if (!safe) break;
    }

    if (!safe) continue;

    let score = 0;
    if (foundOrbAt035) {
      const odx = orbAt035x - posAt035x;
      const ody = orbAt035y - posAt035y;
      score = -Math.sqrt(odx * odx + ody * ody);
    } else {
      const cdx = FIELD.width / 2 - posAt035x;
      const cdy = FIELD.height / 2 - posAt035y;
      score = -Math.sqrt(cdx * cdx + cdy * cdy);
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  if (bestScore === -Infinity) {
    return { dx: 0, dy: 0, mx: 0, my: 0, useMouse: false };
  }

  return { dx: bestCandidate.dx, dy: bestCandidate.dy, mx: 0, my: 0, useMouse: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dx: 0, dy: 0, mx: 0, my: 0, useMouse: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const careful = name !== 'end';
  for (let index = 0; index < limit / STEP; index += 1) {
    const input = autopilot(world.state, careful);
    if (world.step(STEP, input, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
