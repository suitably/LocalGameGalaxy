const express = require('express');
const path = require('path');
const multer = require('multer');
const { getSongCache } = require('../services/scanner');
const { resolveSecurePath } = require('../utils/helpers');

const router = express.Router();
const playlistsRouter = require('./playlists');

const { requireMasterToken } = require('../middleware/auth');

// Import controllers
const viewController = require('../controllers/viewController');
const mediaController = require('../controllers/mediaController');
const songController = require('../controllers/songController');
const configController = require('../controllers/configController');
const jobController = require('../controllers/jobController');

// Multer middleware setup for video uploads
const videoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const songId = req.params.id;
        const song = getSongCache().find(s => s.id === songId);
        if (!song || !song.txtPath) return cb(new Error('Song not found'));
        const songDir = path.dirname(song.txtPath);
        const safeFolder = resolveSecurePath(songDir);
        if (!safeFolder) return cb(new Error('Access denied'));
        cb(null, safeFolder);
    },
    filename: function (req, file, cb) {
        const songId = req.params.id;
        const song = getSongCache().find(s => s.id === songId);
        const txtFilename = path.basename(song.txtPath);
        const safeName = txtFilename.substring(0, txtFilename.lastIndexOf('.'));
        const ext = path.extname(file.originalname) || '.mp4';
        cb(null, `${safeName}${ext}`);
    }
});
const videoUpload = multer({ storage: videoStorage });

// --- PLAYLISTS ROUTER ---
router.use('/api/playlists', playlistsRouter);

// --- UI ROUTE ---
router.get('/', viewController.renderMainView);

// --- MEDIA STREAMING ---
router.get('/media', mediaController.streamMedia);

// --- SONGS LISTING & SEARCH ---
router.get('/api/songs', songController.getSongs);
router.get('/api/songs/:id', songController.getSongById);
router.delete('/api/songs/:id', songController.deleteSong);
router.put('/api/songs/:id/txt', songController.updateSongTxt);
router.post('/api/songs/:id/video', videoUpload.single('video'), songController.uploadSongVideo);
router.get('/api/status', songController.getScanStatus);
router.post('/api/songs/refresh', songController.refreshLibrary);

// --- EXTERNAL SEARCH ---
router.get('/api/usdb/search', songController.searchUsdbSongs);
router.get('/api/youtube/search', songController.searchYoutube);

// --- CONFIG DIRECTORIES & BROWSER ---
router.get('/api/config/directories', configController.getDirectories);
router.post('/api/config/directories', configController.addDirectory);
router.delete('/api/config/directories', configController.removeDirectory);
router.get('/api/browse', configController.browseDirectory);

// --- CONFIG DOWNLOAD DIRECTORY ---
router.get('/api/config/download-dir', configController.getDownloadDir);
router.post('/api/config/download-dir', configController.setDownloadDir);

// --- CONFIG PREFERENCES ---
router.get('/api/config/preferences', configController.getPreferences);
router.post('/api/config/preferences', configController.setPreferences);

// --- CONFIG USDB CREDENTIALS ---
router.get('/api/config/usdb-credentials', configController.getUsdbCredentials);
router.post('/api/config/usdb-credentials', configController.setUsdbCredentials);

// --- API KEYS ---
router.get('/api/config/apikeys', requireMasterToken, configController.getApiKeys);
router.post('/api/config/apikeys', requireMasterToken, configController.createApiKey);
router.put('/api/config/apikeys/:id', requireMasterToken, configController.updateApiKey);
router.delete('/api/config/apikeys/:id', requireMasterToken, configController.deleteApiKey);

// --- CONFIG GITHUB INTEGRATION ---
router.get('/api/config/github', configController.getGithubConfig);
router.post('/api/config/github', configController.setGithubConfig);

// --- FEEDBACK / ISSUE SUBMISSION ---
router.post('/api/feedback', configController.submitFeedback);

// --- USDB DOWNLOAD JOBS ---
router.post('/api/usdb/download', jobController.downloadUsdb);
router.get('/api/usdb/jobs', jobController.getUsdbJobs);
router.get('/api/usdb/status/:jobId', jobController.getUsdbJobStatus);

// --- SEPARATOR JOBS ---
router.get('/api/separator/status', jobController.getSeparatorInstalledStatus);
router.post('/api/separator/install', jobController.installSeparator);
router.get('/api/separator/jobs', jobController.getSeparatorJobs);
router.get('/api/separator/status/:jobId', jobController.getSeparatorJobStatus);
router.post('/api/separator/job', jobController.createSeparatorJob);

module.exports = router;
