#!/usr/bin/env node

/**
 * Issue Curator & Auto-Bundling Engine for LocalGameGalaxy
 *
 * Automates issue triage, semantic duplicate detection, and 1-click bundling/merging
 * using Gemini and GitHub REST API with 0% local load.
 *
 * Supported Commands (via issue comment or CLI):
 *   /curate          - Scans the issue against all open issues, detects duplicates/clusters, suggests bundle
 *   /bundle #A #B    - Merges issues #A, #B into the current issue, cross-links them, and closes #A, #B
 *   /duplicate #A    - Marks current issue as duplicate of #A, cross-links, and closes it
 *   /curate-all      - Analyzes and clusters ALL open issues across the repository
 *
 * Usage:
 *   node scripts/issue-curator.mjs --issue <number> --action <curate|bundle|duplicate|curate-all> [--targets 153,160,161]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'suitably/LocalGameGalaxy';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function parseArgs() {
  const args = process.argv.slice(2);
  let issueNumber = null;
  let action = 'curate';
  let targets = [];
  const isDryRun = args.includes('--dry-run');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--issue' && args[i + 1]) {
      issueNumber = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--action' && args[i + 1]) {
      action = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--targets' && args[i + 1]) {
      targets = args[i + 1]
        .split(/[,\s]+/)
        .map((s) => s.replace('#', '').trim())
        .filter(Boolean)
        .map((n) => Number.parseInt(n, 10))
        .filter((n) => !Number.isNaN(n));
      i++;
    }
  }

  if (!issueNumber && process.env.ISSUE_NUMBER) {
    issueNumber = Number.parseInt(process.env.ISSUE_NUMBER, 10);
  }

  return { issueNumber, action, targets, isDryRun };
}

async function fetchGitHub(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
    'User-Agent': 'lgg-issue-curator',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API error (${res.status} ${res.statusText}) on ${endpoint}: ${errText}`);
  }
  return res.json();
}

async function getAllOpenIssues() {
  const issues = [];
  let page = 1;
  while (true) {
    const batch = await fetchGitHub(`/issues?state=open&per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    // Exclude pull requests
    const onlyIssues = batch.filter((item) => !item.pull_request);
    issues.push(...onlyIssues);
    if (batch.length < 100) break;
    page++;
  }
  return issues;
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

async function updateIssue(issueNumber, patch) {
  return fetchGitHub(`/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
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
 * Calls Gemini using GEMINI_API_KEY if configured
 */
async function queryGemini(prompt, systemInstruction = '') {
  if (!GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY configured. Proceeding with fast local rule-based analysis.');
    return null;
  }

  const models = [
    'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };
      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(`Model ${model} returned status ${response.status}.`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn(`Error querying model ${model}:`, err.message);
    }
  }

  return null;
}

/**
 * Analyzes an issue against all other open issues
 */
async function analyzeIssue(issueNumber) {
  console.log(`[Curator] Analyzing issue #${issueNumber}...`);
  const currentIssue = await getIssueDetails(issueNumber);
  const allIssues = await getAllOpenIssues();
  const candidateIssues = allIssues.filter((i) => i.number !== issueNumber);

  if (candidateIssues.length === 0) {
    return { currentIssue, candidateIssues: [], analysis: null };
  }

  const prompt = `You are the lead issue curator and repository architect for LocalGameGalaxy.
Analyze this target issue against all other open issues in the repository.

TARGET ISSUE:
#${currentIssue.number}: ${currentIssue.title}
Labels: ${(currentIssue.labels || []).map((l) => l.name).join(', ')}
Body:
${currentIssue.body || '(empty)'}

OTHER OPEN ISSUES (${candidateIssues.length}):
${candidateIssues
  .map(
    (i) =>
      `#${i.number}: ${i.title}\nBody: ${(i.body || '').slice(0, 300).replace(/\n/g, ' ')}\n---`,
  )
  .join('\n')}

