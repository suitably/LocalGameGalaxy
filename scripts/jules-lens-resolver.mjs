#!/usr/bin/env node

/**
 * Jules RepoLens Resolver & Prompt Assembler
 *
 * Dynamically resolves any lens from TheMorpheus407/RepoLens (or a custom fork),
 * parses its expert instructions, combines them with AGENTS.md, and prepares
 * the optimal prompt for Google Jules.
 *
 * Usage:
 *   node scripts/jules-lens-resolver.mjs --lens <lens_id>
 *   node scripts/jules-lens-resolver.mjs --domain <domain_name>
 *   node scripts/jules-lens-resolver.mjs --list
 *   node scripts/jules-lens-resolver.mjs --lens single-responsibility --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DEFAULT_REPO = process.env.REPOLENS_REPO || 'TheMorpheus407/RepoLens';
const DEFAULT_BRANCH = process.env.REPOLENS_BRANCH || 'master';
const LOCAL_REPOLENS_DIR = path.join(ROOT_DIR, '.repolens');

function parseArgs() {
  const args = process.argv.slice(2);
  let lens = null;
  let domain = null;
  let repo = DEFAULT_REPO;
  let branch = DEFAULT_BRANCH;
  let mode = 'fix';
  let isDryRun = false;
  let isList = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lens' && args[i + 1]) {
      lens = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === '--domain' && args[i + 1]) {
      domain = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === '--repo' && args[i + 1]) {
      repo = args[i + 1].trim();
      i++;
    } else if (args[i] === '--branch' && args[i + 1]) {
      branch = args[i + 1].trim();
      i++;
    } else if (args[i] === '--mode' && args[i + 1]) {
      mode = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === '--dry-run') {
      isDryRun = true;
    } else if (args[i] === '--list') {
      isList = true;
    }
  }

  return { lens, domain, repo, branch, mode, isDryRun, isList };
}

async function fetchRawFile(relativePath) {
  const localPath = path.join(LOCAL_REPOLENS_DIR, relativePath);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath, 'utf8');
  }
  throw new Error(`Local lens file not found: ${localPath}`);
}

async function loadDomainsRegistry() {
  try {
    const content = await fetchRawFile('config/domains.json');
    return JSON.parse(content);
  } catch (err) {
    console.warn('Could not load local config/domains.json:', err.message);
    return { domains: [] };
  }
}

function parseLensMarkdown(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const metadata = {};
  let body = content;

  if (frontmatterMatch) {
    const rawYaml = frontmatterMatch[1];
    body = frontmatterMatch[2].trim();

    for (const line of rawYaml.split('\n')) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        metadata[key] = val;
      }
    }
  }

  return { metadata, body };
}

function readAgentsRules() {
  const agentsPath = path.join(ROOT_DIR, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    return fs.readFileSync(agentsPath, 'utf8');
  }
  return '';
}

async function resolveLensPath(requestedLens, requestedDomain, registry) {
  // If user specified domain/lens (e.g. "architecture/single-responsibility")
  if (requestedLens && requestedLens.includes('/')) {
    const [d, l] = requestedLens.split('/');
    return { domain: d, lensId: l, relativePath: `prompts/lenses/${d}/${l}.md` };
  }

  // If specific lens is given, find its domain in domains.json
  if (requestedLens) {
    for (const d of registry.domains || []) {
      if (d.lenses && d.lenses.includes(requestedLens)) {
        return { domain: d.id, lensId: requestedLens, relativePath: `prompts/lenses/${d.id}/${requestedLens}.md` };
      }
    }
    // If not found in registry, try searching under requested domain
    if (requestedDomain) {
      return { domain: requestedDomain, lensId: requestedLens, relativePath: `prompts/lenses/${requestedDomain}/${requestedLens}.md` };
    }
    // Default fallback to architecture
    return { domain: 'architecture', lensId: requestedLens, relativePath: `prompts/lenses/architecture/${requestedLens}.md` };
  }

  // If only domain is given, pick the primary lens of that domain
  if (requestedDomain) {
    const d = (registry.domains || []).find((entry) => entry.id === requestedDomain);
    if (d && d.lenses && d.lenses.length > 0) {
      const primaryLens = d.lenses[0];
      return { domain: d.id, lensId: primaryLens, relativePath: `prompts/lenses/${d.id}/${primaryLens}.md` };
    }
    return { domain: requestedDomain, lensId: requestedDomain, relativePath: `prompts/lenses/${requestedDomain}/${requestedDomain}.md` };
  }

  // Default fallback: single-responsibility in architecture
  return { domain: 'architecture', lensId: 'single-responsibility', relativePath: 'prompts/lenses/architecture/single-responsibility.md' };
}

async function main() {
  const { lens, domain, mode, isDryRun, isList } = parseArgs();
  const registry = await loadDomainsRegistry();

  if (isList) {
    console.log(`\n=== Local RepoLens Registry ===\n`);
    for (const d of registry.domains || []) {
      console.log(`📁 Domain: ${d.name || d.id} (${d.id}) - ${d.lenses?.length || 0} lenses`);
      if (d.lenses && d.lenses.length > 0) {
        console.log(`   Lenses: ${d.lenses.join(', ')}`);
      }
      console.log('');
    }
    return;
  }

  const resolved = await resolveLensPath(lens, domain, registry);
  console.log(`Resolving RepoLens lens: ${resolved.domain}/${resolved.lensId}...`);

  let lensRaw;
  try {
    lensRaw = await fetchRawFile(resolved.relativePath);
  } catch (err) {
    console.error(`Error: Could not load lens at ${resolved.relativePath}: ${err.message}`);
    process.exit(1);
  }

  const { metadata, body } = parseLensMarkdown(lensRaw);
  const lensName = metadata.name || resolved.lensId;
  const lensRole = metadata.role || `${resolved.lensId} Specialist`;
  const agentsRules = readAgentsRules();

  const prompt = `You are an elite software auditor executing the official RepoLens Audit Suite for LocalGameGalaxy.

${mode === 'plan' ? `
🤖 AUDIT & PLAN MODE: ISSUE GENERATION
YOUR MISSION IS TO AUDIT THE CODEBASE AND CREATE ISSUES FOR YOUR FINDINGS.

=== PLANNING PHASE ===
- Step 1: Scan the repository through the criteria of this RepoLens lens (${resolved.lensId}).
- Step 2: Identify ALL critical architectural issues, violations, or code smells matching this lens.
- Step 3: For EACH individual finding, create a distinct, detailed GitHub Issue.
- Step 4: To create these issues, you MUST write them as markdown files in the \`docs/tasks/github-issues/\` directory. Format the content clearly with title and description.
- Step 5: If available, you can execute \`node scripts/create_github_issues.mjs\` or use the \`gh\` CLI to actually publish them.
- DO NOT WRITE FIX CODE OR CREATE A PULL REQUEST IN THIS MODE. Your only job is to create the audit issues so the team can approve/schedule them.
` : mode === 'review' ? `
🤖 MULTI-AGENT PR REVIEW MODE
- Step 1: You are a PR Reviewer. Target PR: #\${process.env.PR_NUMBER}.
- Step 2: Use \`gh pr diff \${process.env.PR_NUMBER}\\\` to download and read the code changes.
- Step 3: Analyze the PR strictly through the criteria of this RepoLens lens (${resolved.lensId}).
- Step 4: Submit your review using the GitHub CLI:
  - If you find issues: \`gh pr review \${process.env.PR_NUMBER} --request-changes -b "<your markdown review>"\\\`
  - If the code is perfect: \`gh pr review \${process.env.PR_NUMBER} --approve -b "Approved from ${resolved.lensId} perspective. No issues found."\\\`
- DO NOT MODIFY ANY SOURCE FILES. DO NOT CREATE A PULL REQUEST YOURSELF. Your only job is to review and submit the formal approval or change request.
` : `
⚡ YOLO MODE: MAXIMUM AUTONOMOUS EXECUTION ENGAGED
- DO NOT ASK FOR CONFIRMATION, APPROVAL, OR INTERMEDIATE FEEDBACK AT ANY POINT.
- YOU HAVE FULL PROACTIVE AUTHORITY: You are authorized and REQUIRED to make all implementation and architectural decisions autonomously.
- Proceed continuously to complete the work, run Vitest tests, and open the Pull Request against 'dev'.
`}

You are operating under the following specialized RepoLens expert persona:

Role: ${lensRole}
Domain: ${resolved.domain}
Lens ID: ${resolved.lensId}
Lens Name: ${lensName}

================== REPOLENS EXPERT FOCUS & INVESTIGATION ==================
${body}
==========================================================================

MANDATORY REPOSITORY RULES (from AGENTS.md):
- Anti-God-Component Architecture: Maximum 250 lines per .tsx component. Extract sub-components and custom hooks if approaching or exceeding.
- No cross-game imports: src/games/<A> must NEVER import from src/games/<B>.
- Storage: Use src/lib/storage.ts with STORAGE_KEYS. Never raw localStorage or sessionStorage.
- Dialogs: Use MUI <Dialog> or <ConfirmDialog>. Never native window.confirm() or alert().
- Strict TypeScript: No 'any'. Use discriminated unions for state.
- Target Branch: Your base branch is 'dev'. Open a Pull Request targeting 'dev'.
- Verification: Before finishing, run 'npm run check:architecture:diff', 'npm run check:budget', 'npm test', and 'npm run build'.

YOUR AUDIT MISSION:
1. Scan the LocalGameGalaxy repository strictly through the criteria of this RepoLens lens (${resolved.lensId}).
2. ${mode === 'plan' ? 'Identify ALL critical issues / smells matching this lens.' : 'Identify the single most critical or impactful issue / smell matching this lens.'}
3. ${
    mode === 'plan'
      ? 'Do not modify source code files. Instead, create separate markdown files in docs/tasks/github-issues/ for each finding, then use the provided tools (or script) to publish them as GitHub issues.'
      : mode === 'review'
      ? 'DO NOT MODIFY ANY FILES. Your only goal is to review the Pull Request diff and submit a review using the gh cli.'
      : 'Implement the fix cleanly, adhere strictly to all AGENTS.md rules, run verification commands (npm test, npm run check:budget), and open a Pull Request targeting the dev branch. Include a full explanation of the RepoLens finding in the PR description.'
  }
`;

  if (isDryRun) {
    console.log('\n================== [ASSEMBLED JULES PROMPT] ==================\n');
    console.log(prompt);
    console.log('==============================================================\n');
    return;
  }

  // Export outputs for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const delimiter = 'EOF_' + Math.random().toString(36).substring(2);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `prompt<<${delimiter}\n${prompt}\n${delimiter}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `lens_id=${resolved.lensId}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `lens_name=${lensName}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `domain=${resolved.domain}\n`);
  }

  console.log(`Successfully assembled prompt for lens '${resolved.domain}/${resolved.lensId}'.`);
}

main().catch((err) => {
  console.error('Fatal error resolving lens:', err);
  process.exit(1);
});
