const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let activeConfigFile = path.join(process.cwd(), 'config.json');

// Default config
const defaultConfig = {
    directories: [],
    port: 3000,
    token: null, // Will be generated if missing
    ssl: null, // Will be generated if missing
    disableRateLimit: false,
    downloadDir: null,       // Default folder for USDB downloads
    usdbUsername: null,      // USDB login username
    usdbPassword: null,      // USDB login password
    apiKeys: [],             // Array of API key objects
    defaultDownloadMode: 'stream', // 'stream', 'mp4', or 'none'
    autoVocalSeparation: false, // Automatically separate vocals after download
    githubOwner: 'suitably',
    githubRepo: 'LocalGameGalaxy',
    githubToken: null
};

let currentConfig = { ...defaultConfig };

// Load config from disk and environment variables
function loadConfig() {
    // Try multiple locations for config.json
    const searchPaths = [
        process.cwd(), // Where command is run
        path.dirname(process.execPath), // Next to binary
        path.resolve(path.dirname(process.execPath), '..') // Parent of binary (if in dist/)
    ];

    // Deduplicate paths
    const uniquePaths = [...new Set(searchPaths)];
    let foundConfig = null;

    for (const searchDir of uniquePaths) {
        const p = path.join(searchDir, 'config.json');
        try {
            if (fs.existsSync(p)) {
                const stat = fs.statSync(p);
                if (stat.isFile()) {
                    console.log(`Found config at: ${p}`);
                    activeConfigFile = p;
                    foundConfig = p;
                    break;
                }
            }
        } catch {
            // Ignore filesystem check errors
        }
    }

    if (foundConfig) {
        try {
            const fileContent = fs.readFileSync(foundConfig, 'utf-8');
            const savedConfig = JSON.parse(fileContent);
            currentConfig = { ...defaultConfig, ...savedConfig };

            if (!Array.isArray(currentConfig.directories)) {
                currentConfig.directories = defaultConfig.directories;
            }
            if (!Array.isArray(currentConfig.apiKeys)) {
                currentConfig.apiKeys = defaultConfig.apiKeys;
            }
        } catch (e) {
            console.error(`Failed to parse config at ${foundConfig}:`, e);
        }
    } else {
        console.log('[Config] Using configuration location: ' + activeConfigFile);
    }

    // 1. Environment Variable Overrides
    if (process.env.PORT) {
        const parsedPort = parseInt(process.env.PORT, 10);
        if (!isNaN(parsedPort) && parsedPort > 0) {
            currentConfig.port = parsedPort;
        }
    }

    const envToken = process.env.SECURITY_TOKEN || process.env.TOKEN;
    if (envToken && typeof envToken === 'string' && envToken.trim()) {
        currentConfig.token = envToken.trim();
    }

    // 2. Music Directory Discovery & Overrides
    const candidateDirs = [];
    if (process.env.MUSIC_DIR) {
        candidateDirs.push(...process.env.MUSIC_DIR.split(',').map(d => d.trim()).filter(Boolean));
    }
    if (process.env.DIRECTORIES) {
        candidateDirs.push(...process.env.DIRECTORIES.split(',').map(d => d.trim()).filter(Boolean));
    }

    // Standard container & local music directories
    const standardMusicLocations = [
        '/app/music',
        path.join(process.cwd(), 'music'),
    ];
    for (const loc of standardMusicLocations) {
        try {
            if (fs.existsSync(loc) && fs.statSync(loc).isDirectory()) {
                candidateDirs.push(loc);
            }
        } catch {
            // Ignore stat errors
        }
    }

    for (const dir of candidateDirs) {
        const resolved = path.resolve(dir);
        if (!currentConfig.directories.some(d => path.resolve(d) === resolved)) {
            currentConfig.directories.push(dir);
        }
    }

    if (currentConfig.directories.length > 0 && !currentConfig.downloadDir) {
        currentConfig.downloadDir = currentConfig.directories[0];
    }

    // 3. Generate token if still missing
    if (!currentConfig.token) {
        currentConfig.token = crypto.randomBytes(16).toString('hex');
        saveConfig();
    }
}

function saveConfig() {
    try {
        if (fs.existsSync(activeConfigFile)) {
            const stat = fs.statSync(activeConfigFile);
            if (stat.isDirectory()) {
                // If activeConfigFile happens to be an accidental folder mount, don't attempt file write
                return;
            }
        }
        fs.writeFileSync(activeConfigFile, JSON.stringify(currentConfig, null, 2), 'utf-8');
        console.log('Saved config to', activeConfigFile);
    } catch (e) {
        if (e && (e.code === 'EROFS' || e.code === 'EACCES' || e.code === 'EISDIR')) {
            console.log('[Config] Read-only environment: operating with in-memory configuration.');
        } else {
            console.error('Failed to save config:', e);
        }
    }
}

// Initial load
loadConfig();

