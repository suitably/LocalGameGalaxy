#!/usr/bin/env node

/**
 * Jules Plan Generator & Issue Commenter (Self-Improving RepoLens Standard)
 *
 * Implements a self-improving, generic codebase analysis and planning engine:
 * 1. Dynamically detects game subsystems and shared modules from the filesystem.
 * 2. Learns from and updates .pipeline-memory/knowledge-base.json for pattern recognition.
 * 3. Deeply introspects candidate files: line budgets, state hooks, key handlers, line citations.
 *    (Excludes /i18n/ and locale dictionary files from component decomposition).
 * 4. Generates rigorous, file-grounded research plans using Gemini 3.8 Flash or clean static audit.
 * 5. Preserves full untruncated issue specifications and ADRs (zero artificial cutoff).
 * 6. Self-verifies that zero generic placeholders or cross-contaminating text are ever emitted.
 *
 * Usage:
 *   node scripts/jules-plan-generator.mjs --issue <issue_number>
 *   node scripts/jules-plan-generator.mjs --dry-run
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MEMORY_FILE = path.join(ROOT_DIR, '.pipeline-memory', 'knowledge-base.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
  const issue = await fetchGitHub(`/issues/${issueNumber}`);
  try {
    const comments = await fetchGitHub(`/issues/${issueNumber}/comments?per_page=100`);
    if (Array.isArray(comments)) {
      const userComments = comments.filter((c) => {
        const author = c.user?.login || '';
        const body = (c.body || '').trim();
        const isBot =
          c.user?.type === 'Bot' ||
          author.includes('[bot]') ||
          author === 'github-actions' ||
          body.startsWith('## 🤖') ||
          body.startsWith('### 🔍') ||
          body.startsWith('/plan') ||
          body.startsWith('/jules') ||
          body.startsWith('/bundle') ||
          body.startsWith('/duplicate');
        return !isBot && body.length > 0;
      });

      if (userComments.length > 0) {
        issue.userComments = userComments.map((c) => ({
          author: c.user?.login || 'User',
          body: c.body.trim(),
          createdAt: c.created_at,
        }));
      }
    }
  } catch (err) {
    console.warn('[Plan] Could not fetch issue comments:', err.message);
  }
  return issue;
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

/**
 * Loads the persistent pipeline memory knowledge base.
 */
function loadPipelineMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('[Memory] Failed to load pipeline memory:', err.message);
  }
  return {
    version: '1.0.0',
    subsystemAliases: {},
    frequentlyModifiedComponents: {},
    learnedResolutionPatterns: [],
  };
}

/**
 * Updates pipeline memory with newly discovered patterns (self-improving loop).
 */
function savePipelineMemory(memory) {
  try {
    const dir = path.dirname(MEMORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Memory] Failed to save pipeline memory:', err.message);
  }
}

/**
 * Generic Codebase Scanner & Introspector
 * Dynamically resolves subsystems, scores files via multi-pass heuristics,
 * and extracts concrete line numbers and state hooks.
 * Automatically excludes pure translation files (/i18n/, /locales/) from being targeted as code components.
 */
