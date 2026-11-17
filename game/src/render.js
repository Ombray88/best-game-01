// Rendering module for Mothlight.
// Draws the night garden background, starfield, fireflies, foliage silhouettes,
// moth player with flapping wings and glow, items (orbs, thorns, bats, power-ups),
// screen shake, bloom flash, HUD, and overlay screens (Title, Paused, Over).

import { FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_BAT, KIND_ORB, KIND_POWER, KIND_THORN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 680, top: 120, line: 36, bottom: 80 };
const LIFE_SIZE = 22;
const LIFE_GAP = 10;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const levelLabel = cachedLabel('Level ');
  const comboLabel = cachedLabel('Combo x');

  // Precompute starfield
  const stars = [];
  let starSeed = 1337;
  const starRand = () => {
    starSeed = (starSeed * 9301 + 49297) % 233280;
    return starSeed / 233280;
  };
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: starRand() * FIELD.width,
      y: starRand() * (FIELD.height * 0.8),
      size: 1 + starRand() * 2.5,
      twinkleSpeed: 1.5 + starRand() * 3,
      twinklePhase: starRand() * Math.PI * 2,
    });
  }

  // Precompute fireflies
  const fireflies = [];
  let flySeed = 42;
  const flyRand = () => {
    flySeed = (flySeed * 9301 + 49297) % 233280;
    return flySeed / 233280;
  };
  for (let i = 0; i < 30; i++) {
    fireflies.push({
      x: flyRand() * FIELD.width,
      y: flyRand() * FIELD.height,
      radius: 2 + flyRand() * 2.5,
      speedX: (flyRand() - 0.5) * 25,
      speedY: (flyRand() - 0.5) * 20,
      phase: flyRand() * Math.PI * 2,
    });
  }

  // Precompute foliage silhouette shapes along bottom edge
  const foliageSegments = [];
  let fSeed = 88;
  const fRand = () => {
    fSeed = (fSeed * 9301 + 49297) % 233280;
    return fSeed / 233280;
  };
  let cx = -50;
  while (cx < FIELD.width + 100) {
    const w = 90 + fRand() * 140;
    const h = 50 + fRand() * 90;
    foliageSegments.push({ x: cx, w, h });
    cx += w * 0.55;
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function drawText(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function drawGardenBackground(state) {
    // Vertical gradient sky
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.backdrop);
    grad.addColorStop(0.7, '#0f172a');
    grad.addColorStop(1, PALETTE.foliage);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Starfield
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const alpha = 0.2 + 0.8 * Math.abs(Math.sin(state.elapsed * s.twinkleSpeed + s.twinklePhase));
      context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      context.beginPath();
      context.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      context.fill();
    }

    // Fireflies
    for (let i = 0; i < fireflies.length; i++) {
      const f = fireflies[i];
      const fx = (f.x + Math.sin(state.elapsed * 0.7 + f.phase) * 30 + state.elapsed * f.speedX) % FIELD.width;
      const fy = (f.y + Math.cos(state.elapsed * 0.5 + f.phase) * 25 + state.elapsed * f.speedY) % FIELD.height;
      const rx = fx < 0 ? fx + FIELD.width : fx;
      const ry = fy < 0 ? fy + FIELD.height : fy;

      context.save();
      context.shadowBlur = 12;
      context.shadowColor = PALETTE.playerGlow;
      context.fillStyle = PALETTE.player;
      context.beginPath();
      context.arc(rx, ry, f.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    // Foliage silhouettes along bottom
    context.fillStyle = '#090d16';
    context.beginPath();
    context.moveTo(0, FIELD.height);
    for (let i = 0; i < foliageSegments.length; i++) {
      const seg = foliageSegments[i];
      context.quadraticCurveTo(seg.x + seg.w * 0.5, FIELD.height - seg.h * 1.3, seg.x + seg.w, FIELD.height);
    }
    context.lineTo(FIELD.width, FIELD.height);
    context.closePath();
    context.fill();
  }

  function drawPlayer(player, elapsed, shieldActive) {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 1) {
      return; // blink hide
    }

    context.save();
    context.translate(player.x, player.y);

    // Shield ring
    if (shieldActive) {
      context.strokeStyle = PALETTE.shield;
      context.lineWidth = 3;
      context.shadowBlur = 15;
      context.shadowColor = PALETTE.shield;
      context.beginPath();
      context.arc(0, 0, player.radius + 12, 0, Math.PI * 2);
      context.stroke();
    }

    // Moth glow halo
    context.shadowBlur = 25;
    context.shadowColor = PALETTE.playerGlow;

    // Wings flapping
    const flap = Math.sin(elapsed * 20) * 0.45;
    context.fillStyle = '#ffdf7e';

    // Left wing
    context.save();
    context.rotate(-0.3 + flap);
    context.beginPath();
    context.ellipse(-14, 0, player.radius * 0.9, player.radius * 0.5, 0.2, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Right wing
    context.save();
    context.rotate(0.3 - flap);
    context.beginPath();
    context.ellipse(14, 0, player.radius * 0.9, player.radius * 0.5, -0.2, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Body
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.ellipse(0, 0, player.radius * 0.55, player.radius * 0.75, 0, 0, Math.PI * 2);
    context.fill();

    // Head & Eyes
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(-4, -player.radius * 0.6, 3, 0, Math.PI * 2);
    context.arc(4, -player.radius * 0.6, 3, 0, Math.PI * 2);
    context.fill();

    // Antennae
    context.strokeStyle = PALETTE.player;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-3, -player.radius * 0.7);
    context.quadraticCurveTo(-12, -player.radius * 1.5, -18, -player.radius * 1.3);
    context.moveTo(3, -player.radius * 0.7);
    context.quadraticCurveTo(12, -player.radius * 1.5, 18, -player.radius * 1.3);
    context.stroke();

    context.restore();
  }

  function drawItems(items, elapsed, isMagnet) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.active) continue;

      context.save();
      context.translate(item.x, item.y);

      if (item.kind === KIND_ORB) {
        // Pollen Orb: cyan glowing circle with pulsing radius & bright core
        const pulse = Math.sin(item.phase + elapsed * 6) * 3;
        const r = item.radius + pulse;

        context.shadowBlur = 18;
        context.shadowColor = PALETTE.orbGlow;
        context.fillStyle = PALETTE.orb;
        context.beginPath();
        context.arc(0, 0, r, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        context.fill();
      } else if (item.kind === KIND_THORN) {
        // Thorn: magenta/purple diamond shard rotating slowly
        context.rotate(item.spin + elapsed * 2);
        context.shadowBlur = 12;
        context.shadowColor = PALETTE.thorn;
        context.fillStyle = PALETTE.thorn;
        context.beginPath();
        const sz = item.radius * 1.2;
        context.moveTo(0, -sz);
        context.lineTo(sz * 0.8, 0);
        context.lineTo(0, sz);
        context.lineTo(-sz * 0.8, 0);
        context.closePath();
        context.fill();
      } else if (item.kind === KIND_BAT) {
        // Bat: dark violet shape with flapping wings and red eyes
        const wingFlap = Math.sin(elapsed * 25) * 0.5;
        context.shadowBlur = 10;
        context.shadowColor = PALETTE.bat;

        // Wings
        context.fillStyle = '#5a189a';
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-item.radius * 1.6, -item.radius * (0.8 + wingFlap));
        context.lineTo(-item.radius * 0.6, item.radius * 0.8);
        context.closePath();
        context.fill();

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(item.radius * 1.6, -item.radius * (0.8 + wingFlap));
        context.lineTo(item.radius * 0.6, item.radius * 0.8);
        context.closePath();
        context.fill();

        // Body & head
        context.fillStyle = '#3c096c';
        context.beginPath();
        context.arc(0, 0, item.radius * 0.65, 0, Math.PI * 2);
        context.fill();

        // Red eyes
        context.fillStyle = PALETTE.bat;
        context.beginPath();
        context.arc(-3, -2, 2, 0, Math.PI * 2);
        context.arc(3, -2, 2, 0, Math.PI * 2);
        context.fill();
      } else if (item.kind === KIND_POWER) {
        // Power-up icon (0=shield, 1=slow, 2=magnet)
        let color = PALETTE.shield;
        if (item.power === 1) color = PALETTE.slow;
        else if (item.power === 2) color = PALETTE.magnet;

        context.shadowBlur = 18;
        context.shadowColor = color;
        context.fillStyle = '#1f2937';
        context.strokeStyle = color;
        context.lineWidth = 3;

        context.beginPath();
        context.arc(0, 0, item.radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        if (item.power === 0) {
          drawText('S', 0, 0, 18, color, 'center', 'middle');
        } else if (item.power === 1) {
          drawText('Z', 0, 0, 18, color, 'center', 'middle');
        } else {
          drawText('M', 0, 0, 18, color, 'center', 'middle');
        }
      }

      context.restore();
    }
  }

  function drawBloomOverlay(bloom) {
    if (bloom <= 0) return;
    context.save();
    const grad = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, 50,
      FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.7
    );
    grad.addColorStop(0, `rgba(255, 183, 3, ${bloom * 0.4})`);
    grad.addColorStop(1, 'rgba(255, 183, 3, 0)');
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
  }

  function drawHud(state) {
    // Subtle backing panel behind top-left score area
    context.fillStyle = 'rgba(15, 23, 42, 0.75)';
    context.beginPath();
    context.roundRect(16, 12, 240, 72, 8);
    context.fill();

    context.textBaseline = 'top';
    drawText(scoreLabel(state.score), 28, 20, 26, PALETTE.text, 'left', 'top');
    drawText(bestLabel(localStorage.getItem('mothlight.best') || 0), 28, 50, 18, PALETTE.muted, 'left', 'top');

    // Top-right Level & Combo meter
    const rightX = FIELD.width - 28;
    drawText(levelLabel(state.level), rightX, 20, 26, PALETTE.text, 'right', 'top');

    if (state.combo > 1) {
      const comboText = comboLabel(state.combo);
      drawText(comboText, rightX, 50, 18, PALETTE.player, 'right', 'top');
      
      // Combo timer bar
      const barW = 100;
      const barH = 6;
      const progress = Math.max(0, Math.min(1, 1 - state.comboTimer / 2.5));
      context.fillStyle = '#334155';
      context.fillRect(rightX - barW, 72, barW, barH);
      context.fillStyle = PALETTE.player;
      context.fillRect(rightX - barW, 72, barW * progress, barH);
    }

    // Lives: glowing amber hearts at top-centre
    const totalLivesWidth = LIVES * (LIFE_SIZE + LIFE_GAP) - LIFE_GAP;
    const startLifeX = (FIELD.width - totalLivesWidth) / 2;
    for (let life = 0; life < LIVES; life += 1) {
      const lx = startLifeX + life * (LIFE_SIZE + LIFE_GAP) + LIFE_SIZE / 2;
      const ly = 32;
      const active = life < state.lives;

      context.save();
      context.translate(lx, ly);
      context.shadowBlur = active ? 10 : 0;
      context.shadowColor = PALETTE.player;
      context.fillStyle = active ? PALETTE.player : '#334155';

      // Simple filled heart
      context.beginPath();
      context.moveTo(0, 6);
      context.bezierCurveTo(-10, -6, -16, 2, 0, 16);
      context.bezierCurveTo(16, 2, 10, -6, 0, 6);
      context.fill();
      context.restore();
    }

    // Active power-up timers at bottom-left
    let activePowers = [];
    if (state.elapsed < state.shieldUntil) {
      activePowers.push({ name: 'SHIELD', rem: Math.ceil(state.shieldUntil - state.elapsed), color: PALETTE.shield });
    }
    if (state.elapsed < state.slowUntil) {
      activePowers.push({ name: 'SLOW', rem: Math.ceil(state.slowUntil - state.elapsed), color: PALETTE.slow });
    }
    if (state.elapsed < state.magnetUntil) {
      activePowers.push({ name: 'MAGNET', rem: Math.ceil(state.magnetUntil - state.elapsed), color: PALETTE.magnet });
    }

    for (let i = 0; i < activePowers.length; i++) {
      const pow = activePowers[i];
      const py = FIELD.height - 40 - i * 36;
      context.fillStyle = 'rgba(15, 23, 42, 0.8)';
      context.beginPath();
      context.roundRect(24, py - 6, 160, 30, 6);
      context.fill();

      drawText(`${pow.name}: ${pow.rem}s`, 36, py + 9, 16, pow.color, 'left', 'middle');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;

    // Panel background
    context.save();
    context.shadowBlur = 30;
    context.shadowColor = 'rgba(0, 0, 0, 0.6)';
    context.fillStyle = PALETTE.panel;
    context.strokeStyle = PALETTE.player;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.stroke();
    context.restore();

    // Title
    drawText(title, FIELD.width / 2, y + 64, 46, PALETTE.text, 'center', 'alphabetic');

    // Lines
    for (let index = 0; index < lines.length; index += 1) {
      drawText(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center', 'alphabetic');
    }

    // Prompt
    drawText(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.player, 'center', 'alphabetic');
  }

  const TITLE_LINES = [
    'Guide Luma the lantern moth through the luminous night garden.',
    'Mouse, Arrow Keys, or WASD to fly.',
    'Collect glowing pollen orbs & build combos. Dodge thorns & bats!',
    'Press Space or click to start  |  P: Pause  |  M: Mute',
    ''
  ];
  const PAUSED_LINES = ['The garden rests quietly.', 'Press P or Space to resume.'];
  const OVER_LINES = ['', '', '', ''];

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    // Screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (state.flash > 0) {
      shakeX = Math.sin(state.elapsed * 55) * state.flash * 12;
      shakeY = Math.cos(state.elapsed * 50) * state.flash * 12;
    }

    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

    drawGardenBackground(state);
    drawItems(state.items, state.elapsed, state.elapsed < state.magnetUntil);
    const shieldActive = state.elapsed < state.shieldUntil;
    drawPlayer(state.player, state.elapsed, shieldActive);
    drawBloomOverlay(state.bloom);

    context.restore();

    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('MOTHLIGHT', TITLE_LINES, 'Press Space or click to start');
      return;
    }

    drawHud(state);

    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', PAUSED_LINES, 'Press P or Space to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = scoreLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      levelLabel(state.level); // update internal cache
      OVER_LINES[2] = `Level reached ${state.level}`;
      OVER_LINES[3] = 'Press Space or click to play again';
      drawPanel('GAME OVER', OVER_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
