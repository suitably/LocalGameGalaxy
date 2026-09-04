#!/usr/bin/env node

/**
 * Script: create_github_issues.mjs
 *
 * Reads markdown issue files from `docs/tasks/github-issues/` and creates them
 * on GitHub via the GitHub REST API.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxxx node scripts/create_github_issues.mjs
 *   node scripts/create_github_issues.mjs --token=ghp_xxxx
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_OWNER = process.env.GITHUB_OWNER || 'suitably';
const REPO_NAME = process.env.GITHUB_REPO || 'LocalGameGalaxy';

// Extract token from command line or environment
let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const tokenArg = process.argv.find((arg) => arg.startsWith('--token='));
if (tokenArg) {
    token = tokenArg.split('=')[1];
}

if (!token) {
    console.error(`\x1b[31mError: No GitHub token provided.\x1b[0m\n`);
    console.error(`Please provide a GitHub Personal Access Token (PAT) with 'repo' scope:`);
    console.error(`  export GITHUB_TOKEN="ghp_your_token_here"`);
    console.error(`  node scripts/create_github_issues.mjs\n`);
    console.error(`Alternatively, pass it directly:`);
    console.error(`  node scripts/create_github_issues.mjs --token="ghp_your_token_here"\n`);
    process.exit(1);
}

const issuesDir = path.resolve(__dirname, '../docs/tasks/github-issues');

if (!fs.existsSync(issuesDir)) {
    console.error(`Issues directory not found: ${issuesDir}`);
    process.exit(1);
}

const files = fs.readdirSync(issuesDir).filter((f) => f.endsWith('.md')).sort();

if (files.length === 0) {
    console.log('No issue files found in', issuesDir);
    process.exit(0);
}

function parseIssueFile(content) {
    const lines = content.split('\n');
    let title = '';
    let labels = [];
    let inFrontmatter = false;
    let bodyStartIndex = 0;

    if (lines[0].trim() === '---') {
        inFrontmatter = true;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '---') {
                bodyStartIndex = i + 1;
                break;
            }
            if (line.startsWith('title:')) {
                title = line.replace(/^title:\s*["']?/, '').replace(/["']$/, '');
            } else if (line.startsWith('labels:')) {
                try {
                    const raw = line.replace(/^labels:\s*/, '');
                    labels = JSON.parse(raw);
                } catch {
                    labels = [];
                }
            }
        }
    }

    const body = lines.slice(bodyStartIndex).join('\n').trim();
    return { title, labels, body };
}

async function createIssue({ title, labels, body }) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'LocalGameGalaxy-Issue-Creator',
        },
        body: JSON.stringify({ title, labels, body }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GitHub API error ${res.status}: ${errText}`);
    }

    return await res.json();
}

async function run() {
    console.log(`\n\x1b[36m🚀 Creating ${files.length} issues in ${REPO_OWNER}/${REPO_NAME}...\x1b[0m\n`);

    for (const file of files) {
        const fullPath = path.join(issuesDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { title, labels, body } = parseIssueFile(content);

        if (!title) {
            console.warn(`⚠️ Skipping ${file}: No title found in frontmatter.`);
            continue;
        }

        try {
            process.stdout.write(`⏳ Creating: "${title}" ... `);
            const issue = await createIssue({ title, labels, body });
            console.log(`\x1b[32m✔ Issue #${issue.number} created!\x1b[0m (${issue.html_url})`);
        } catch (err) {
            console.log(`\x1b[31m✖ Failed\x1b[0m`);
            console.error(`   Error: ${err.message}`);
        }
    }

    console.log(`\n\x1b[32m🎉 Done!\x1b[0m\n`);
}

run();