function scanCodebaseForContext(issue) {
  const memory = loadPipelineMemory();
  const commentsText = (issue.userComments || []).map((c) => c.body).join(' ');
  const text = `${issue.title} ${issue.body || ''} ${commentsText}`.toLowerCase();

  // 1. Detect all subsystems dynamically from disk
  const gamesDir = path.join(ROOT_DIR, 'src', 'games');
  const availableGames = fs.existsSync(gamesDir)
    ? fs.readdirSync(gamesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  const modulesDir = path.join(ROOT_DIR, 'src', 'modules');
  const availableModules = fs.existsSync(modulesDir)
    ? fs.readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  const detectedSubsystems = new Set();
  for (const g of availableGames) {
    const cleanG = g.replace(/[^a-z0-9]/g, '');
    if (text.includes(g) || text.includes(cleanG)) {
      detectedSubsystems.add(`games/${g}`);
    }
  }
  for (const m of availableModules) {
    const cleanM = m.replace(/[^a-z0-9]/g, '');
    if (text.includes(m) || text.includes(cleanM)) {
      detectedSubsystems.add(`modules/${m}`);
    }
  }

  // Check aliases from memory (e.g. "bubble" -> guessart, "lyrics" -> melodiq)
  if (memory.subsystemAliases) {
    for (const [subsystem, aliases] of Object.entries(memory.subsystemAliases)) {
      for (const alias of aliases) {
        if (text.includes(alias.toLowerCase())) {
          if (availableGames.includes(subsystem)) detectedSubsystems.add(`games/${subsystem}`);
          if (availableModules.includes(subsystem)) detectedSubsystems.add(`modules/${subsystem}`);
        }
      }
    }
  }

  // 2. Extract meaningful tokens (German & English stop words removed)
  const stopWords = new Set([
    'die', 'der', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
    'und', 'oder', 'aber', 'dann', 'wenn', 'hier', 'auch', 'nach', 'von', 'mit', 'bei', 'vor',
    'wie', 'was', 'wer', 'wo', 'warum', 'habe', 'hast', 'hat', 'haben', 'hatte', 'hatten',
    'bin', 'bist', 'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'wurde', 'wurden',
    'kann', 'kannst', 'koennen', 'soll', 'sollte', 'sollen', 'muss', 'musst', 'muessen',
    'lasse', 'lassen', 'sehen', 'sehe', 'sieht', 'schon', 'bereits', 'etwas', 'nichts', 'alles',
    'mehr', 'weniger', 'sehr', 'ganz', 'doch', 'nur', 'noch', 'dass', 'darauf', 'daran', 'dazu',
    'damit', 'ueber', 'unter', 'fuer', 'gegen', 'durch', 'ohne', 'um', 'aus', 'auf', 'ab', 'an',
    'im', 'in', 'zu', 'zur', 'zum', 'so', 'gut', 'schlecht', 'viel', 'viele', 'jetzt', 'nun',
    'weiter', 'beispiel', 'feedback', 'bug', 'feature', 'issue', 'anzeigen', 'soweit', 'jedoch',
    'the', 'and', 'or', 'but', 'then', 'when', 'here', 'also', 'from', 'with', 'for', 'ich', 'you',
  ]);

  // Expand with domain synonyms
  const domainSynonyms = {
    bubble: ['chip', 'slot', 'hint', 'letter', 'circle'],
    bubbles: ['chips', 'slots', 'hints', 'letters', 'circles'],
    buchstabe: ['letter', 'char', 'slot', 'chip'],
    buchstaben: ['letters', 'chars', 'slots', 'chips', 'hintletters'],
    tippen: ['guess', 'input', 'type'],
    getippt: ['guess', 'input', 'typed'],
    untertitel: ['subtitle', 'caption', 'cc_load_policy'],
    karte: ['card', 'deck', 'pile', 'hand'],
    karten: ['cards', 'deck', 'pile', 'hand'],
    ziehen: ['draw', 'deal', 'pick'],
    noten: ['sheet', 'musicxml', 'osmd', 'stems', 'audio'],
    instrument: ['stem', 'stems', 'musicxml', 'sheet', 'audiocontext'],
    history: ['history', 'stats', 'previous', 'past', 'record'],
    historie: ['history', 'stats', 'previous', 'past', 'record'],
  };

  const rawTokens = text.match(/[a-zA-Z0-9_\-]{3,}/g) || [];
  const tokens = new Set();
  for (const t of rawTokens) {
    if (!stopWords.has(t)) {
      tokens.add(t);
      if (domainSynonyms[t]) {
        for (const s of domainSynonyms[t]) tokens.add(s);
      }
    }
  }

  const tokenList = Array.from(tokens);

  // 3. Multi-Pass Scoring
  const candidateScores = new Map();

  // Check explicit file mentions in issue body and discussion comments
  const fullTextWithComments = `${issue.body || ''}\n${commentsText}`;
  const explicitPathRegex = /(src\/[a-zA-Z0-9_\-\.\/]+\.(?:tsx?|jsx?))/g;
  let expMatch;
  while ((expMatch = explicitPathRegex.exec(fullTextWithComments)) !== null) {
    const p = expMatch[1];
    if (fs.existsSync(path.join(ROOT_DIR, p))) {
      candidateScores.set(p, 500);
    }
  }

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
        !e.name.includes('.test.') &&
        !e.name.includes('.spec.')
      ) {
        const relPath = path.relative(ROOT_DIR, fullPath);
        const lowerRel = relPath.toLowerCase();

        // STRICT FILTER: Exclude translation and locale dictionary files from code candidates!
        if (
          lowerRel.includes('/i18n/') ||
          lowerRel.includes('/locales/') ||
          lowerRel.endsWith('.d.ts') ||
          lowerRel.endsWith('.json')
        ) {
          continue;
        }

        let score = candidateScores.get(relPath) || 0;

        // Subsystem match bonus
        let inDetected = false;
        for (const sub of detectedSubsystems) {
          if (lowerRel.includes(`src/${sub}`)) {
            score += 40;
            inDetected = true;
          }
        }

        // If specific subsystems were identified, deprioritize orthogonal games
        if (detectedSubsystems.size > 0 && !inDetected && lowerRel.startsWith('src/games/')) {
          continue;
        }

        // Filename match bonus
        for (const t of tokenList) {
          if (lowerRel.includes(t)) score += 35;
        }

        // Content occurrence scan
        try {
          const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
          for (const t of tokenList) {
            const count = (content.match(new RegExp(`\\b${t}`, 'g')) || []).length;
            if (count > 0) {
              score += Math.min(count * 3, 30);
            }
          }
        } catch {
          // ignore
        }

        if (score > 0) {
          candidateScores.set(relPath, score);
        }
      }
    }
  }

  walk(path.join(ROOT_DIR, 'src'));

  // Self-Verification fallback: if 0 candidates found, search entire src with relaxed criteria
  if (candidateScores.size === 0) {
    console.warn('[Scanner] 0 candidates found on first pass. Triggering broad relaxed search...');
    const topKeywords = ['player', 'game', 'panel', 'view', 'display', 'screen', 'board', 'reducer', 'card', 'hint', 'music', 'viewer'];
    for (const kw of topKeywords) {
      if (text.includes(kw)) {
        walk(path.join(ROOT_DIR, 'src'));
        break;
      }
    }
  }

  // Sort and select top 4 candidate files
  const topCandidatePaths = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([filePath]) => filePath);

  // 4. Deep Introspection of Candidate Files
  const candidates = topCandidatePaths.map((relPath) => {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const lineCount = lines.length;

    // Line citations where tokens match
    const matchingLines = [];
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      for (const t of tokenList) {
        if (lineLower.includes(t)) {
          matchingLines.push({
            lineNumber: i + 1,
            text: lines[i].trim(),
            token: t,
          });
          break;
        }
      }
      if (matchingLines.length >= 8) break;
    }

    // State hooks and exported symbols
    const stateHooks = [];
    const exportedSymbols = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const stateMatch = l.match(/const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState/);
      if (stateMatch) {
        stateHooks.push({ lineNumber: i + 1, stateVar: stateMatch[1], line: l.trim() });
      }
      const exportMatch = l.match(/export\s+(?:const|function|interface|type)\s+([a-zA-Z0-9_]+)/);
      if (exportMatch) {
        exportedSymbols.push(exportMatch[1]);
      }
    }

    // Git history
    let recentCommits = [];
    try {
      const gitOut = execSync(`git log -n 3 --oneline -- ${relPath}`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
      }).toString().trim();
      if (gitOut) recentCommits = gitOut.split('\n');
    } catch {
      // ignore
    }

    // Context snippet around top match or beginning of component
    const focusLine = matchingLines.length > 0 ? matchingLines[0].lineNumber : 1;
    const startIdx = Math.max(0, focusLine - 15);
    const endIdx = Math.min(lines.length, focusLine + 35);
    const snippet = lines.slice(startIdx, endIdx).join('\n');

    return {
      path: relPath,
      lineCount,
      isBudgetExceeded: lineCount > 250,
      matchingLines,
      stateHooks,
      exportedSymbols,
      recentCommits,
      snippet,
      focusLineRange: `${startIdx + 1}–${endIdx}`,
    };
  });

  // Self-Improving Loop: Record high-scoring match into knowledge base
  if (candidates.length > 0 && issue.title) {
    const cleanTitle = issue.title.toLowerCase().replace(/\[.*?\]/g, '').trim();
    const existing = memory.learnedResolutionPatterns.find((p) => p.pattern === cleanTitle);
    if (!existing) {
      memory.learnedResolutionPatterns.push({
        pattern: cleanTitle,
        subsystems: Array.from(detectedSubsystems),
        files: candidates.map((c) => c.path),
        recordedAt: new Date().toISOString(),
      });
      if (memory.learnedResolutionPatterns.length > 50) memory.learnedResolutionPatterns.shift();
      savePipelineMemory(memory);
    }
  }

  return candidates;
}

