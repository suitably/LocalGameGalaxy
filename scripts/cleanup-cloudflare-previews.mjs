#!/usr/bin/env node

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.log('⚠️  CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID not set. Skipping preview cleanup.');
  process.exit(0);
}

// 1. Resolve Worker / Pages project name from wrangler.jsonc
let projectName = 'nexumia';
try {
  if (fs.existsSync('wrangler.jsonc')) {
    const raw = fs.readFileSync('wrangler.jsonc', 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.name) {
      projectName = parsed.name;
    }
  }
} catch (e) {
  console.warn('Could not parse wrangler.jsonc, defaulting project name to "nexumia":', e.message);
}

const args = process.argv.slice(2);
const deleteAll = process.env.DELETE_ALL === 'true' || args.includes('--all');
const branchArg = args.find(arg => !arg.startsWith('-'));
const rawBranch = process.env.BRANCH_NAME || branchArg || '';

// Transliterate branch names (matching ci.yml sanitization)
function sanitizeBranch(name) {
  if (!name) return '';
  return name
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ä/g, 'ae').replace(/Ö/g, 'oe').replace(/Ü/g, 'ue')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const sanitizedBranch = sanitizeBranch(rawBranch);

console.log(`🧹 Cloudflare Preview Cleanup`);
console.log(`   Project:   ${projectName}`);
console.log(`   Mode:      ${deleteAll ? 'ALL PREVIEWS' : `Branch "${rawBranch}" (sanitized: "${sanitizedBranch}")`}`);

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function cfApi(endpoint, options = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  return response.json();
}

async function cleanupWorkerPreviews() {
  console.log(`\n🔍 Checking Cloudflare Worker Previews for "${projectName}"...`);
  try {
    const listData = await cfApi(`/workers/workers/${projectName}/previews`);
    if (listData.success && Array.isArray(listData.result) && listData.result.length > 0) {
      console.log(`   Found ${listData.result.length} active Worker preview(s).`);
      for (const preview of listData.result) {
        const pName = preview.name || preview.id;
        const matchesTarget =
          rawBranch &&
          (pName === rawBranch ||
            pName.toLowerCase() === rawBranch.toLowerCase() ||
            pName === sanitizedBranch);

        if (deleteAll || matchesTarget) {
          console.log(`   🗑️  Deleting Worker preview "${pName}"...`);
          const delRes = await cfApi(
            `/workers/workers/${projectName}/previews/${encodeURIComponent(pName)}`,
            { method: 'DELETE' }
          );
          if (delRes.success) {
            console.log(`   ✔ Deleted Worker preview "${pName}"`);
          } else {
            console.warn(`   ⚠️  Failed to delete "${pName}":`, JSON.stringify(delRes.errors));
          }
        }
      }
    } else {
      console.log(`   No Worker previews found in list or list endpoint returned empty.`);
    }
  } catch (err) {
    console.warn(`   Worker preview list error:`, err.message);
  }

  // If a specific target branch was requested, attempt direct deletion for all candidate names
  if (!deleteAll && rawBranch) {
    const candidates = new Set([rawBranch, rawBranch.toLowerCase(), sanitizedBranch].filter(Boolean));
    for (const name of candidates) {
      try {
        console.log(`   Direct attempt: Deleting Worker preview candidate "${name}"...`);
        const delRes = await cfApi(
          `/workers/workers/${projectName}/previews/${encodeURIComponent(name)}`,
          { method: 'DELETE' }
        );
        if (delRes.success) {
          console.log(`   ✔ Successfully deleted Worker preview candidate "${name}"`);
        }
      } catch (err) {
        // Ignored if already removed
      }
    }

    // Fallback: Also try wrangler preview delete CLI
    try {
      console.log(`   Fallback: Running 'wrangler preview delete' via CLI...`);
      execSync(`npx --yes wrangler@4 preview delete --name "${rawBranch}" -y --worker-name "${projectName}"`, {
        stdio: 'ignore',
      });
      console.log(`   ✔ Wrangler CLI preview delete completed for "${rawBranch}".`);
    } catch {
      // CLI might fail if already deleted or credentials differ
    }
  }
}

async function cleanupPagesDeployments() {
  console.log(`\n🔍 Checking Cloudflare Pages deployments for "${projectName}"...`);
  try {
    const listData = await cfApi(`/pages/projects/${projectName}/deployments?per_page=100`);
    if (listData.success && Array.isArray(listData.result)) {
      const previewDeployments = listData.result.filter(d => d.environment === 'preview');
      console.log(`   Found ${previewDeployments.length} Pages preview deployment(s).`);
      for (const dep of previewDeployments) {
        const depBranch = dep.deployment_trigger?.metadata?.branch || '';
        const matchesTarget =
          rawBranch &&
          (depBranch === rawBranch ||
            depBranch.toLowerCase() === rawBranch.toLowerCase() ||
            sanitizeBranch(depBranch) === sanitizedBranch);

        if (deleteAll || matchesTarget) {
          console.log(`   🗑️  Deleting Pages deployment ${dep.id} (branch: "${depBranch}")...`);
          const delRes = await cfApi(
            `/pages/projects/${projectName}/deployments/${dep.id}?force=true`,
            { method: 'DELETE' }
          );
          if (delRes.success) {
            console.log(`   ✔ Deleted Pages deployment ${dep.id}`);
          } else {
            console.warn(`   ⚠️  Failed to delete Pages deployment ${dep.id}:`, JSON.stringify(delRes.errors));
          }
        }
      }
    } else {
      console.log(`   No Pages project or preview deployments found.`);
    }
  } catch (err) {
    console.warn(`   Pages deployment check skipped / error:`, err.message);
  }
}

async function run() {
  await cleanupWorkerPreviews();
  await cleanupPagesDeployments();
  console.log(`\n✨ Preview cleanup complete!\n`);
}

run().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
