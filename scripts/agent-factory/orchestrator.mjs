#!/usr/bin/env node
/**
 * LocalGameGalaxy Agent Factory Orchestrator
 *
 * Coordinates Google AI Pro worker accounts to implement tasks autonomously,
 * enforcing strict anti-duplication, architecture boundaries, and test validation.
 *
 * Usage:
 *   node scripts/agent-factory/orchestrator.mjs --task="<instruction>" [--worker=<1-5>] [--game=<gameId>] [--retries=3]
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const LOCK_DIR = '/tmp/agentfactory_locks';
fs.mkdirSync(LOCK_DIR, { recursive: true });

// Parse arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    acc[key] = val || true;
  }
  return acc;
}, {});

const task = args.task;
const targetGame = args.game || '';
const maxRetries = parseInt(args.retries || '3', 10);
const specifiedWorker = args.worker ? parseInt(args.worker, 10) : null;

if (!task) {
  console.error('❌ Error: Missing --task argument.');
  console.log('Usage: node scripts/agent-factory/orchestrator.mjs --task="<task description>" [--game=<gameId>]');
  process.exit(1);
}

// 1. Worker Pool Management (Workers 1 to 5)
function acquireWorker() {
  const workers = [1, 2, 3, 4, 5];
  if (specifiedWorker) {
    return specifiedWorker;
  }

  for (const w of workers) {
    const lockFile = path.join(LOCK_DIR, `worker_${w}.lock`);
    if (!fs.existsSync(lockFile)) {
      fs.writeFileSync(lockFile, `${process.pid}\n${new Date().toISOString()}`);
      return w;
    }
  }

  console.warn('⚠️ All workers currently locked. Defaulting to Worker 1.');
  return 1;
}

function releaseWorker(workerId) {
  const lockFile = path.join(LOCK_DIR, `worker_${workerId}.lock`);
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (err) {
    // ignore
  }
}

const workerId = acquireWorker();
console.log(`\n🤖 [Agent Factory] Assigned Worker #${workerId} (Google AI Pro Account #${workerId})`);
console.log(`📋 Task: "${task}"`);

// 2. Build Guardrailed System Prompt
const promptPrefix = `Du bist ein spezialisierter AI Software Engineer in der LocalGameGalaxy Agenten-Fabrik.
Arbeitsverzeichnis: ${ROOT_DIR}
Fokus-Spiel / Modul: ${targetGame || 'Gesamtsystem'}

WICHTIGE PROJEKT-REGELN AUS AGENTS.md (STRENG VERPFLICHTEND):
1. KEINE CROSS-GAME IMPORTS: Niemals Code aus 'src/games/<anderes_spiel>' importieren! Geteilter Code gehört in 'src/modules/' oder 'src/lib/'.
2. KEIN ROHES STORAGE: Niemals 'localStorage' oder 'sessionStorage' direkt aufrufen! Verwende IMMER 'storage.getJSON / storage.setJSON' aus 'src/lib/storage.ts'.
3. ANTI-GOD-COMPONENT: Halte Komponenten unter 200 Zeilen. Trenne State/Logik in Custom Hooks ('use<Name>State.ts') und Presenter.
4. KEINE NATIVEN DIALOGE: Kein window.confirm() oder alert(). Verwende ConfirmDialog oder MUI Dialog.
5. I18N: Alle Strings müssen als t('key') verwendet und in 'public/locales/de/translation.json' und 'public/locales/en/translation.json' gepflegt werden.
6. BESTEHENDE MODULE WIEDERVERWENDEN:
   - Multiplayer-Sync: 'src/modules/sync' (MqttMailboxService)
   - Spieler-Lobby: 'src/modules/player-management'
   - Zeichen-Canvas: 'src/modules/drawing'
   - Audio / Mic: 'src/modules/audio'

DEIN AUFTRAG:
${task}

Implementiere die Änderungen sauber, erstelle oder bearbeite die notwendigen Dateien und führe keine unnötigen Refactorings an fremden Dateien durch.`;

// 3. Execution Function
async function runWorkerSession(promptText) {
  const workerHome = `/home/agentfactory/.profiles/worker${workerId}`;
  console.log(`\n⚡ Launching agy session with profile: ${workerHome}...`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      'agy',
      ['-p', promptText, '--dangerously-skip-permissions'],
      {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          HOME: workerHome,
        },
        stdio: 'inherit',
      }
    );

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`agy exited with code ${code}`));
      }
    });

    child.on('error', err => {
      reject(err);
    });
  });
}

// 4. Quality Gates
function runQualityGates() {
  console.log('\n🔍 [Quality Gate] Running automated architecture and safety checks...');
  const failures = [];

  // Gate 1: Architecture boundaries
  try {
    console.log('  ▶ Checking architecture boundaries (check:architecture:diff)...');
    execSync('npm run check:architecture:diff', { cwd: ROOT_DIR, stdio: 'pipe' });
    console.log('  ✔ Architecture boundaries passed.');
  } catch (err) {
    failures.push(`Architecture check failed:\n${err.stdout?.toString() || err.message}`);
  }

  // Gate 2: Code duplication detection (jscpd)
  try {
    console.log('  ▶ Checking for code duplication (check:duplicates)...');
    execSync('npm run check:duplicates', { cwd: ROOT_DIR, stdio: 'pipe' });
    console.log('  ✔ Duplication check passed (no copy-pasting detected).');
  } catch (err) {
    failures.push(`Duplicate code check (jscpd) failed:\n${err.stdout?.toString() || err.message}`);
  }

  // Gate 3: Component size budget
  try {
    console.log('  ▶ Checking component size budget (check:budget)...');
    execSync('npm run check:budget', { cwd: ROOT_DIR, stdio: 'pipe' });
    console.log('  ✔ Component budget passed.');
  } catch (err) {
    failures.push(`Component budget check failed:\n${err.stdout?.toString() || err.message}`);
  }

  // Gate 4: Automated tests
  try {
    console.log('  ▶ Running Vitest unit tests...');
    execSync('npm test', { cwd: ROOT_DIR, stdio: 'pipe' });
    console.log('  ✔ Unit tests passed.');
  } catch (err) {
    failures.push(`Unit tests failed:\n${err.stdout?.toString() || err.message}`);
  }

  return failures;
}

// 5. Main Orchestration Loop
async function main() {
  let attempt = 1;
  let currentPrompt = promptPrefix;

  try {
    while (attempt <= maxRetries) {
      console.log(`\n======================================================`);
      console.log(`🚀 Attempt ${attempt} of ${maxRetries}`);
      console.log(`======================================================`);

      try {
        await runWorkerSession(currentPrompt);
      } catch (err) {
        console.error(`❌ Worker session error: ${err.message}`);
      }

      const failures = runQualityGates();
      if (failures.length === 0) {
        console.log('\n🎉 [SUCCESS] All Quality Gates PASSED!');
        console.log('✔ Architecture rules verified');
        console.log('✔ Zero code duplication');
        console.log('✔ Budget limits respected');
        console.log('✔ Unit tests green');
        break;
      }

      console.warn(`\n⚠️ Quality Gates detected ${failures.length} violation(s):`);
      for (const f of failures) {
        console.warn(`--------------------------------------------------\n${f}`);
      }

      if (attempt === maxRetries) {
        console.error('\n❌ Max retries reached. Changes need manual review.');
        process.exit(1);
      }

      // Generate self-healing prompt for next iteration
      currentPrompt = `Die vorherigen Änderungen haben Fehler in den automatischen Quality Gates erzeugt:

${failures.join('\n\n')}

Repariere diese Fehler sofort und stelle sicher, dass alle Tests und Architekturregeln aus AGENTS.md grün sind.`;
      attempt++;
    }
  } finally {
    releaseWorker(workerId);
  }
}

main().catch(err => {
  releaseWorker(workerId);
  console.error('Fatal error:', err);
  process.exit(1);
});