TASKS:
1. Identify if this issue is an exact or near duplicate of any other open issue.
2. Identify which other open issues belong to the exact same component, game, or feature cluster (e.g. Melodiq Lyrics, Melodiq Phone Companion, Wordle, Cards, Navigation/Header, Server/Docker).
3. Recommend whether to:
   - "duplicate": mark as duplicate of an existing issue and close.
   - "bundle": merge multiple related issues into one consolidated task/epic.
   - "standalone": keep as a standalone issue.
4. If "bundle", propose the lead issue and the list of issue numbers to combine, plus a clear consolidated title.
5. Suggest the most relevant RepoLens audit lens from TheMorpheus407/RepoLens:
   - "duplication" (code clones, DRY violations)
   - "i18n" (translations, locale missing)
   - "architecture" (modular boundaries, god components)
   - "state-architecture" (state sync, storage, reactive flow)
   - "ux-antipatterns" (navigation, buttons, mobile UI flow)
   - "security" (auth, session, injection, secrets)
   - "testing" (unit test gaps)

RESPOND ONLY WITH VALID JSON (no markdown formatting, no code fence):
{
  "isDuplicate": boolean,
  "duplicateOf": number | null,
  "confidenceScore": number,
  "clusterName": string,
  "suggestedRepoLens": string | null,
  "relatedIssueNumbers": number[],
  "recommendation": "duplicate" | "bundle" | "standalone",
  "reason": string,
  "suggestedBundleNumbers": number[],
  "suggestedEpicTitle": string
}`;

  const geminiResponse = await queryGemini(prompt, 'Respond only with strict JSON.');
  let analysis = null;

  if (geminiResponse) {
    try {
      const cleanJson = geminiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('Failed to parse Gemini JSON response:', e.message);
    }
  }

  // Fallback heuristic if Gemini not available
  if (!analysis) {
    const stopWords = new Set(['feedback', '[feedback]', 'von', 'und', 'der', 'die', 'das', 'fuer', 'für', 'den', 'dem', 'des', 'auf', 'mit', 'ein', 'eine', 'einen', 'nach', 'nicht', 'mehr', 'haben']);
    const titleWords = currentIssue.title
      .toLowerCase()
      .replace(/[\[\]]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const related = candidateIssues.filter((i) => {
      const otherTitle = i.title.toLowerCase();
      return titleWords.some((w) => otherTitle.includes(w));
    });
    analysis = {
      isDuplicate: false,
      duplicateOf: null,
      confidenceScore: 0.5,
      clusterName: titleWords[0] ? titleWords[0].toUpperCase() : 'Thematisch Verwandt',
      suggestedRepoLens: 'duplication',
      relatedIssueNumbers: related.map((r) => r.number),
      recommendation: related.length > 0 ? 'bundle' : 'standalone',
      reason: 'Heuristische Schlüsselwort-Übereinstimmung gefunden.',
      suggestedBundleNumbers: related.map((r) => r.number),
      suggestedEpicTitle: `Cluster: ${currentIssue.title}`,
    };
  }

  return { currentIssue, candidateIssues, analysis };
}

/**
 * Curates a single issue: looks for duplicates and topic clusters among all open issues.
 */
async function curateIssue(issueNumber, isDryRun) {
  const { currentIssue, candidateIssues, analysis } = await analyzeIssue(issueNumber);

  if (!analysis) {
    console.log('[Curator] No other open issues found.');
    return;
  }

  // Build Markdown Comment
  const relatedList = analysis.relatedIssueNumbers
    .map((num) => {
      const match = candidateIssues.find((i) => i.number === num);
      return match ? `- **#${match.number}**: [${match.title}](https://github.com/${GITHUB_REPOSITORY}/issues/${match.number})` : `- **#${num}**`;
    })
    .join('\n');

  const bundleCmd = analysis.suggestedBundleNumbers && analysis.suggestedBundleNumbers.length > 0
    ? `/bundle ${analysis.suggestedBundleNumbers.map((n) => `#${n}`).join(' ')}`
    : null;

  let commentBody = `### 🔍 KI-Issue-Kurator & Duplikatsprüfung (Google Jules & RepoLens)

**Ergebnis:** ${analysis.isDuplicate ? '⚠️ **Mögliches Duplikat erkannt**' : analysis.relatedIssueNumbers.length > 0 ? `📦 **Thematisches Cluster gefunden: *${analysis.clusterName}***` : '✅ **Eigenständiges Issue (Keine Duplikate gefunden)**'}

**Begründung:**
${analysis.reason}
`;

  if (analysis.relatedIssueNumbers.length > 0) {
    commentBody += `
**Verwandte offene Issues:**
${relatedList}
`;
  }

  if (analysis.suggestedRepoLens) {
    commentBody += `
🔬 **Empfohlene RepoLens-Linse:** \`lens:${analysis.suggestedRepoLens}\`
*(Verfeinert Jules' Prüffokus auf spezifische Architektur- und Code-Qualitätskriterien)*
`;
  }

  if (analysis.isDuplicate && analysis.duplicateOf) {
    commentBody += `
---
💡 **Empfohlene Aktion (Duplikat):**
Dieses Issue scheint ein Duplikat von **#${analysis.duplicateOf}** zu sein.
Um dieses Issue als Duplikat zu schließen und zu verlinken:
- Antworte mit: **\`/duplicate #${analysis.duplicateOf}\`**
- Oder weise das Label **\`duplicate\`** zu.
`;
  } else if (bundleCmd) {
    commentBody += `
---
💡 **Empfohlene Aktion (Bündelung):**
Die oben genannten Issues betreffen dieselbe Komponente. Um sie automatisch in dieses Issue zu konsolidieren:
- Antworte mit Kommentar: **\`${bundleCmd}\`**
- Oder weise einfach das Label **\`bundle\`** (oder **\`auto-bundle\`**) zu!

*Sobald gebündelt, kannst du mit **\`/plan\`** (oder Label **\`plan\`**) einen konsolidierten Umsetzungsplan generieren lassen.*
`;
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] Generated Comment:');
    console.log(commentBody);
  } else {
    await postIssueComment(issueNumber, commentBody);
    await addIssueLabels(issueNumber, ['curated']);
    await removeIssueLabel(issueNumber, 'curate');
    await removeIssueLabel(issueNumber, 'triage');
    console.log(`[Curator] Comment posted on #${issueNumber}.`);
  }
}

