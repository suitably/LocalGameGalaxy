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
    autoVocalSeparation: false // Automatically separate vocals after download
};

let currentConfig = { ...defaultConfig };

// Load config from disk if exists
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
        if (fs.existsSync(p)) {
            console.log(`Found config at: ${p}`);
            activeConfigFile = p;
            foundConfig = p;
            break;
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
        console.log('No config.json found. Will create new one in current directory: ' + activeConfigFile);
    }

    // Generate token if missing
    if (!currentConfig.token) {
        currentConfig.token = crypto.randomBytes(16).toString('hex');
        saveConfig();
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(activeConfigFile, JSON.stringify(currentConfig, null, 2), 'utf-8');
        console.log('Saved config to', activeConfigFile);
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

// Initial load
loadConfig();


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
    }
};
