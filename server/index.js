const express = require('express');
const http = require('http');
const https = require('https');
const morgan = require('morgan');
const config = require('./config');
const { getLocalIp } = require('./src/utils/helpers');
const { getHttpsOptions } = require('./src/services/ssl');
const { scanSongs } = require('./src/services/scanner');
const {
    requireAuth,
    helmetMiddleware,
    corsMiddleware,
    rateLimitMiddleware
} = require('./src/middleware/auth');
const apiRouter = require('./src/routes/index');

// Ensure TextEncoder/btoa are available (Node 18+)
if (typeof TextEncoder === 'undefined') {
    const { TextEncoder } = require('util');
    global.TextEncoder = TextEncoder;
}
if (typeof btoa === 'undefined') {
    global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

const app = express();
const PORT = config.port;
const SSL_PORT = config.port + 1;

// Global Middlewares
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimitMiddleware);
app.use(requireAuth);

// Router
app.use('/', apiRouter);

// Generate/Load SSL Credentials
const httpsOptions = getHttpsOptions(config);

// Start HTTP Server
http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

// Start HTTPS Server
https.createServer(httpsOptions, app).listen(SSL_PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`---------------------------------------------------`);
    console.log(`MELODIQ HELPER RUNNING (HTTPS)`);
    console.log(`---------------------------------------------------`);
    console.log(`Local Access:   http://localhost:${PORT}`);
    console.log(`Secure Access:  https://${localIp}:${SSL_PORT}`);
    console.log(``);
    console.log(`NOTE: You MUST accept the self-signed certificate warning.`);
    console.log(`---------------------------------------------------`);
    console.log(`SECURITY TOKEN: ${config.token}`);
    console.log(`---------------------------------------------------`);

    // Initial Scan
    scanSongs();
});