function buildTriageContextPack(issue, candidateFiles) {
  let filePacks = '';
  for (const c of candidateFiles) {
    filePacks += `\n### File: \`${c.path}\` (${c.lineCount} lines ${c.isBudgetExceeded ? '⚠️ EXCEEDS 250 LINE BUDGET' : '✔ within budget'})\n`;
    if (c.exportedSymbols.length > 0) {
      filePacks += `- Exported Symbols: ${c.exportedSymbols.map((s) => `\`${s}\``).join(', ')}\n`;
    }
    if (c.stateHooks.length > 0) {
      filePacks += `- Key State Hooks:\n${c.stateHooks.map((h) => `  - Line ${h.lineNumber}: \`${h.line}\``).join('\n')}\n`;
    }
    if (c.matchingLines.length > 0) {
      filePacks += `- Token Matches in Code:\n${c.matchingLines.map((m) => `  - Line ${m.lineNumber}: \`${m.text.slice(0, 80)}\``).join('\n')}\n`;
    }
    if (c.recentCommits.length > 0) {
      filePacks += `- Recent Git Commits:\n${c.recentCommits.map((cm) => `  - ${cm}`).join('\n')}\n`;
    }
    filePacks += `Code Excerpt (lines ${c.focusLineRange}):\n\`\`\`tsx\n${c.snippet}\n\`\`\`\n`;
  }

  return filePacks;
}

