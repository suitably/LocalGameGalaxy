const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let activeConfigFile = path.join(process.cwd(), 'config.json');

// Default config
const defaultConfig = {
    directories: [],
    port: 3000,
    token: null, // Will be generated if missing
    ssl: null // Will be generated if missing
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

    // Update global CONFIG_FILE pointer if found elsewhere
    if (foundConfig) {
        // We can't easily change const CONFIG_FILE but we can use a variable
        // But for now, let's just read from it.
        try {
            const fileContent = fs.readFileSync(foundConfig, 'utf-8');
            const savedConfig = JSON.parse(fileContent);
            currentConfig = { ...defaultConfig, ...savedConfig };

            if (!Array.isArray(currentConfig.directories)) {
                currentConfig.directories = defaultConfig.directories;
            }
            // Update the global path so saveConfig writes to the correct place
            // We need to change how CONFIG_FILE is handled. 
            // Re-assigning to a module-level variable is needed.
        } catch (e) {
            console.error(`Failed to parse config at ${foundConfig}:`, e);
        }
    } else {
        console.log('No config.json found. Will create new one in current directory.');
    }

    // Generate token if missing
    if (!currentConfig.token) {
        currentConfig.token = crypto.randomBytes(16).toString('hex');
        saveConfig();
    }

    // Generate SSL if missing
    // (Handled in index.js for now, but good to have here if we moved it)
}

// Override CONFIG_FILE saving logic
// We need to make CONFIG_FILE mutable or use a variable
let activeConfigFile = CONFIG_FILE;

function saveConfig() {
    try {
        // If we found a config elsewhere, write to IT. 
        // If not, write to CWD (default CONFIG_FILE).
        // To implement this, we need 'loadConfig' to update 'activeConfigFile'.
        // BUT strict mode/scope... let's just rewrite loadConfig to update a let variable.
        fs.writeFileSync(activeConfigFile, JSON.stringify(currentConfig, null, 2), 'utf-8');
        console.log('Saved config to', activeConfigFile);
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
        console.log('Saved config to', CONFIG_FILE);
    } catch (e) {
        console.error('Failed to save config:', e);
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
        saveConfig();
    },

    get ssl() {
        return currentConfig.ssl;
    },

    set ssl(value) {
        currentConfig.ssl = value;
        saveConfig();
    }
};
