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

async function generatePlanWithGemini(issue, agentsRules) {
  if (API_KEYS.length === 0) {
    return null;
  }

  const prompt = `You are the lead software architect for the LocalGameGalaxy repository.
A GitHub issue has been requested to be solved by Google Jules.
Notice: This issue may be a consolidated epic containing multiple sub-requirements in its description checklist.
Before any code is modified, you must provide a concrete, step-by-step implementation plan that addresses the primary issue AND ALL bundled sub-requirements for human review and approval.

Project Rules from AGENTS.md:
${agentsRules.slice(0, 3000)}

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

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

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

function generateTemplatePlan(issue) {
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

  return `### 📋 Proposed Solution & Scope
- **Issue**: #${issue.number} - ${issue.title}
- **Objective**: Implement all requirements described in the issue specification and all bundled sub-tasks.${bundledSection}

### 🛠️ Step-by-Step Implementation Plan
1. **Analyze Codebase**: Identify components, modules, or tests associated with this issue and its bundled sub-requirements.
2. **Implement Solution**: Apply changes adhering to \`AGENTS.md\` standards (anti-god component size limit of 250 lines, modular separation).
3. **Add Tests**: Write unit tests in Vitest covering all modified and new features.
4. **Local Verification**: Verify with \`npm run check:architecture:diff\`, \`npm run check:budget\`, \`npm test\`, and \`npm run build\`.
5. **Open Pull Request**: Create branch \`jules/issue-${issue.number}\` based on \`dev\` and open PR targeting \`dev\`.

### 📁 Target Files
- To be determined by Jules during repository scan.

### 🧪 Verification & Testing Strategy
- Run unit test suite: \`npm test\`
- Verify architecture boundaries: \`npm run check:architecture:diff\`
- Verify component size budgets: \`npm run check:budget\`

### ⚠️ Architectural Constraints
- Components must remain ≤ 250 lines.
- No cross-game imports.
- Use \`src/lib/storage.ts\` (never raw \`localStorage\`).
- Use MUI \`<ConfirmDialog>\` (never \`window.confirm()\`).`;
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

  let planContent = await generatePlanWithGemini(issue, agentsRules);
  if (!planContent) {
    planContent = generateTemplatePlan(issue);
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