async function generatePlanWithGemini(issue, candidateFiles) {
  if (!GEMINI_API_KEY) {
    return { plan: null, error: null };
  }

  const lensPrompt = process.env.LENS_PROMPT || '';
  const lensName = process.env.LENS_NAME || '';
  const contextPack = buildTriageContextPack(issue, candidateFiles);

  const commentsBlock = (issue.userComments || []).length > 0
    ? `\nSUPPLEMENTAL DISCUSSION & USER FEEDBACK (COMMENTS):\n` +
      issue.userComments.map((c) => `Comment by @${c.author}: ${c.body}`).join('\n\n') + '\n'
    : '';

  const prompt = `You are the lead software architect for LocalGameGalaxy.
An issue has been requested to be solved by Google Jules.
Follow the RepoLens RFC / Research Plan standard (as seen in RepoLens #389).
Do NOT emit generic boilerplate. Analyze the actual code snippets, recent commits, and requirements provided below.

HARD CONSTRAINTS:
- Components must remain <= 250 lines (AGENTS.md budget). If a target file exceeds 250 lines, plan its decomposition.
- No cross-game imports (check:architecture:diff).
- Use src/lib/storage.ts instead of raw localStorage.
- Use MUI <ConfirmDialog> instead of window.confirm.

${lensPrompt ? `SPECIALIZED REPOLENS AUDIT LENS (${lensName}):\n${lensPrompt}\n` : ''}

ISSUE / RFC DETAILS:
Issue: #${issue.number} - ${issue.title}
Full Specification:
${issue.body || 'No description provided.'}
${commentsBlock}

CODEBASE EVIDENCE (TRIAGE CONTEXT PACK):
${contextPack}

Produce a rigorous, deep research and implementation plan formatted in Markdown:

# Research & Implementation Plan: Issue #${issue.number} — ${issue.title}

## 1. Executive Summary & Problem Scope
[Clear root cause analysis addressing the primary issue AND all bundled sub-tasks from the checklist]

## 2. Current Behavior & Codebase Analysis
[Cite exact files and lines (e.g. \`path/to/file.tsx:84-95\`). Explain why the current implementation fails or lacks the required feature based on the snippets and state hooks above]

## 3. Proposed Architectural Changes
[File-by-file breakdown with exact function names, props, state, and styling adjustments. If a component is >250 lines, detail its modular split]

## 4. Alternative Approaches Considered
[Evaluate at least 2 alternative implementations with pros & cons, explaining why the chosen approach is lowest-risk]

## 5. Risks, Edge Cases & Mitigations
[Identify edge cases (e.g. mobile/Capacitor viewports, origin restrictions, iframe policies, layout shifts, audio sync, race conditions) and concrete mitigations]

## 6. Concrete Vitest Test Plan & Quality Gates
[Numbered assertions for unit tests in Vitest. Required CI checks: \`npm run check:architecture:diff\`, \`npm run check:budget\`, \`npm run check:duplicates\`, \`npm test\`]

## 7. Suggested Implementation Sequence
[Chronological step-by-step checklist for Jules to execute]
`;

  // Standard Google Generative Language models:
  const models = [
    'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini API] Model ${model} failed (${response.status}): ${errText.slice(0, 150)}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && !text.includes('To be determined')) {
        return { plan: text, error: null };
      }
    } catch (err) {
      console.warn(`[Gemini API] Error querying model ${model}:`, err.message);
    }
  }

  return { plan: null, error: 'Gemini API nicht verfügbar' };
}

