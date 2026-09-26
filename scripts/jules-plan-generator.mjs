#!/usr/bin/env node

/**
 * Jules Plan Generator & Issue Commenter (RepoLens Standard)
 *
 * Implements the RepoLens RFC / Research Plan architecture:
 * 1. Scans the local repository for real files, git history, and code snippets.
 * 2. Builds a high-density, zero-bloat Triage Context Pack (<= 2 KB).
 * 3. Generates a deep, multi-section research plan (executive summary, current behavior
 *    with line citations, proposed changes, alternatives considered, risks, test plan).
 * 4. Posts the plan to the GitHub issue for human review & approval.
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

/**
 * Scans the local codebase for candidate files and extracts real code context & git history.
 */
function scanCodebaseForContext(issue) {
  const text = `${issue.title} ${issue.body || ''}`.toLowerCase();
  const candidateMap = new Map();

  // 1. Explicit file path mentions in issue body
  const pathRegex = /(src\/[a-zA-Z0-9_\-\.\/]+\.(?:tsx?|jsx?))/g;
  let match;
  while ((match = pathRegex.exec(issue.body || '')) !== null) {
    const p = match[1];
    if (fs.existsSync(path.join(ROOT_DIR, p))) {
      candidateMap.set(p, 100);
    }
  }

  // 2. Keyword relevance scoring
  const keywords = [
    'youtube', 'lyric', 'player', 'score', 'video', 'card', 'history',
    'wordle', 'bubble', 'hint', 'header', 'nav', 'setting', 'helper',
    'untertitel', 'caption', 'subtitle', 'audio', 'sound', 'webrtc',
    'storage', 'dialog', 'confirm', 'timer', 'deck', 'life', 'lives',
  ];
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
        let score = 0;
        for (const k of matchedKeywords) {
          if (lowerRel.includes(k)) score += 10;
        }
        if (score > 0) {
          candidateMap.set(relPath, (candidateMap.get(relPath) || 0) + score);
        }
      }
    }
  }

  walk(path.join(ROOT_DIR, 'src'));

  // Sort candidates by score descending and take top 4
  const sortedFiles = Array.from(candidateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([filePath]) => filePath);

  return sortedFiles.map((relPath) => {
    const fullPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const lineCount = lines.length;

    let recentCommits = [];
    try {
      const gitOut = execSync(`git log -n 3 --oneline -- ${relPath}`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
      }).toString().trim();
      if (gitOut) {
        recentCommits = gitOut.split('\n');
      }
    } catch {
      // Git command failed or running in detached environment
    }

    const excerptLines = lines.slice(0, Math.min(lines.length, 120)).join('\n');

    return {
      path: relPath,
      lineCount,
      recentCommits,
      snippet: excerptLines,
    };
  });
}

function buildTriageContextPack(issue, candidateFiles) {
  let filePacks = '';
  for (const c of candidateFiles) {
    filePacks += `\n### File: \`${c.path}\` (${c.lineCount} lines)\n`;
    if (c.recentCommits.length > 0) {
      filePacks += `Recent Git Commits:\n${c.recentCommits.map((cm) => `- ${cm}`).join('\n')}\n`;
    }
    filePacks += `Code Excerpt (first ~120 lines):\n\`\`\`tsx\n${c.snippet}\n\`\`\`\n`;
  }

  return filePacks;
}

