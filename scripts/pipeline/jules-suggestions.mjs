import { GoogleGenAI } from '@google/genai';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!GEMINI_API_KEY || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.error('Missing required environment variables (GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY)');
    process.exit(1);
}

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function run() {
    console.log('🔍 Jules Suggestions (Beta) - Scanning repository for improvements...');

    // 1. Get highly churned files (most modified in last 30 days) to find technical debt
    console.log('Analyzing git history for active files...');
    const gitCmd = `git log --since="30 days ago" --name-only --pretty=format:"" | grep -v "^$" | grep -E "\\.tsx?$" | sort | uniq -c | sort -nr | head -n 10 | awk '{print $2}'`;
    let activeFiles = [];
    try {
        activeFiles = execSync(gitCmd).toString().trim().split('\n').filter(Boolean);
    } catch (e) {
        console.warn('Could not get git history, falling back to random files.');
        const allFiles = execSync(`find src -type f -name "*.tsx" -o -name "*.ts"`).toString().trim().split('\n').filter(Boolean);
        activeFiles = allFiles.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    if (activeFiles.length === 0) {
        console.log('No files found to analyze.');
        return;
    }

    console.log(`Selected files for analysis:\n${activeFiles.map(f => \`- \${f}\`).join('\n')}`);

    // 2. Read context
    const architectureDoc = fs.existsSync('docs/tech/architecture.md') ? fs.readFileSync('docs/tech/architecture.md', 'utf-8') : '';
    const agentsRules = fs.existsSync('AGENTS.md') ? fs.readFileSync('AGENTS.md', 'utf-8') : '';
    
    let sourceCodeContext = '';
    // Select top 3 to keep prompt size reasonable
    const filesToRead = activeFiles.slice(0, 3);
    for (const file of filesToRead) {
        if (fs.existsSync(file)) {
            sourceCodeContext += `\n\n--- FILE: ${file} ---\n\`\`\`typescript\n${fs.readFileSync(file, 'utf-8')}\n\`\`\``;
        }
    }

    // 3. Ask Gemini for a suggestion
    console.log('🧠 Asking Google Gemini 1.5 Pro to formulate a suggestion...');
    const prompt = `You are "Jules Suggestions Beta", a proactive autonomous AI architect.
Your job is to scan the provided source files and identify ONE concrete, high-value improvement, technical debt reduction, or bug fix.

RULES:
- Suggest something actionable (e.g., extracting a God Component, fixing a React dependency array, standardizing storage, removing duplicates).
- Base your review strictly on the project rules in AGENTS.md and the architecture docs.
- Do NOT suggest trivial things like "add more comments".
- If the files look perfect, output an empty JSON object: {}
- If you find an issue, output a JSON object in this exact format:
{
  "title": "[Suggestion] <Clear, actionable title>",
  "body": "## 💡 Proactive Suggestion\\n\\n<Detailed explanation of the problem>\\n\\n### 🛠️ Proposed Solution\\n\\n<How to fix it>\\n\\n--- \\n*Reply with \`/plan\` or \`/fix\` to have Jules implement this automatically!*",
  "labels": ["jules:suggestion"]
}

PROJECT CONTEXT:
${agentsRules}
${architectureDoc}

FILES TO REVIEW:
${sourceCodeContext}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: prompt,
            config: {
                temperature: 0.4,
                responseMimeType: 'application/json'
            }
        });

        const text = response.text();
        const suggestion = JSON.parse(text);

        if (!suggestion.title || !suggestion.body) {
            console.log('✅ Code looks solid. No suggestions generated today.');
            return;
        }

        console.log(`💡 Found a suggestion: ${suggestion.title}`);

        // 4. Create GitHub Issue
        const issue = await octokit.rest.issues.create({
            owner,
            repo,
            title: suggestion.title,
            body: suggestion.body,
            labels: suggestion.labels || ['jules:suggestion']
        });

        console.log(`🚀 Created GitHub Issue: ${issue.data.html_url}`);
    } catch (e) {
        console.error('Failed to generate or create suggestion issue:', e);
    }
}

run();