/**
 * Automatically detects and bundles related cluster issues into the lead issue.
 */
async function autoBundle(issueNumber, isDryRun) {
  console.log(`[Curator] Auto-bundling triggered for lead issue #${issueNumber}...`);
  const { analysis } = await analyzeIssue(issueNumber);

  if (!analysis || !analysis.suggestedBundleNumbers || analysis.suggestedBundleNumbers.length === 0) {
    const msg = `ℹ️ **Automatisches Bündeln:** Es wurden keine offenen Issues gefunden, die direkt zu diesem Cluster passen.`;
    if (isDryRun) {
      console.log('[DRY RUN]', msg);
    } else {
      await postIssueComment(issueNumber, msg);
      await removeIssueLabel(issueNumber, 'bundle');
      await removeIssueLabel(issueNumber, 'auto-bundle');
    }
    return;
  }

  console.log(`[Curator] Auto-detected related cluster: [${analysis.suggestedBundleNumbers.join(', ')}]`);
  await bundleIssues(issueNumber, analysis.suggestedBundleNumbers, isDryRun);
}

/**
 * Automatically checks and marks an issue as duplicate if detected.
 */
async function autoDuplicate(issueNumber, isDryRun) {
  console.log(`[Curator] Auto-duplicate check triggered for issue #${issueNumber}...`);
  const { analysis } = await analyzeIssue(issueNumber);

  if (analysis && analysis.isDuplicate && analysis.duplicateOf) {
    await markDuplicate(issueNumber, analysis.duplicateOf, isDryRun);
  } else {
    const msg = `ℹ️ **Duplikats-Prüfung:** Es wurde kein eindeutiges Duplikat unter den offenen Issues gefunden. Das Ticket bleibt regulär offen.`;
    if (isDryRun) {
      console.log('[DRY RUN]', msg);
    } else {
      await postIssueComment(issueNumber, msg);
    }
  }
}

