#!/usr/bin/env node

/**
 * Jules Plan Generator & Issue Commenter
 *
 * Analyzes an issue, gathers architectural constraints from AGENTS.md,
 * generates a structured implementation plan (optionally powered by Gemini),
 * and posts the plan as an interactive review comment on the GitHub issue.
 *
 * Usage:
 *   node scripts/jules-plan-generator.mjs --issue <issue_number>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.JULES_API_KEY_1,
  process.env.JULES_API_KEY_2,
  process.env.JULES_API_KEY_3,
  process.env.JULES_API_KEY_4,
  process.env.JULES_API_KEY_5,
  process.env.JULES_API_KEY,
].filter(Boolean);

function parseArgs() {
  const args = process.argv.slice(2);
  let issueNumber = null;
  const isDryRun = args.includes('--dry-run');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--issue' && args[i + 1]) {
      issueNumber = Number.parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (!issueNumber && process.env.ISSUE_NUMBER) {
    issueNumber = Number.parseInt(process.env.ISSUE_NUMBER, 10);
  }

  return { issueNumber, isDryRun };
}

async function fetchGitHub(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'jules-plan-generator',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API error (${res.status} ${res.statusText}) on ${endpoint}: ${errText}`);
  }
  return res.json();
}

async function getIssueDetails(issueNumber) {
  return fetchGitHub(`/issues/${issueNumber}`);
}

async function postIssueComment(issueNumber, commentBody) {
  return fetchGitHub(`/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: commentBody }),
  });
}

async function addIssueLabels(issueNumber, labels) {
  return fetchGitHub(`/issues/${issueNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  });
}

async function removeIssueLabel(issueNumber, label) {
  try {
    const encoded = encodeURIComponent(label);
    await fetchGitHub(`/issues/${issueNumber}/labels/${encoded}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore if label did not exist
  }
}

function readAgentsRules() {
  const agentsPath = path.join(ROOT_DIR, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    return fs.readFileSync(agentsPath, 'utf8');
  }
  return '';
}

async function generatePlanWithGemini(issue, agentsRules, targetFiles = []) {
  if (API_KEYS.length === 0) {
    return null;
  }

  const lensPrompt = process.env.LENS_PROMPT || '';
  const lensName = process.env.LENS_NAME || '';

  const detectedFilesList = targetFiles.length > 0
    ? `\nRelevant Candidate Files detected in repository:\n${targetFiles.map((f) => `- ${f}`).join('\n')}\n`
    : '';

  const prompt = `You are the lead software architect for the LocalGameGalaxy repository.
A GitHub issue has been requested to be solved by Google Jules.
Notice: This issue may be a consolidated epic containing multiple sub-requirements in its description checklist.
Before any code is modified, you must provide a concrete, step-by-step implementation plan that addresses the primary issue AND ALL bundled sub-requirements for human review and approval.

Project Rules from AGENTS.md:
${agentsRules.slice(0, 3000)}
${detectedFilesList}
${lensPrompt ? `\nSPECIALIZED REPOLENS AUDIT FOCUS (${lensName}):\n${lensPrompt}\n` : ''}

Issue Details:
Title: ${issue.title}
Body:
${issue.body || 'No description provided.'}

Generate a concise, professional markdown implementation plan in the following structure:
### 📋 Proposed Solution & Scope
[Concise root cause analysis or feature breakdown covering the main goal and all bundled sub-tasks]

### 🛠️ Step-by-Step Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

### 📁 Target Files & Modules
- [List files to edit or create]

### 🧪 Verification & Testing Strategy
- [Unit tests to add/run]
- [Architecture & Budget compliance checks: check:architecture:diff, check:budget, npm test, npm run build]

### ⚠️ Constraints & Edge Cases
- [Note any AGENTS.md rules to strictly follow: anti-god component <250 lines, no cross-game imports, i18n keys in de and en, etc.]
`;

  const models = [
    'gemini-3.8-flash',
    'gemini-3.8-pro',
    'gemini-3.1-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  for (const apiKey of API_KEYS) {
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (response.status === 429) {
          console.warn(`Key hit quota limit (429). Trying next key...`);
          break; // try next key
        }

        if (!response.ok) {
          console.warn(`Model ${model} returned status ${response.status}. Trying next model...`);
          continue;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (err) {
        console.warn(`Error querying model ${model}:`, err.message);
      }
    }
  }

  return null;
}

function scanCodebaseForContext(issue) {
  const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
  const detectedFiles = new Set();

  const keywords = ['youtube', 'lyric', 'player', 'score', 'video', 'card', 'history', 'wordle', 'bubble', 'hint', 'header', 'nav', 'setting', 'helper'];
  const matchedKeywords = keywords.filter((k) => text.includes(k));

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(fullPath);
      } else if (
        e.isFile() &&
        (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
        !e.name.endsWith('.test.ts') &&
        !e.name.endsWith('.test.tsx')
      ) {
        const relPath = path.relative(ROOT_DIR, fullPath);
        const lowerRel = relPath.toLowerCase();
        if (matchedKeywords.some((k) => lowerRel.includes(k))) {
          detectedFiles.add(relPath);
        }
      }
    }
  }

  walk(path.join(ROOT_DIR, 'src'));
  return Array.from(detectedFiles).slice(0, 8);
}

function generateTemplatePlan(issue, targetFiles = []) {
  const body = issue.body || '';
  const isBundled = body.includes('Konsolidierte Anforderungen') || body.includes('- [ ]');

  let bundledSection = '';
  if (isBundled) {
    const checklistItems = body
      .split('\n')
      .filter((l) => l.trim().startsWith('- [ ]') || l.trim().startsWith('- [*]'))
      .map((l) => l.trim())
      .join('\n');

    if (checklistItems) {
      bundledSection = `\n\n#### 📦 Enthaltene Teil-Anforderungen (Gebündeltes Epic):\n${checklistItems}\n`;
    }
  }

  const targetFilesFormatted = targetFiles.length > 0
    ? targetFiles.map((f) => `- \`${f}\``).join('\n')
    : '- `src/games/melodiq/gameplay/YouTubeBackgroundPlayer.tsx`\n- `src/games/melodiq/gameplay/LyricsDisplay.tsx`';

  // Build concrete implementation steps based on requirements
  const steps = [];
  if (body.includes('Untertitel') || issue.title.includes('Untertitel') || body.includes('159')) {
    steps.push('**YouTube Untertitel ausblenden (#159)**: In `src/games/melodiq/gameplay/YouTubeBackgroundPlayer.tsx` `cc_load_policy: 0` und `iv_load_policy: 3` in `playerVars` setzen, damit YouTube-Untertitel standardmäßig unterdrückt werden.');
  }
  if (body.includes('Videos') || issue.title.includes('Videos') || body.includes('153')) {
    steps.push('**YouTube Video-Wiedergabe (#153)**: In `YouTubeBackgroundPlayer.tsx` und `createYouTubeVideoAdapter.ts` Fallback für Origin-Beschränkungen (`origin: window.location.origin`) und No-Cookie-Host absichern, damit Videos zuverlässig geladen werden.');
  }
  if (body.includes('umbruch') || issue.title.includes('umbruch') || body.includes('160')) {
    steps.push('**Lyrics ohne Zeilenumbruch (#160)**: In `src/games/melodiq/gameplay/LyricsDisplay.tsx` das Umbruchverhalten von `whiteSpace: "pre-wrap"` auf `whiteSpace: "nowrap"` und dynamische Skalierung anpassen, um die volle Bildschirmbreite auszunutzen.');
  }
  if (body.includes('zeilen') || issue.title.includes('zeilen') || body.includes('161')) {
    steps.push('**Konfigurierbare Zeilenanzahl (#161)**: In `src/games/melodiq/gameplay/LyricsDisplay.tsx` Zeilenanzeige konfigurierbar machen (0 = aus, 1 = aktiv vergrößert, 2 = Standard-Zweizeiler, 3+ = erweiterte Vorschau).');
  }

  if (steps.length === 0) {
    steps.push(
      '**Code-Analyse & Lokalisierung**: Betroffene Komponenten anhand der Fehlerbeschreibung analysieren.',
      '**Implementierung**: Anpassungen modular und AGENTS.md-konform (< 250 Zeilen pro Komponente) umsetzen.',
      '**Tests & Validierung**: Vitest-Tests und Architecture-Checks durchführen.',
    );
  } else {
    steps.push(
      '**Verifikation & Qualitätstore**: Vitest-Tests ausführen (`npm test`) und Anti-Duplikation prüfen (`npm run check:duplicates`).',
      '**PR-Erstellung**: Branch `jules/issue-' + issue.number + '` erstellen und PR nach `dev` öffnen mit Referenz `Closes #' + issue.number + '`.',
    );
  }

  const stepsFormatted = steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');

  return `### 📋 Proposed Solution & Scope
- **Issue**: #${issue.number} - ${issue.title}
- **Objective**: Implement all requirements described in the issue specification and all bundled sub-tasks.${bundledSection}

### 🛠️ Konkreter Umsetzungsplan (Code-Analyse)
${stepsFormatted}

### 📁 Target Files & Components
${targetFilesFormatted}

### 🧪 Verification & Testing Strategy
- Unit-Tests: \`npm test\`
- Architektur-Grenzen: \`npm run check:architecture:diff\`
- Component Size Budgets: \`npm run check:budget\`
- Anti-Duplikation: \`npm run check:duplicates\`

### ⚠️ Architectural Constraints
- Komponenten müssen ≤ 250 Zeilen bleiben (AGENTS.md).
- Keine Cross-Game Imports.
- \`src/lib/storage.ts\` verwenden (niemals raw \`localStorage\`).
- MUI \`<ConfirmDialog>\` verwenden (niemals \`window.confirm()\`).`;
}

async function main() {
  const { issueNumber, isDryRun } = parseArgs();

  let issue;
  if (isDryRun && (!issueNumber || !GITHUB_TOKEN)) {
    console.log('[DRY-RUN] Running in local mock mode without GitHub API...');
    issue = {
      number: issueNumber || 999,
      title: 'Fix score calculation overflow in Storyteller round summary',
      body: 'When players score more than 100 points, the summary screen overflows on mobile viewports.',
    };
  } else {
    if (!issueNumber) {
      console.error('Error: No issue number provided. Use --issue <number> or set ISSUE_NUMBER.');
      process.exit(1);
    }

    if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
      console.error('Error: GITHUB_TOKEN and GITHUB_REPOSITORY environment variables are required.');
      process.exit(1);
    }

    console.log(`Generating Jules implementation plan for issue #${issueNumber} in ${GITHUB_REPOSITORY}...`);
    issue = await getIssueDetails(issueNumber);
  }

  const agentsRules = readAgentsRules();
  const targetFiles = scanCodebaseForContext(issue);

  let planContent = await generatePlanWithGemini(issue, agentsRules, targetFiles);
  if (!planContent) {
    planContent = generateTemplatePlan(issue, targetFiles);
  }

  const commentMarkdown = `## 🤖 Jules Implementation Plan

${planContent}

---

### 🚦 Approval Loop
Please review the plan above.
- **To approve and execute this plan with Google Jules:**
  Reply with comment **\`/jules approve\`** or assign label **\`jules:approved\`**.
  *Jules will branch off \`dev\`, implement the changes, run tests, and open a Pull Request targeting \`dev\`.*
- **To modify the plan:**
  Reply with your feedback or instructions using **\`/jules plan <your changes>\`**.
`;

  if (isDryRun) {
    console.log('\n================== [DRY-RUN PLAN OUTPUT] ==================\n');
    console.log(commentMarkdown);
    console.log('===========================================================\n');
    console.log('[DRY-RUN] Success: Plan generated. No GitHub comments or labels modified.');
    return;
  }

  console.log('Posting plan comment to issue...');
  await postIssueComment(issueNumber, commentMarkdown);

  console.log('Updating issue labels...');
  await removeIssueLabel(issueNumber, 'jules:plan');
  await addIssueLabels(issueNumber, ['jules:waiting-approval']);

  console.log(`Plan generated and posted successfully for issue #${issueNumber}.`);
}

main().catch((err) => {
  console.error('Fatal error in plan generator:', err);
  process.exit(1);
});
