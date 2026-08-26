const { networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const getLocalIp = () => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};

const sanitizeFilename = (str) => {
    return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim();
};

const generateId = (title, artist, relPath) => {
    // Ensure forward slashes for consistency with Client
    const normalizedPath = relPath.replace(/\\/g, '/');
    const str = `${artist}-${title}-${normalizedPath}`;

    // Node Buffer is equivalent to UTF-8 encode
    return Buffer.from(str, 'utf-8').toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

const resolveSecurePath = (userPath) => {
    if (!userPath) return null;
    const safePath = path.normalize(userPath);
    const isAllowed = config.directories.some(dir => {
        const normalizedDir = path.normalize(dir);
        return safePath === normalizedDir || safePath.startsWith(normalizedDir + path.sep);
    });
    return isAllowed && fs.existsSync(safePath) ? safePath : null;
};

const apiSuccess = (res, data = {}, status = 200) => {
    return res.status(status).json({ success: true, ...data });
};

const apiError = (res, message = 'Internal server error', status = 500, details = null) => {
    return res.status(status).json({ success: false, error: message, ...(details ? { details } : {}) });
};

module.exports = {
    getLocalIp,
    sanitizeFilename,
    generateId,
    resolveSecurePath,
    apiSuccess,
    apiError
};