/**
 * Bundles multiple target issues into a single lead issue.
 */
async function bundleIssues(leadIssueNumber, targetNumbers, isDryRun) {
  if (!targetNumbers || targetNumbers.length === 0) {
    console.error('No target issues provided for bundling.');
    return;
  }

  console.log(`[Curator] Bundling issues [${targetNumbers.join(', ')}] into lead issue #${leadIssueNumber}...`);
  const leadIssue = await getIssueDetails(leadIssueNumber);
  const targetIssues = [];

  for (const num of targetNumbers) {
    try {
      const issue = await getIssueDetails(num);
      targetIssues.push(issue);
    } catch (err) {
      console.warn(`Could not fetch target issue #${num}:`, err.message);
    }
  }

  if (targetIssues.length === 0) {
    console.error('None of the target issues could be loaded.');
    return;
  }

  // Construct checklist to append to lead issue body
  const checklistHeader = '\n\n---\n### 📦 Konsolidierte Anforderungen (Gebündelt aus Teil-Issues):\n';
  const checklistItems = targetIssues
    .map((ti) => `- [ ] **#${ti.number}**: [${ti.title}](https://github.com/${GITHUB_REPOSITORY}/issues/${ti.number})\n  > ${(ti.body || 'Keine Beschreibung').split('\n')[0].slice(0, 150)}...`)
    .join('\n');

  let updatedBody = leadIssue.body || '';
  if (!updatedBody.includes('Konsolidierte Anforderungen')) {
    updatedBody += checklistHeader + checklistItems;
  } else {
    updatedBody += '\n' + checklistItems;
  }

  if (isDryRun) {
    console.log('[DRY RUN] Would update Lead Issue Body to:');
    console.log(updatedBody);
  } else {
    // 1. Update lead issue body & labels
    await updateIssue(leadIssueNumber, { body: updatedBody });
    await addIssueLabels(leadIssueNumber, ['bundled-epic']);
    await removeIssueLabel(leadIssueNumber, 'bundle');
    await removeIssueLabel(leadIssueNumber, 'auto-bundle');
    await removeIssueLabel(leadIssueNumber, 'curate');
    await removeIssueLabel(leadIssueNumber, 'triage');

    // 2. Post confirmation comment on lead issue
    const leadComment = `✅ **Issues erfolgreich gebündelt!**\n\nFolgende Issues wurden in dieses Ticket integriert und geschlossen:\n${targetIssues.map((t) => `- #${t.number} (${t.title})`).join('\n')}\n\n👉 Antworte mit **\`/plan\`**, um den konsolidierten Implementierungsplan für alle Anforderungen zu erstellen.`;
    await postIssueComment(leadIssueNumber, leadComment);

    // 3. For each target issue: comment, label, and close
    for (const ti of targetIssues) {
      const closeComment = `🔗 **Dieses Issue wurde in #${leadIssueNumber} konsolidiert.**\n\nDie Anforderungen wurden in [Issue #${leadIssueNumber}](https://github.com/${GITHUB_REPOSITORY}/issues/${leadIssueNumber}) übertragen. Das Issue wird hier geschlossen, um Doppelarbeit zu vermeiden. Alle weiteren Updates und die Umsetzung erfolgen zentral in #${leadIssueNumber}.`;
      await postIssueComment(ti.number, closeComment);
      await addIssueLabels(ti.number, ['bundled']);
      await removeIssueLabel(ti.number, 'bundle');
      await removeIssueLabel(ti.number, 'auto-bundle');
      await updateIssue(ti.number, { state: 'closed', state_reason: 'completed' });
      console.log(`[Curator] Closed and linked #${ti.number} -> #${leadIssueNumber}`);
    }
  }
}

