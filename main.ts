/**
 * Mothlight Game Submission Script
 * 
 * Assembles the submission artifacts for the "Mothlight" entry.
 * Copies the game source bundle and screenshots, then generates
 * the validator dossier using makefun-game utilities.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

function deploySubmission(): void {
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const destinationDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  mkdirSync(destinationDir, { recursive: true });

  const gameSource = pathJoin(currentDir, 'game');
  const gameTarget = pathJoin(destinationDir, 'game');
  cpSync(gameSource, gameTarget, { recursive: true });

  const screenshotsSource = pathJoin(currentDir, 'screenshots');
  const screenshotsTarget = pathJoin(destinationDir, 'screenshots');
  if (existsSync(screenshotsSource)) {
    mkdirSync(screenshotsTarget, { recursive: true });
    cpSync(screenshotsSource, screenshotsTarget, { recursive: true });
  }

  const dossierPayload = buildDossier(destinationDir, {
    text_max_bytes: 163840,
    screenshots: {
      max: 4,
      max_bytes: 262144,
    },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });

  const dossierFilePath = pathJoin(destinationDir, 'dossier.json');
  writeFileSync(dossierFilePath, dossierPayload);
}

deploySubmission();
