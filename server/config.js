const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.cwd(), 'config.json');

// Default config
const defaultConfig = {
    directories: [],
    port: 3000
};

let currentConfig = { ...defaultConfig };

// Load config from disk if exists
try {
    if (fs.existsSync(CONFIG_FILE)) {
        const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const savedConfig = JSON.parse(fileContent);
        // Merge with defaults to ensure structure
        currentConfig = { ...defaultConfig, ...savedConfig };
        // Ensure directories is array
        if (!Array.isArray(currentConfig.directories)) {
            currentConfig.directories = defaultConfig.directories;
        }
    }
} catch (e) {
    console.error('Failed to load config.json, using defaults:', e);
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
        console.log('Saved config to', CONFIG_FILE);
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

module.exports = {
    get port() {
        return currentConfig.port;
    },

    get directories() {
        return currentConfig.directories;
    },

    addDirectory(dirPath) {
        if (!currentConfig.directories.includes(dirPath)) {
            currentConfig.directories.push(dirPath);
            saveConfig();
            return true;
        }
        return false;
    },

    removeDirectory(dirPath) {
        const initialLen = currentConfig.directories.length;
        currentConfig.directories = currentConfig.directories.filter(d => d !== dirPath);
        if (currentConfig.directories.length !== initialLen) {
            saveConfig();
            return true;
        }
        return false;
    }
};
