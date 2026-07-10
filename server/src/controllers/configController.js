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
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
    res.json(config.apiKeys);
}

function createApiKey(req, res) {
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
    const { name, rateLimitSecond, rateLimitMinute, rateLimitHour, allowManagement, allowSongDeletion } = req.body;
    const newKey = config.createApiKey(name, {
        second: rateLimitSecond,
        minute: rateLimitMinute,
        hour: rateLimitHour
    }, allowManagement, allowSongDeletion);
    res.json(newKey);
}

function updateApiKey(req, res) {
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
    const updatedKey = config.updateApiKey(req.params.id, req.body);
    if (updatedKey) {
        res.json(updatedKey);
    } else {
        res.status(404).json({ error: 'API Key not found' });
    }
}

function deleteApiKey(req, res) {
    if (!req.isMasterToken) return res.status(403).json({ error: 'Master Token required' });
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
    submitFeedback
};
