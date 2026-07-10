const { resolveSecurePath } = require('../utils/helpers');
const { resolveStreamUrl } = require('../services/streaming');

/**
 * Handles the /media stream endpoint.
 * Redirects remote URLs to direct media stream URLs resolved via yt-dlp, 
 * and serves local media files securely.
 */
async function streamMedia(req, res) {
    const targetPath = req.query.path;
    if (!targetPath) return res.status(400).send('Missing path');

    // Check if targetPath is a remote web URL
    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
        try {
            const resolvedUrl = await resolveStreamUrl(targetPath);
            return res.redirect(resolvedUrl);
        } catch (e) {
            console.error('[Media] Failed to resolve stream URL:', e.message);
            return res.status(500).send('Failed to resolve stream URL: ' + e.message);
        }
    }

    const safePath = resolveSecurePath(targetPath);
    if (!safePath) return res.status(403).send('Access Denied or File Not Found');
    
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.sendFile(safePath);
}

module.exports = {
    streamMedia
};
