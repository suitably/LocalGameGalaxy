import type { Hono } from 'hono';
import type { GalaxyPlugin, ServerConfig } from '../../core/types';

interface RoomSession {
  roomId: string;
  hostId: string;
  gameType: string;
  createdAt: number;
  updatedAt: number;
  players: Map<string, { id: string; name: string; joinedAt: number; isHost: boolean }>;
  state: any;
}

const activeRooms = new Map<string, RoomSession>();

// Cleanup stale rooms (inactive > 4 hours)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of activeRooms.entries()) {
    if (now - room.updatedAt > 4 * 60 * 60 * 1000) {
      activeRooms.delete(roomId);
    }
  }
}, 30 * 60 * 1000);

export const relayPlugin: GalaxyPlugin = {
  id: 'relay',
  name: 'P2P Signaling & Room Relay',
  version: '1.0.0',
  description: 'Lightweight room coordinator and WebRTC signaling relay for all Galaxy games',

  init(app: Hono, _config: ServerConfig) {
    // Create or get room
    app.post('/api/relay/rooms', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const roomId = body.roomId || Math.random().toString(36).substring(2, 9).toUpperCase();
      const hostId = body.hostId || `host_${Math.random().toString(36).substring(2, 8)}`;
      const gameType = body.gameType || 'generic';

      let room = activeRooms.get(roomId);
      if (!room) {
        room = {
          roomId,
          hostId,
          gameType,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          players: new Map(),
          state: body.initialState || null,
        };
        activeRooms.set(roomId, room);
      }

      if (body.hostName) {
        room.players.set(hostId, {
          id: hostId,
          name: body.hostName,
          joinedAt: Date.now(),
          isHost: true,
        });
      }

      return c.json({
        success: true,
        roomId,
        hostId,
        players: Array.from(room.players.values()),
        state: room.state,
      });
    });

    // Get room details
    app.get('/api/relay/rooms/:roomId', (c) => {
      const roomId = c.req.param('roomId');
      const room = activeRooms.get(roomId);
      if (!room) {
        return c.json({ error: 'Room not found' }, 404);
      }
      return c.json({
        roomId: room.roomId,
        hostId: room.hostId,
        gameType: room.gameType,
        players: Array.from(room.players.values()),
        state: room.state,
        updatedAt: room.updatedAt,
      });
    });

    // Join room
    app.post('/api/relay/rooms/:roomId/join', async (c) => {
      const roomId = c.req.param('roomId');
      const body = await c.req.json().catch(() => ({}));
      const playerId = body.playerId || `p_${Math.random().toString(36).substring(2, 8)}`;
      const playerName = body.playerName || 'Player';

      const room = activeRooms.get(roomId);
      if (!room) {
        return c.json({ error: 'Room not found' }, 404);
      }

      room.players.set(playerId, {
        id: playerId,
        name: playerName,
        joinedAt: Date.now(),
        isHost: playerId === room.hostId,
      });
      room.updatedAt = Date.now();

      return c.json({
        success: true,
        roomId,
        playerId,
        players: Array.from(room.players.values()),
        state: room.state,
      });
    });

    // Leave room
    app.post('/api/relay/rooms/:roomId/leave', async (c) => {
      const roomId = c.req.param('roomId');
      const body = await c.req.json().catch(() => ({}));
      const playerId = body.playerId;

      const room = activeRooms.get(roomId);
      if (room && playerId) {
        room.players.delete(playerId);
        room.updatedAt = Date.now();
      }

      return c.json({ success: true });
    });

    // Sync state
    app.post('/api/relay/rooms/:roomId/state', async (c) => {
      const roomId = c.req.param('roomId');
      const body = await c.req.json().catch(() => ({}));
      const room = activeRooms.get(roomId);
      if (!room) {
        return c.json({ error: 'Room not found' }, 404);
      }

      if (body.state) {
        room.state = body.state;
        room.updatedAt = Date.now();
      }

      return c.json({
        success: true,
        state: room.state,
        players: Array.from(room.players.values()),
      });
    });
  },
};