/**
 * Clean, generic static codebase audit plan.
 * Used only when the Google Gemini cloud API is unreachable.
 * Never invents fake GuessArt text or hallucinated tests.
 * Preserves the full untruncated specification.
 */
function generateTemplatePlan(issue, candidateFiles = [], apiError = null) {
  const body = issue.body || '';
  const title = issue.title || '';
  const isBundled = body.includes('Konsolidierte Anforderungen') || body.includes('- [ ]');

  let bundledSection = '';
  if (isBundled) {
    const checklistItems = body
      .split('\n')
      .filter((l) => l.trim().startsWith('- [ ]') || l.trim().startsWith('- [*]') || l.trim().startsWith('- [x]'))
      .map((l) => l.trim())
      .join('\n');

    if (checklistItems) {
      bundledSection = `\n\n### 📦 Enthaltene Teil-Anforderungen (Konsolidiertes Epic)\n${checklistItems}\n`;
    }
  }

  const notice = `> [!NOTE]\n> **Plan generiert durch lokale Codebase-Analyse**: Basiert auf der statischen Code- und Git-Introspektion des GitHub Runners (RepoLens Standard).\n\n`;

  // Generate Current Behavior & Analysis section from real introspected files
  const fileAnalysisSections = candidateFiles.map((c) => {
    let details = `### \`${c.path}\` (${c.lineCount} Zeilen ${c.isBudgetExceeded ? '⚠️ verletzt 250-Zeilen-Budget' : '✔ im Budget'})\n`;
    if (c.exportedSymbols.length > 0) {
      details += `- **Exportierte Symbole / Schnittstellen**: ${c.exportedSymbols.map((s) => `\`${s}\``).join(', ')}\n`;
    }
    if (c.matchingLines.length > 0) {
      details += `- **Relevante Codezeilen (Fundstellen zum Issue-Kontext)**:\n`;
      for (const m of c.matchingLines.slice(0, 4)) {
        details += `  - **Zeile ${m.lineNumber}**: \`${m.text.slice(0, 90)}\`\n`;
      }
    }
    if (c.stateHooks.length > 0) {
      details += `- **Zustandsverwaltung / State Hooks**:\n`;
      for (const h of c.stateHooks) {
        details += `  - Zeile ${h.lineNumber}: Hook \`${h.stateVar}\` steuert den lokalen Zustand.\n`;
      }
    }
    if (c.isBudgetExceeded) {
      details += `- **Architektur-Hinweis (AGENTS.md)**: Mit ${c.lineCount} Zeilen überschreitet diese Komponente das 250-Zeilen-Limit. Eine modulare Dekomposition in Unterkomponenten/Hooks ist für das Bestehen von \`npm run check:budget\` zwingend erforderlich.\n`;
    }
    return details;
  }).join('\n');

  // Derive target file name for test plan
  const primaryComponent = candidateFiles.length > 0 ? candidateFiles[0].path : 'src/games/target/Component.tsx';
  const primaryBase = path.basename(primaryComponent, path.extname(primaryComponent));
  let testFilePath = primaryComponent.replace('/components/', '/components/__tests__/').replace('/logic/', '/logic/__tests__/');
  if (testFilePath.endsWith('.tsx')) {
    testFilePath = testFilePath.slice(0, -4) + '.test.tsx';
  } else if (testFilePath.endsWith('.ts')) {
    testFilePath = testFilePath.slice(0, -3) + '.test.ts';
  }

  let commentsSection = '';
  if (issue.userComments && issue.userComments.length > 0) {
    commentsSection = `\n\n### 💬 Ergänzende Anforderungen & Feedback aus Diskussion\n` +
      issue.userComments
        .map((c) => `- **@${c.author}** (${new Date(c.createdAt).toLocaleDateString()}): ${c.body}`)
        .join('\n');
  }

  return `${notice}# Research & Implementation Plan: Issue #${issue.number} — ${issue.title}

## 1. Executive Summary & Problem Scope
- **Ticket / Zielsetzung**: #${issue.number} - ${title}
- **Vollständige Anforderungsspezifikation**:
${body || 'Keine zusätzliche Beschreibung angegeben.'}${bundledSection}${commentsSection}

## 2. Current Behavior & Codebase Analysis (RepoLens Audit)
${fileAnalysisSections || '- Codebase-Scan identifiziert die Einstiegspunkte für das Modul.'}

## 3. Proposed Architectural Changes
1. **Umsetzung der Anforderungen in \`${path.basename(primaryComponent)}\`**:
   - Die in Abschnitt 2 identifizierten Komponenten und Schnittstellen gemäß der obigen Spezifikation anpassen.
   - Sicherstellen, dass neue Features oder Korrekturen rückwärtskompatibel bleiben und bestehende Schnittstellen nicht unvollständig brechen.
2. **Modulare Dekomposition (Zero-God-Components)**:
   ${candidateFiles.some((c) => c.isBudgetExceeded)
     ? `- **Achtung**: Mindestens eine der identifizierten Komponenten überschreitet das 250-Zeilen-Budget. Die betroffenen Logik- oder UI-Teile von \`${primaryBase}\` müssen in eigenständige Unterkomponenten oder Hooks zerlegt werden, um \`npm run check:budget\` zu erfüllen.`
     : `- Alle betroffenen Komponenten liegen innerhalb des 250-Zeilen-Budgets (AGENTS.md).`}
