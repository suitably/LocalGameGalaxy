const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../../config');
const { scanSongs } = require('../services/scanner');
const { usdbLogin, setUsdbSessionCookie } = require('../services/usdb');

// --- DIRECTORIES ---
function getDirectories(req, res) {
    res.json(config.directories);
}

function addDirectory(req, res) {
    const { path: newPath } = req.body;
    if (newPath && fs.existsSync(newPath)) {
        config.addDirectory(newPath);
        scanSongs();
        res.json(config.directories);
    } else {
        res.status(400).json({ error: 'Invalid path' });
    }
}

function removeDirectory(req, res) {
    config.removeDirectory(req.body.path);
    scanSongs();
    res.json(config.directories);
}

// --- DIRECTORY BROWSER ---
function browseDirectory(req, res) {
    const queryPath = req.query.path || os.homedir();
    try {
        if (!fs.existsSync(queryPath)) return res.status(404).json({ error: 'Path not found' });
        const entries = fs.readdirSync(queryPath, { withFileTypes: true });
        const dirs = entries
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name);

        const parent = path.resolve(queryPath, '..');
        if (parent !== path.resolve(queryPath)) {
            dirs.unshift('..');
        }

        res.json({ current: path.resolve(queryPath), dirs: dirs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

// --- DOWNLOAD DIRECTORY ---
function getDownloadDir(req, res) {
    res.json({ downloadDir: config.downloadDir || config.directories[0] || null });
}

function setDownloadDir(req, res) {
    const { dir } = req.body;
    if (!dir || !fs.existsSync(dir)) return res.status(400).json({ error: 'Directory does not exist' });
    config.downloadDir = dir;
    res.json({ downloadDir: config.downloadDir });
}

// --- PREFERENCES ---
function getPreferences(req, res) {
    res.json({
        defaultDownloadMode: config.defaultDownloadMode || 'stream',
        autoVocalSeparation: !!config.autoVocalSeparation
    });
}

function setPreferences(req, res) {
    const { defaultDownloadMode, autoVocalSeparation } = req.body;
    if (defaultDownloadMode) {
        config.defaultDownloadMode = defaultDownloadMode;
    }
    if (typeof autoVocalSeparation === 'boolean') {
        config.autoVocalSeparation = autoVocalSeparation;
    }
    res.json({ ok: true });
}

// --- USDB CREDENTIALS ---
function getUsdbCredentials(req, res) {
    res.json({ username: config.usdbUsername || '', hasPassword: !!config.usdbPassword });
}

async function setUsdbCredentials(req, res) {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    let finalPassword = password;
    if (password === '********' || !password) {
        finalPassword = config.usdbPassword;
    }

    try {
        const testCookie = await usdbLogin(username, finalPassword);
        setUsdbSessionCookie(testCookie);
        config.setUsdbCredentials(username, finalPassword);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

// --- API KEYS ---
function getApiKeys(req, res) {
    res.json(config.apiKeys);
}

function createApiKey(req, res) {
    const { name, rateLimitSecond, rateLimitMinute, rateLimitHour, allowManagement, allowSongDeletion } = req.body;
    const newKey = config.createApiKey(name, {
        second: rateLimitSecond,
        minute: rateLimitMinute,
        hour: rateLimitHour
    }, allowManagement, allowSongDeletion);
    res.json(newKey);
}

function updateApiKey(req, res) {
    const updatedKey = config.updateApiKey(req.params.id, req.body);
    if (updatedKey) {
        res.json(updatedKey);
    } else {
        res.status(404).json({ error: 'API Key not found' });
    }
}

function deleteApiKey(req, res) {
    const success = config.deleteApiKey(req.params.id);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'API Key not found' });
    }
}

// --- GITHUB INTEGRATION ---
function getGithubConfig(req, res) {
    res.json({
        githubOwner: config.githubOwner,
        githubRepo: config.githubRepo,
        hasToken: !!config.githubToken
    });
}

function setGithubConfig(req, res) {
    const { owner, repo, token } = req.body;
    if (owner !== undefined) config.githubOwner = owner;
    if (repo !== undefined) config.githubRepo = repo;
    if (token !== undefined && token !== '********') {
        config.githubToken = token || null;
    }
    res.json({ ok: true });
}

// --- FEEDBACK / ISSUE SUBMISSION ---
async function submitFeedback(req, res) {
    const { title, body, type } = req.body;
    if (!title || !body) {
        return res.status(400).json({ error: 'Missing title or body' });
    }

    const token = config.githubToken;
    const owner = config.githubOwner;
    const repo = config.githubRepo;

    if (!token) {
        return res.status(400).json({ 
            error: 'GitHub Token is not configured on the backend server. Please configure it in the server settings.' 
        });
    }

    // Map types to GitHub labels and title prefixes
    let labels = ['user-feedback'];
    let prefix = '[Feedback]';
    
    if (type === 'bug') {
        labels.push('bug');
        prefix = '[Bug]';
    } else if (type === 'feature') {
        labels.push('enhancement');
        prefix = '[Feature Request]';
    } else if (type === 'suggestion') {
        labels.push('question');
        prefix = '[Suggestion]';
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LocalGameGalaxy-Server',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: `${prefix} ${title}`,
                body: body,
                labels: labels
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[GitHub API Error]', data);
            return res.status(response.status).json({ 
                error: data.message || 'Failed to create GitHub issue' 
            });
        }

        res.json({ success: true, issueUrl: data.html_url, number: data.number });
    } catch (e) {
        console.error('[Feedback Error]', e);
        res.status(500).json({ error: 'Failed to submit feedback: ' + e.message });
    }
}

// --- GUESSART CATALOGUE PR PUBLISHING ---
async function publishGuessArtCatalogue(req, res) {
    const { content, summary, prTitle } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Missing catalogue file content' });
    }

    const token = config.githubToken;
    const owner = config.githubOwner;
    const repo = config.githubRepo;

    if (!token) {
        return res.status(400).json({
            error: 'GitHub Token is not configured on the backend server. Please configure it in server settings.'
        });
    }
    if (!owner || !repo) {
        return res.status(400).json({
            error: 'GitHub Owner or Repository is not configured on the backend server.'
        });
    }

    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LocalGameGalaxy-Server',
        'Content-Type': 'application/json'
    };

    try {
        // 1. Get repository info to determine default branch
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        const repoData = await repoRes.json();
        if (!repoRes.ok) {
            return res.status(repoRes.status).json({
                error: repoData.message || 'Failed to fetch repository information'
            });
        }
        const defaultBranch = repoData.default_branch || 'main';

        // 2. Get latest commit SHA of default branch
        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
        const refData = await refRes.json();
        if (!refRes.ok) {
            return res.status(refRes.status).json({
                error: refData.message || `Failed to fetch branch reference for ${defaultBranch}`
            });
        }
        const baseCommitSha = refData.object.sha;

        // 3. Get current file sha on default branch (if exists)
        const filePath = 'src/games/guessart/logic/defaultLexicon.ts';
        let fileSha = undefined;
        const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${defaultBranch}`, { headers });
        if (fileRes.ok) {
            const fileData = await fileRes.json();
            fileSha = fileData.sha;
        }

        // 4. Create a new branch
        const branchName = `guessart/catalogue-update-${Date.now()}`;
        const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: baseCommitSha
            })
        });
        const createRefData = await createRefRes.json();
        if (!createRefRes.ok) {
            return res.status(createRefRes.status).json({
                error: createRefData.message || 'Failed to create git branch'
            });
        }

        // 5. Commit updated file to new branch
        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: 'feat(guessart): update word and category catalogue',
                content: Buffer.from(content, 'utf8').toString('base64'),
                branch: branchName,
                ...(fileSha ? { sha: fileSha } : {})
            })
        });
        const commitData = await commitRes.json();
        if (!commitRes.ok) {
            return res.status(commitRes.status).json({
                error: commitData.message || 'Failed to commit catalogue file'
            });
        }

        // 6. Create Pull Request
        const title = prTitle || '[GuessArt] Update Word & Category Catalogue';
        const descriptionBody = (summary || 'Updated GuessArt categories and words via in-game Catalogue Editor.') +
            '\n\n---\n*Created automatically via LocalGameGalaxy In-Game Catalogue Editor.*';

        const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title,
                head: branchName,
                base: defaultBranch,
                body: descriptionBody
            })
        });
        const prData = await prRes.json();
        if (!prRes.ok) {
            return res.status(prRes.status).json({
                error: prData.message || 'Failed to create GitHub Pull Request'
            });
        }

        res.json({
            success: true,
            prUrl: prData.html_url,
            prNumber: prData.number,
            branch: branchName
        });
    } catch (e) {
        console.error('[Publish Catalogue Error]', e);
        res.status(500).json({ error: 'Failed to publish catalogue: ' + e.message });
    }
}

module.exports = {
    getDirectories,
    addDirectory,
    removeDirectory,
    browseDirectory,
    getDownloadDir,
    setDownloadDir,
    getPreferences,
    setPreferences,
    getUsdbCredentials,
    setUsdbCredentials,
    getApiKeys,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    getGithubConfig,
    setGithubConfig,
    submitFeedback,
    publishGuessArtCatalogue
};