/**
 * Marks an issue as duplicate and closes it.
 */
async function markDuplicate(issueNumber, originalIssueNumber, isDryRun) {
  console.log(`[Curator] Marking #${issueNumber} as duplicate of #${originalIssueNumber}...`);

  if (isDryRun) {
    console.log(`[DRY RUN] Would close #${issueNumber} as duplicate of #${originalIssueNumber}`);
    return;
  }

  // 1. Comment on duplicate
  const comment = `🔗 **Geschlossen als Duplikat**\n\nDieses Issue ist ein Duplikat von [Issue #${originalIssueNumber}](https://github.com/${GITHUB_REPOSITORY}/issues/${originalIssueNumber}). Die Bearbeitung erfolgt dort.`;
  await postIssueComment(issueNumber, comment);
  await addIssueLabels(issueNumber, ['duplicate']);
  await removeIssueLabel(issueNumber, 'curate');
  await removeIssueLabel(issueNumber, 'triage');
  await updateIssue(issueNumber, { state: 'closed', state_reason: 'completed' });

  // 2. Cross-link on original issue
  const origComment = `🔗 Issue [Issue #${issueNumber}](https://github.com/${GITHUB_REPOSITORY}/issues/${issueNumber}) wurde als Duplikat hierhin verlinkt und geschlossen.`;
  await postIssueComment(originalIssueNumber, origComment);

  console.log(`[Curator] Done marking duplicate.`);
}

/**
 * Curates all open issues across repository into clean topic clusters.
 */
async function curateAll(isDryRun) {
  console.log('[Curator] Fetching all open issues for repository-wide curation...');
  const allIssues = await getAllOpenIssues();
  console.log(`[Curator] Found ${allIssues.length} open issues.`);

  const prompt = `You are the lead software architect for LocalGameGalaxy.
Analyze all open issues in the repository and group them into logical, cohesive Epic Clusters.
Also identify any that are already solved or exact duplicates.

OPEN ISSUES (${allIssues.length}):
${allIssues.map((i) => `#${i.number}: ${i.title}\n${(i.body || '').slice(0, 200).replace(/\n/g, ' ')}\n---`).join('\n')}

Group these issues into 3 to 5 cohesive Clusters / Epics.
For each cluster provide:
- Cluster Title
- Recommended Lead Issue (or new Epic)
- Included Issue Numbers
- Rationale

Format as clear GitHub Flavored Markdown.`;

  const report = await queryGemini(prompt, 'Respond with clean, professional Markdown.');
  console.log('\n================ REPOSITORY CURATION REPORT ================');
  console.log(report || 'No report generated.');
  console.log('============================================================\n');
}

async function main() {
  const { issueNumber, action, targets, isDryRun } = parseArgs();

  try {
    if (action === 'curate-all') {
      await curateAll(isDryRun);
    } else if (action === 'auto-bundle' || (action === 'bundle' && targets.length === 0)) {
      if (!issueNumber) throw new Error('Lead issue number required for auto-bundling.');
      await autoBundle(issueNumber, isDryRun);
    } else if (action === 'auto-duplicate' || (action === 'duplicate' && targets.length === 0)) {
      if (!issueNumber) throw new Error('Issue number required for auto-duplicate.');
      await autoDuplicate(issueNumber, isDryRun);
    } else if (action === 'bundle') {
      if (!issueNumber) throw new Error('Lead issue number required for bundling.');
      await bundleIssues(issueNumber, targets, isDryRun);
    } else if (action === 'duplicate') {
      if (!issueNumber || targets.length === 0) throw new Error('Source issue and target original issue number required.');
      await markDuplicate(issueNumber, targets[0], isDryRun);
    } else {
      // Default: curate single issue
      if (!issueNumber) throw new Error('Issue number required for curation.');
      await curateIssue(issueNumber, isDryRun);
    }
  } catch (err) {
    console.error('[Curator Error]:', err.message);
    process.exit(1);
  }
}

main();
