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
    disableRateLimit: false
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

    get ssl() {
        return currentConfig.ssl;
    },

    set ssl(value) {
        currentConfig.ssl = value;
        saveConfig();
    },

    get disableRateLimit() {
        return currentConfig.disableRateLimit;
    }
};
