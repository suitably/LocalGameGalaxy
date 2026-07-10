const { spawnYtDlp, ensureYtDlp } = require('./download');

/**
 * Resolves a remote web URL using yt-dlp to direct playable media stream URL.
 * @param {string} targetPath The remote video/audio URL to resolve.
 * @returns {Promise<string>} The resolved stream URL.
 */
async function resolveStreamUrl(targetPath) {
    // Create a mock job to pass to ensureYtDlp
    const mockJob = { log: [] };
    const ytBin = await ensureYtDlp(mockJob);
    
    // Resolve direct stream URL using yt-dlp
    // Format: bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best to make sure browser can play it
    const directUrl = await spawnYtDlp(ytBin, [
        '-g',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        targetPath
    ]);
    
    const resolvedUrl = directUrl.trim().split('\n')[0];
    if (resolvedUrl && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))) {
        return resolvedUrl;
    } else {
        throw new Error('Invalid resolved stream URL: ' + resolvedUrl);
    }
}

module.exports = {
    resolveStreamUrl
};
