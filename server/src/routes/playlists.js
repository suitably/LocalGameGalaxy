const express = require('express');
const { getAllPlaylists, savePlaylist, deletePlaylist } = require('../services/playlists');
const config = require('../../config');

const router = express.Router();

// Helper to determine the token
const getToken = (req) => {
    const token = req.headers['authorization'] || req.query.token;
    return token?.replace('Bearer ', '');
};

// GET all playlists
router.get('/', (req, res) => {
    const playlists = getAllPlaylists();
    res.json(playlists);
});

// POST save/update a playlist
router.post('/', (req, res) => {
    const token = getToken(req);
    const { id, name, songs, creatorToken, updatedAt } = req.body;
    
    if (!id || !name || !Array.isArray(songs)) {
        return res.status(400).json({ error: 'Invalid playlist payload' });
    }

    const playlist = {
        id,
        name,
        songs,
        creatorToken: creatorToken || token,
        updatedAt: updatedAt || Date.now()
    };

    savePlaylist(playlist);
    res.json(playlist);
});

// DELETE a playlist
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    const token = getToken(req);
    
    // Fetch playlist to check ownership
    const playlists = getAllPlaylists();
    const playlist = playlists.find(p => p.id === id);
    
    if (!playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Check if the user is authorized to delete
    const isMaster = (token === config.token);
    if (!isMaster && playlist.creatorToken !== token) {
        return res.status(403).json({ error: 'Not authorized to delete this playlist' });
    }
    
    const success = deletePlaylist(id, token);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
});

module.exports = router;