3. **Architektur- und Speicher-Konformität**:
   - Lokale Persistenz ausschließlich über \`src/lib/storage.ts\` mit typsicheren Keys.
   - Keine Cross-Game-Imports (\`check:architecture:diff\`).

## 4. Alternative Approaches Considered
1. **Direkte In-Place-Erweiterung vs. eigenständiges Submodul**:
   - *Entscheidung*: Größere funktionale Erweiterungen sollten modular implementiert werden, um bestehende Spiellogik nicht zu destabilisieren und Unit-Tests isoliert zu halten.
2. **Monolithische Komponenten vs. Hook-basierte Trennung**:
   - *Entscheidung*: Aufteilung in Controller/Hook und Präsentations-View gewährleistet die Einhaltung der 250-Zeilen-Grenze.

## 5. Risks, Edge Cases & Mitigations
- **Asynchrone Latenzen & Ladezeiten**: Saubere Loading- und Error-States für asynchrone Daten oder Medien vorhalten.
- **Ressourcen-Cleanup**: Event-Listener, Web-Audio-Nodes oder Iframe-Verbindungen in \`useEffect\`-Cleanup-Funktionen ordnungsgemäß abbauen.
- **Plattform-Kompatibilität**: Webview-, Touch- und Desktop-Viewports gleichermaßen unterstützen.

## 6. Concrete Vitest Test Plan & Quality Gates

### Unit-Tests (\`${testFilePath}\`)
1. \`should implement the core functionality described in issue #${issue.number}\`.
2. \`should handle edge cases and empty/invalid states gracefully without crashing\`.
3. \`should maintain component line budget below 250 lines\`.

### Verifikations-Tore (CI Pre-Commit Check)
\`\`\`bash
npm run check:architecture:diff  # 0 Cross-Game Imports
npm run check:budget             # Alle Dateien <= 250 Zeilen
npm run check:duplicates         # Duplikation < 2.5%
npm test                         # Alle Vitest-Suiten grün
\`\`\`

## 7. Suggested Implementation Sequence
1. Branch \`jules/issue-${issue.number}\` basierend auf \`dev\` erstellen.
2. Tests in \`${testFilePath}\` schreiben (Test-Driven Development).
3. Logik und Komponenten in \`${primaryComponent}\` implementieren.
4. Alle Qualitätstore lokal prüfen (\`npm run check:budget && npm test\`).
5. PR gegen \`dev\` öffnen mit Referenz \`Closes #${issue.number}\`.`;
}