module.exports = {
    get port() {
        return currentConfig.port;
    },

    get directories() {
        return currentConfig.directories;
    },

    get token() {
        return currentConfig.token;
    },

    addDirectory(dirPath) {
        if (!currentConfig.directories.includes(dirPath)) {
            currentConfig.directories.push(dirPath);
            saveConfig();
        }
    },

    removeDirectory(dirPath) {
        currentConfig.directories = currentConfig.directories.filter(d => d !== dirPath);
        // If the removed dir was the current downloadDir, fall back to the first remaining dir
        if (currentConfig.downloadDir === dirPath) {
            currentConfig.downloadDir = currentConfig.directories[0] || null;
            console.log(`[Config] downloadDir was removed. Falling back to: ${currentConfig.downloadDir}`);
        }
        saveConfig();
    },

    get downloadDir() {
        return currentConfig.downloadDir;
    },

    set downloadDir(value) {
        currentConfig.downloadDir = value;
        saveConfig();
    },

    get usdbUsername() {
        return currentConfig.usdbUsername;
    },

    get usdbPassword() {
        return currentConfig.usdbPassword;
    },

    setUsdbCredentials(username, password) {
        currentConfig.usdbUsername = username || null;
        currentConfig.usdbPassword = password || null;
        saveConfig();
    },

    get ssl() {
        return currentConfig.ssl;
    },

    set ssl(value) {
        currentConfig.ssl = value;
        saveConfig();
    },

    get disableRateLimit() {
        return currentConfig.disableRateLimit;
    },

    get defaultDownloadMode() {
        return currentConfig.defaultDownloadMode;
    },

    set defaultDownloadMode(value) {
        currentConfig.defaultDownloadMode = value;
        saveConfig();
    },

    get autoVocalSeparation() {
        return currentConfig.autoVocalSeparation;
    },

    set autoVocalSeparation(value) {
        currentConfig.autoVocalSeparation = value;
        saveConfig();
    },

    get apiKeys() {
        return currentConfig.apiKeys || [];
    },

    createApiKey(name, rateLimits = {}, allowManagement, allowSongDeletion) {
        if (!currentConfig.apiKeys) {
            currentConfig.apiKeys = [];
        }
        const token = crypto.randomBytes(16).toString('hex');
        const id = crypto.randomBytes(8).toString('hex');
        const keyObj = {
            id,
            name: name || 'Unnamed Key',
            token,
            rateLimitSecond: rateLimits.second !== undefined && rateLimits.second !== '' ? parseInt(rateLimits.second, 10) : null,
            rateLimitMinute: rateLimits.minute !== undefined && rateLimits.minute !== '' ? parseInt(rateLimits.minute, 10) : null,
            rateLimitHour: rateLimits.hour !== undefined && rateLimits.hour !== '' ? parseInt(rateLimits.hour, 10) : null,
            allowManagement: allowManagement === true,
            allowSongDeletion: allowSongDeletion === true,
            createdAt: new Date().toISOString()
        };
        currentConfig.apiKeys.push(keyObj);
        saveConfig();
        return keyObj;
    },

    updateApiKey(id, updates) {
        if (!currentConfig.apiKeys) return false;
        const keyIndex = currentConfig.apiKeys.findIndex(k => k.id === id);
        if (keyIndex !== -1) {
            if (updates.rateLimitSecond !== undefined) {
                currentConfig.apiKeys[keyIndex].rateLimitSecond = updates.rateLimitSecond !== '' ? parseInt(updates.rateLimitSecond, 10) : null;
            }
            if (updates.rateLimitMinute !== undefined) {
                currentConfig.apiKeys[keyIndex].rateLimitMinute = updates.rateLimitMinute !== '' ? parseInt(updates.rateLimitMinute, 10) : null;
            }
            if (updates.rateLimitHour !== undefined) {
                currentConfig.apiKeys[keyIndex].rateLimitHour = updates.rateLimitHour !== '' ? parseInt(updates.rateLimitHour, 10) : null;
            }
            if (updates.allowManagement !== undefined) {
                currentConfig.apiKeys[keyIndex].allowManagement = updates.allowManagement === true;
            }
            if (updates.allowSongDeletion !== undefined) {
                currentConfig.apiKeys[keyIndex].allowSongDeletion = updates.allowSongDeletion === true;
            }
            saveConfig();
            return currentConfig.apiKeys[keyIndex];
        }
        return false;
    },

    deleteApiKey(id) {
        if (!currentConfig.apiKeys) return false;
        const initialLength = currentConfig.apiKeys.length;
        currentConfig.apiKeys = currentConfig.apiKeys.filter(k => k.id !== id);
        if (currentConfig.apiKeys.length !== initialLength) {
            saveConfig();
            return true;
        }
        return false;
    },

    get githubOwner() {
        return currentConfig.githubOwner || 'suitably';
    },

    set githubOwner(value) {
        currentConfig.githubOwner = value || 'suitably';
        saveConfig();
    },

    get githubRepo() {
        return currentConfig.githubRepo || 'LocalGameGalaxy';
    },

    set githubRepo(value) {
        currentConfig.githubRepo = value || 'LocalGameGalaxy';
        saveConfig();
    },

    get githubToken() {
        return currentConfig.githubToken || null;
    },

    set githubToken(value) {
        currentConfig.githubToken = value || null;
        saveConfig();
    }
};
