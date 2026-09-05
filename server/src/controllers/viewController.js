const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { getLocalIp } = require('../utils/helpers');
const { getSongCache, isScanning } = require('../services/scanner');

/**
 * Serves login.html or index.html after injecting dynamic configuration values.
 */
function renderMainView(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const PORT = config.port;
    const SSL_PORT = config.port + 1;
    const localIp = getLocalIp();
    const networkUrl = `https://${localIp}:${SSL_PORT}`;

    // SECURITY CHECK
    const remoteIp = req.socket.remoteAddress || req.connection.remoteAddress;
    const isLocal = remoteIp === '::1' || remoteIp === '127.0.0.1' || remoteIp === '::ffff:127.0.0.1';
    const clientToken = req.query.token ? String(req.query.token).trim().replace(/^["']|["']$/g, '') : null;

    let isAuthorized = false;
    let isAdmin = false;
    let injectedToken = config.token;

    if (isLocal) {
        isAuthorized = true;
        isAdmin = true;
    }

    if (clientToken && clientToken === config.token) {
        isAuthorized = true;
        isAdmin = true;
        injectedToken = config.token;
    } else if (clientToken) {
        const apiKey = config.apiKeys.find(k => k.token === clientToken);
        if (apiKey && apiKey.allowManagement) {
            isAuthorized = true;
            isAdmin = false;
            injectedToken = apiKey.token;
        }
    }

    if (!isAuthorized) {
        try {
            const loginHtmlPath = path.join(__dirname, '..', '..', 'public', 'login.html');
            let loginHtml = fs.readFileSync(loginHtmlPath, 'utf-8');
            if (clientToken) {
                const errorBanner = '<div style="background:#f8d7da;color:#721c24;padding:8px 12px;border-radius:6px;font-size:0.85rem;margin-bottom:12px;text-align:center;">❌ Ungültiger Token. Prüfe die Startup-Logs deines Pods.</div>';
                loginHtml = loginHtml.replace('<form method="GET"', errorBanner + '<form method="GET"');
            }
            return res.send(loginHtml);
        } catch (e) {
            return res.status(500).send('Login template not found.');
        }
    }

    try {
        const indexHtmlPath = path.join(__dirname, '..', '..', 'public', 'index.html');
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');

        // Dynamic directory listing HTML
        const dirListHtml = config.directories.map(dir => `
            <li class="dir-item">
                <span class="dir-path">${dir}</span>
                <button class="danger" onclick="removeDir('${dir.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Remove</button>
            </li>
        `).join('');

        // Replace placeholders
        html = html
            .replace(/\{\{AUTH_TOKEN\}\}/g, injectedToken)
            .replace(/\{\{IS_ADMIN\}\}/g, isAdmin.toString())
            .replace(/\{\{SONG_COUNT\}\}/g, getSongCache().length.toString())
            .replace(/\{\{DIRECTORIES\}\}/g, dirListHtml)
            .replace(/\{\{NETWORK_URL\}\}/g, networkUrl)
            .replace(/\{\{LOCAL_IP\}\}/g, localIp)
            .replace(/\{\{PORT\}\}/g, PORT.toString())
            .replace(/\{\{SCAN_DISABLED\}\}/g, isScanning() ? 'disabled' : '')
            .replace(/\{\{SCAN_TEXT\}\}/g, isScanning() ? 'Scanning Library...' : 'Rescan Library');

        res.send(html);
    } catch (e) {
        res.status(500).send('Index template not found: ' + e.message);
    }
}

module.exports = {
    renderMainView
};