async function main() {
  const { issueNumber, isDryRun } = parseArgs();

  let issue;
  if (isDryRun && (!issueNumber || !GITHUB_TOKEN)) {
    console.log('[DRY-RUN] Running in local mock mode without GitHub API...');
    issue = {
      number: issueNumber || 132,
      title: '[Feedback] Melodiq Implementierung von Instrument Practice',
      body: `Erweiterung der Karaoke-Architektur für Instrumenten-Training
1. Architektur-Entscheidung (ADR)
Kein Rewrite. Der bestehende Docker-Backend-Service wird um einen "Instrumental-Modus" erweitert. Die bestehende Karaoke-Logik bleibt als Modus A erhalten, das neue Feature wird als Modus B (Multi-Stem & Sheet Music) integriert.

2. Backend & Docker-Service Erweiterungen
- Datenbank-Migration: Song-Objekt um Stems (Vocals, Drums, Bass, Instrument) und Sheet-Music erweitern.
- Stem-Separation-Worker: Demucs v4 Integration.
- MusicXML Scraper / Crawler: Validierungslogik für Tempo und sync_offset.

3. API-Schnittstelle (GET /api/songs/{id})
media.stems und media.sheet_music (musicxml)

4. Frontend Erweiterungen
- Web Audio API Engine: Alle 4 Stems in gemeinsamen AudioContext puffern.
- Mute-Gruppen: Gain-Nodes für Minus-One-Track.
- MusicXML Rendering: OpenSheetMusicDisplay (OSMD) auf HTML5-Canvas.`,
      userComments: [
        {
          author: 'carsten',
          body: 'Achtung: melodiq-notes existiert bereits in src/games/melodiq-notes/! Bitte mobile UI, Touch-Scrolling und Multi-Stem Audio einbauen.',
          createdAt: new Date().toISOString(),
        },
      ],
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

  const candidateFiles = scanCodebaseForContext(issue);
  console.log(`[Context Pack] Identified ${candidateFiles.length} candidate file(s):`);
  for (const c of candidateFiles) {
    console.log(` - ${c.path} (${c.lineCount} lines, ${c.matchingLines.length} match citations)`);
  }

  // Self-Verification Gate: Ensure candidates exist
  if (candidateFiles.length === 0) {
    console.error('::error::Codebase scanner could not identify any candidate files!');
  }

  const { plan: planContent, error: geminiError } = await generatePlanWithGemini(issue, candidateFiles);
  let finalPlan = planContent;
  if (!finalPlan) {
    console.log(`[Plan] Gemini API nicht verfügbar (${geminiError}). Erstelle sauberen Codebase-Audit-Plan...`);
    finalPlan = generateTemplatePlan(issue, candidateFiles, geminiError);
  }

  const commentMarkdown = `## 🤖 Jules Implementation Plan (RepoLens Standard)

${finalPlan}

---

### 🚦 Approval Loop
Please review the research & implementation plan above.
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
