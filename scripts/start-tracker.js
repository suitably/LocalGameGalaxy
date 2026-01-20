
import { Server } from 'bittorrent-tracker';

const server = new Server({
    udp: false, // Not needed for WebRTC
    http: true, // Enable HTTP/WS
    ws: true,   // Enable WebSockets
    stats: true, // Enable stats
});

const PORT = 8000;

server.on('error', function (err) {
    // fatal server error!
    console.error('[Tracker] Error:', err.message);
});

server.on('warning', function (err) {
    // client-sent error
    console.warn('[Tracker] Warning:', err.message);
});

server.on('listening', function () {
    console.log(`[Tracker] listening on ws://0.0.0.0:${PORT} (all interfaces)`);
    console.log(`[Tracker] (If generic public trackers are blocked, this local one will save the day!)`);
});

server.listen(PORT, '0.0.0.0');
