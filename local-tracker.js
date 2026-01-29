/**
 * Local WebRTC Tracker for Melodiq
 * 
 * Usage:
 * 1. Install dependencies: npm install bittorrent-tracker
 * 2. Run: node local-tracker.js
 * 3. Use 'ws://localhost:8000' or 'wss://localhost:8000' in the app.
 */

const Server = require('bittorrent-tracker').Server;

const server = new Server({
    udp: false, // disable udp server
    http: true, // enable http server
    ws: true,   // enable websocket server
    stats: true // enable web-based statistics?
});

server.on('error', function (err) {
    // fatal server error!
    console.error('[Tracker] Error:', err.message);
});

server.on('warning', function (err) {
    // client delivered bad data. its okay.
    console.warn('[Tracker] Warning:', err.message);
});

server.on('listening', function () {
    // check for errors of the internal http/udp servers, if any
    const httpAddr = server.http.address();
    console.log('[Tracker] WebSocket tracker listening on ws://localhost:' + httpAddr.port);
    console.log('[Tracker] Web stats available at http://localhost:' + httpAddr.port + '/stats');
});

// Start the server
server.listen(8000, '0.0.0.0', () => {
    console.log('[Tracker] Server started');
});

server.on('start', function (addr) {
    console.log('[Tracker] Peer started:', addr);
});

server.on('complete', function (addr) {
    console.log('[Tracker] Peer completed:', addr);
});

server.on('stop', function (addr) {
    console.log('[Tracker] Peer stopped:', addr);
});