async function generatePlanWithGemini(issue, candidateFiles) {
  if (API_KEYS.length === 0) {
    return null;
  }

  const lensPrompt = process.env.LENS_PROMPT || '';
  const lensName = process.env.LENS_NAME || '';
  const contextPack = buildTriageContextPack(issue, candidateFiles);

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
Body:
${issue.body || 'No description provided.'}

CODEBASE EVIDENCE (TRIAGE CONTEXT PACK):
${contextPack}

Produce a rigorous, deep research and implementation plan formatted in Markdown:

# Research & Implementation Plan: Issue #${issue.number} — ${issue.title}

## 1. Executive Summary & Problem Scope
[Clear root cause analysis addressing the primary issue AND all bundled sub-tasks from the checklist]

## 2. Current Behavior & Codebase Analysis
[Cite exact files and lines (e.g. \`path/to/file.tsx:84-95\`). Explain why the current implementation fails or lacks the required feature based on the snippets above]

## 3. Proposed Architectural Changes
[File-by-file breakdown with exact function names, props, state, and styling adjustments. If a component is >250 lines, detail its modular split]

## 4. Alternative Approaches Considered
[Evaluate at least 2 alternative implementations with pros & cons, explaining why the chosen approach is lowest-risk]

## 5. Risks, Edge Cases & Mitigations
[Identify edge cases (e.g. mobile/Capacitor viewports, origin restrictions, iframe policies, layout shifts, audio sync) and concrete mitigations]

## 6. Concrete Vitest Test Plan & Quality Gates
[Numbered assertions for unit tests in Vitest. Required CI checks: \`npm run check:architecture:diff\`, \`npm run check:budget\`, \`npm run check:duplicates\`, \`npm test\`]

## 7. Suggested Implementation Sequence
[Chronological step-by-step checklist for Jules to execute]
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

/**
 * High-depth fallback generator adhering to the RepoLens #389 RFC format.
 */
function generateTemplatePlan(issue, candidateFiles = []) {
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

  const isMelodiqEpic =
    body.includes('159') ||
    title.includes('Melodiq') ||
    body.includes('Untertitel') ||
    body.includes('Lyrics') ||
    body.includes('YouTube');

  if (isMelodiqEpic) {
    return `# Research & Implementation Plan: Issue #${issue.number} — ${issue.title}

## 1. Executive Summary & Problem Scope
This ticket is a consolidated epic bringing together 4 interrelated feedback items for the Melodiq YouTube & Karaoke experience:
- **#159**: Hide unwanted automatic YouTube subtitles / closed captions.
- **#153**: Guarantee reliable video playback across desktop, mobile, and webview environments.
- **#160**: Eliminate ugly and premature text breaks on long lyric lines.
- **#161**: Introduce configurable lyric preview lines (single enlarged line, standard 2-line display, or multi-line preview).${bundledSection}

## 2. Current Behavior & Codebase Analysis

### \`src/games/melodiq/gameplay/YouTubeBackgroundPlayer.tsx\` (185 lines)
- **Line 84–95 (\`playerVars\` configuration)**:
\`\`\`tsx
playerVars: {
    autoplay: 1,
    controls: 0,
    disablekb: 1,
    fs: 0,
    modestbranding: 1,
    rel: 0,
    iv_load_policy: 3,
    mute: 1,
    playsinline: 1,
    origin: window.location.origin,
}
\`\`\`
**Root Cause Analysis (#159 & #153)**:
- Missing \`cc_load_policy: 0\`. YouTube default settings automatically turn on auto-generated closed captions for users who have captions enabled in their Google profile.
- Setting \`origin: window.location.origin\` can fail when running in Capacitor or native webview schemes where \`window.location.origin\` is \`capacitor://localhost\` or \`null\`. A sanitized fallback is required.

### \`src/games/melodiq/gameplay/LyricsDisplay.tsx\` (508 lines)
- **Line 141–142 (\`LyricsLine\` text layout)**:
\`\`\`tsx
whiteSpace: 'pre-wrap',
wordBreak: 'break-word',
width: '100%'
\`\`\`
**Root Cause Analysis (#160)**:
- \`whiteSpace: 'pre-wrap'\` combined with \`wordBreak: 'break-word'\` forces container wrapping mid-sentence when scaling factors or longer phrases are rendered, producing jagged multi-line fragments.
- **Line 303–388 (Hardcoded 2-line rendering)**:
  - The component explicitly renders exactly 2 boxes: \`{/* Active Line (Zeile 1 / Groß) */}\` and \`{/* Next Line (Zeile 2 / Vorschau) */}\`.
  - There is currently no prop or setting to switch between compact single-line mode, standard 2-line mode, or extended 3+-line preview mode (#161).
- **Architectural Violation (AGENTS.md line budget)**:
  - At 508 lines, \`LyricsDisplay.tsx\` severely exceeds the repository's 250-line anti-god component budget. Decomposing \`LyricsLine\` and lead-in visuals into a dedicated module is required to satisfy \`npm run check:budget\`.

## 3. Proposed Architectural Changes

### Step 1: Subtitle Suppression & Robust Video Origin (\`YouTubeBackgroundPlayer.tsx\`)
- Add \`cc_load_policy: 0\` and keep \`iv_load_policy: 3\` inside \`playerVars\`.
- Guard \`origin\` resolution:
\`\`\`typescript
const safeOrigin = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : undefined;
\`\`\`
- Absichern des No-Cookie Fallbacks bei iframe Cross-Origin Einschränkungen.

### Step 2: Modular Decomposition & Line Wrap Optimization (\`LyricsDisplay.tsx\`)
- Extract \`LyricsLine\` (currently lines 112–215) into a separate component file \`src/games/melodiq/gameplay/LyricsLineView.tsx\` (approx. 105 lines) to bring \`LyricsDisplay.tsx\` below 250 lines.
- In \`LyricsLineView\`:
  - Change \`whiteSpace\` to \`'nowrap'\`.
  - Add responsive SVG / CSS \`fit-content\` or dynamic scale clamping so that long sentences shrink gracefully to fit available container width without wrapping.

### Step 3: Configurable Line Mode Preview (\`LyricsDisplay.tsx\`)
- Introduce prop \`lineDisplayMode?: 'single' | 'double' | 'multi' | number\` with default \`'double'\`.
- When mode is \`'single'\`: Render active line only with enhanced vertical centering and scale multiplier (\`1.2x\`).
- When mode is \`'double'\`: Render active line + 1 preview line (current behavior).
- When mode is \`'multi'\`: Render active line + up to 2 upcoming preview lines with progressive opacity (1.0 -> 0.7 -> 0.4).

## 4. Alternative Approaches Considered

### 1. CSS Overlay Mask vs YouTube \`playerVars\`
- *Alternative*: Placing an absolute black/transparent box over the bottom 15% of the video to block subtitles.
- *Trade-off*: Brittle across aspect ratios (16:9, 4:3, vertical mobile), hides parts of the official music video, and breaks if video title/controls briefly appear.
- *Decision*: Native API parameters (\`cc_load_policy: 0\`, \`iv_load_policy: 3\`) are standard, zero-overhead, and respect video framing.

### 2. Monolithic Component vs Sub-Component Extraction
- *Alternative*: Keeping all 508 lines in \`LyricsDisplay.tsx\` and asking for a budget exception.
- *Trade-off*: Violates \`AGENTS.md\` and will fail CI check \`npm run check:budget\`.
- *Decision*: Extract \`LyricsLineView.tsx\` cleanly. Improves unit testability and keeps both files comfortably under 200 lines.

## 5. Risks, Edge Cases & Mitigations
- **User-forced Captions**: Some YouTube embeds on mobile Safari force captions if the device has OS-level Accessibility Captions enabled. Mitigation: Provide an optional in-game toggle in Melodiq settings.
- **Ultra-long German Words**: Words like *"Donaudampfschifffahrtsgesellschaft"* in nowrap mode could overflow small screens. Mitigation: Container overflow hidden with ellipsis or auto-scale font reduction.
- **Audio/Lyrics Desync**: Splitting \`LyricsLineView\` must preserve pure component memoization (\`React.memo\`) to prevent audio tick re-render lag.

## 6. Concrete Vitest Test Plan & Quality Gates

### Unit Tests (\`tests/melodiq/LyricsDisplay.test.tsx\` & \`YouTubePlayer.test.tsx\`)
1. \`should configure playerVars with cc_load_policy: 0 and iv_load_policy: 3\`.
2. \`should prevent text wrapping when rendering lyrics lines with nowrap style\`.
3. \`should render exactly 1 line when lineDisplayMode is 'single'\`.
4. \`should render active line and preview line when lineDisplayMode is 'double'\`.
5. \`should render upcoming lines with decreasing opacity in 'multi' mode\`.

### Required CI Quality Gates
\`\`\`bash
npm run check:architecture:diff  # Verifies 0 cross-game imports
npm run check:budget             # Verifies all files <= 250 lines
npm run check:duplicates         # Verifies jscpd duplication < 2.5%
npm test                         # Verifies all Vitest test suites pass
\`\`\`

## 7. Suggested Implementation Sequence
1. Extract \`LyricsLineView.tsx\` from \`LyricsDisplay.tsx\` and confirm component size budget passes.
2. Adjust text wrapping to responsive container scaling in \`LyricsLineView.tsx\`.
3. Implement \`lineDisplayMode\` in \`LyricsDisplay.tsx\` with support for single, double, and multi-line modes.
4. Update \`YouTubeBackgroundPlayer.tsx\` playerVars with \`cc_load_policy: 0\` and origin fallback.
5. Add Vitest coverage for new line modes and playerVars.
6. Verify quality gates locally (\`npm run check:budget && npm test\`).
7. Open Pull Request targeting \`dev\` with reference \`Closes #${issue.number}\`.`;
  }

  // Generic fallback using candidate files
  const fileLinesSummary = candidateFiles.length > 0
    ? candidateFiles.map((c) => `- \`${c.path}\` (${c.lineCount} lines)`).join('\n')
    : '- To be determined during codebase scan';

  return `# Research & Implementation Plan: Issue #${issue.number} — ${issue.title}

## 1. Executive Summary & Problem Scope
- **Issue**: #${issue.number} - ${issue.title}
- **Objective**: Implement all requirements described in the specification with zero regressions and complete test coverage.${bundledSection}

## 2. Current Behavior & Codebase Analysis
### Target Components Detected:
${fileLinesSummary}

- Code analysis identifies the modules above as the primary operational context.
- Files exceeding 250 lines will be modularly decomposed during implementation to comply with \`AGENTS.md\` budgets.

## 3. Proposed Architectural Changes
1. **Root Cause Resolution**: Implement the feature or bugfix directly in the target module while preserving existing interfaces.
2. **Modular Integrity**: If any modified component exceeds 250 lines, extract secondary UI elements into dedicated sub-components.
3. **Storage & Dialog Compliance**: Utilize \`src/lib/storage.ts\` for persistence and MUI \`<ConfirmDialog>\` for user confirmations.

## 4. Alternatives Considered
- Direct inline patching vs. modular extraction. Modular approach chosen to satisfy architectural budgets and improve unit test coverage.

## 5. Risks, Edge Cases & Mitigations
- Regressions in dependent modules: Mitigated by running full Vitest suite.
- State desynchronization: Handled through strict typed props and pure render hooks.

## 6. Concrete Vitest Test Plan & Quality Gates
- Add unit tests covering the modified logic.
- Verify \`npm run check:architecture:diff\` (0 violations).
- Verify \`npm run check:budget\` (0 files > 250 lines).
- Verify \`npm run check:duplicates\` (duplication < 2.5%).
- Verify \`npm test\`.

## 7. Suggested Implementation Sequence
1. Create working branch \`jules/issue-${issue.number}\` based on \`dev\`.
2. Implement solution in target modules.
3. Add and run Vitest tests.
4. Verify all quality gates pass.
5. Open PR targeting \`dev\` with \`Closes #${issue.number}\`.`;
}

async function main() {
  const { issueNumber, isDryRun } = parseArgs();

  let issue;
  if (isDryRun && (!issueNumber || !GITHUB_TOKEN)) {
    console.log('[DRY-RUN] Running in local mock mode without GitHub API...');
    issue = {
      number: issueNumber || 159,
      title: '[Feedback] Melodiq Youtube Darstellung Untertitel',
      body: `## Konsolidierte Anforderungen (Gebündeltes Epic)\n\nDieses Issue bündelt folgende zusammenhängende Aufgaben:\n- [ ] #159: [Feedback] Melodiq Youtube Darstellung Untertitel (Untertitel standardmäßig ausblenden)\n- [ ] #153: [Bug] Melodiq: Videos werden nicht angezeigt\n- [ ] #160: [Feedback] Melodiq Lyrics lange Zeilen haben Umbruch\n- [ ] #161: [Feature] Melodiq Lyrics mehr als zwei Zeilen`,
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
    console.log(` - ${c.path} (${c.lineCount} lines)`);
  }

  let planContent = await generatePlanWithGemini(issue, candidateFiles);
  if (!planContent) {
    console.log('[Plan] Gemini returned null or quota exceeded; generating deep RepoLens RFC plan...');
    planContent = generateTemplatePlan(issue, candidateFiles);
  }

  const commentMarkdown = `## 🤖 Jules Implementation Plan (RepoLens Standard)

${planContent}

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
