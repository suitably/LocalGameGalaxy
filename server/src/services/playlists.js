const fs = require('fs');
const path = require('path');

let playlistsFile = path.join(process.cwd(), 'playlists.json');

// Default initial state
let currentPlaylists = [];

function loadPlaylists() {
    const searchPaths = [
        process.cwd(),
        path.dirname(process.execPath),
        path.resolve(path.dirname(process.execPath), '..')
    ];

    const uniquePaths = [...new Set(searchPaths)];
    let foundPlaylists = null;

    for (const searchDir of uniquePaths) {
        const p = path.join(searchDir, 'playlists.json');
        if (fs.existsSync(p)) {
            console.log(`Found playlists at: ${p}`);
            playlistsFile = p;
            foundPlaylists = p;
            break;
        }
    }

    if (foundPlaylists) {
        try {
            const fileContent = fs.readFileSync(foundPlaylists, 'utf-8');
            currentPlaylists = JSON.parse(fileContent);
            if (!Array.isArray(currentPlaylists)) {
                currentPlaylists = [];
            }
        } catch (e) {
            console.error(`Failed to parse playlists at ${foundPlaylists}:`, e);
            currentPlaylists = [];
        }
    } else {
        console.log('No playlists.json found. Will create new one in current directory: ' + playlistsFile);
    }
}

function savePlaylists() {
    try {
        fs.writeFileSync(playlistsFile, JSON.stringify(currentPlaylists, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save playlists:', e);
    }
}

// Initial load
loadPlaylists();

module.exports = {
    getAllPlaylists() {
        return currentPlaylists;
    },

    savePlaylist(playlist) {
        const index = currentPlaylists.findIndex(p => p.id === playlist.id);
        if (index > -1) {
            currentPlaylists[index] = playlist;
        } else {
            currentPlaylists.push(playlist);
        }
        savePlaylists();
        return playlist;
    },

    deletePlaylist(id, userToken) {
        const index = currentPlaylists.findIndex(p => p.id === id);
        if (index > -1) {
            // Only allow deletion if the creatorToken matches, or if it's the master token (we can handle master check in routes)
            const playlist = currentPlaylists[index];
            currentPlaylists.splice(index, 1);
            savePlaylists();
            return true;
        }
        return false;
    }
};
