/**
 * Built-in WebRTC signaling tracker (WebSocket BitTorrent tracker protocol, as spoken by the
 * `bittorrent-tracker` client in the app). It runs on the companion server's own port at
 * `SIGNALING_PATH`, so a reverse proxy or tunnel that exposes the server also exposes signaling —
 * no second port, no second certificate. Only offers and answers pass through; media and game
 * data flow peer to peer.
 */
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';

export const SIGNALING_PATH = '/signaling';
/** Re-announce interval told to clients, in seconds. */
export const ANNOUNCE_INTERVAL_S = 60;
/** WebSocket ping interval; keeps idle sockets alive behind proxies (Cloudflare closes after 100 s). */
const KEEPALIVE_MS = 30_000;
const MAX_PAYLOAD_BYTES = 256 * 1024;
const MAX_OFFERS_PER_ANNOUNCE = 10;
const MAX_PEERS_PER_SWARM = 200;
const MAX_SWARMS_PER_CONNECTION = 8;
const MAX_SWARMS = 5000;

/** One WebSocket as the hub sees it. */
export interface SignalingConnection {
  send(json: string): void;
  /** Swarms this connection announced to: info hash → its peer id there. */
  swarms: Map<string, string>;
}

interface AnnounceMessage {
  action: 'announce';
  info_hash: string;
  peer_id: string;
  event?: unknown;
  numwant?: unknown;
  offers?: unknown;
  answer?: unknown;
  offer_id?: unknown;
  to_peer_id?: unknown;
}

const isId = (value: unknown): value is string => typeof value === 'string' && value.length === 20;

const parseAnnounce = (raw: string): AnnounceMessage | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const msg = parsed as Record<string, unknown>;
  if (msg.action !== 'announce' || !isId(msg.info_hash) || !isId(msg.peer_id)) return null;
  return msg as unknown as AnnounceMessage;
};

/** Up to `count` random entries of `items` (partial Fisher–Yates, `items` is reordered). */
const pickRandom = <T>(items: T[], count: number, random: () => number): T[] => {
  const n = Math.min(count, items.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (items.length - i));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
};

/** Swarm bookkeeping and message routing, independent of the socket library. */
export class SignalingHub {
  /** info hash → peer id → connection */
  private swarms = new Map<string, Map<string, SignalingConnection>>();

  constructor(private random: () => number = Math.random) {}

  get swarmCount(): number {
    return this.swarms.size;
  }

  peerCount(infoHash: string): number {
    return this.swarms.get(infoHash)?.size ?? 0;
  }

  handleMessage(conn: SignalingConnection, raw: string): void {
    const msg = parseAnnounce(raw);
    if (!msg) return;
    const { info_hash: infoHash, peer_id: peerId } = msg;

    if (msg.event === 'stopped') {
      this.leave(conn, infoHash);
      return;
    }

    const swarm = this.join(conn, infoHash, peerId);
    if (!swarm) {
      conn.send(
        JSON.stringify({
          action: 'announce',
          info_hash: infoHash,
          'failure reason': 'tracker full',
        }),
      );
      return;
    }

    if (msg.answer && isId(msg.to_peer_id) && typeof msg.offer_id === 'string') {
      swarm.get(msg.to_peer_id)?.send(
        JSON.stringify({
          action: 'announce',
          answer: msg.answer,
          offer_id: msg.offer_id,
          peer_id: peerId,
          info_hash: infoHash,
        }),
      );
      return;
    }

    conn.send(
      JSON.stringify({
        action: 'announce',
        interval: ANNOUNCE_INTERVAL_S,
        info_hash: infoHash,
        complete: 0,
        incomplete: swarm.size,
      }),
    );

    const offers = Array.isArray(msg.offers) ? msg.offers.slice(0, MAX_OFFERS_PER_ANNOUNCE) : [];
    if (offers.length === 0) return;
    const others = [...swarm.entries()].filter(([id]) => id !== peerId).map(([, c]) => c);
    pickRandom(others, offers.length, this.random).forEach((target, i) => {
      const entry = offers[i] as { offer?: unknown; offer_id?: unknown } | null;
      if (!entry || !entry.offer || typeof entry.offer_id !== 'string') return;
      target.send(
        JSON.stringify({
          action: 'announce',
          offer: entry.offer,
          offer_id: entry.offer_id,
          peer_id: peerId,
          info_hash: infoHash,
        }),
      );
    });
  }

  /** Removes the connection from every swarm (socket closed). */
  disconnect(conn: SignalingConnection): void {
    for (const infoHash of [...conn.swarms.keys()]) this.leave(conn, infoHash);
  }

  private join(
    conn: SignalingConnection,
    infoHash: string,
    peerId: string,
  ): Map<string, SignalingConnection> | null {
    let swarm = this.swarms.get(infoHash);
    const known = conn.swarms.get(infoHash);
    if (known === peerId && swarm?.get(peerId) === conn) return swarm;

    if (known === undefined && conn.swarms.size >= MAX_SWARMS_PER_CONNECTION) return null;
    if (!swarm) {
      if (this.swarms.size >= MAX_SWARMS) return null;
      swarm = new Map();
      this.swarms.set(infoHash, swarm);
    }
    if (!swarm.has(peerId) && swarm.size >= MAX_PEERS_PER_SWARM) {
      if (swarm.size === 0) this.swarms.delete(infoHash);
      return null;
    }
    // One peer id per connection and swarm; a reconnected peer replaces its old socket's entry.
    if (known !== undefined && known !== peerId && swarm.get(known) === conn) swarm.delete(known);
    swarm.get(peerId)?.swarms.delete(infoHash);
    swarm.set(peerId, conn);
    conn.swarms.set(infoHash, peerId);
    return swarm;
  }

  private leave(conn: SignalingConnection, infoHash: string): void {
    const peerId = conn.swarms.get(infoHash);
    if (peerId === undefined) return;
    conn.swarms.delete(infoHash);
    const swarm = this.swarms.get(infoHash);
    if (!swarm) return;
    if (swarm.get(peerId) === conn) swarm.delete(peerId);
    if (swarm.size === 0) this.swarms.delete(infoHash);
  }
}

/** Serves the tracker on `path` of an existing HTTP server; other upgrade requests are refused. */
export function attachSignaling(server: HttpServer, path: string = SIGNALING_PATH): SignalingHub {
  const hub = new SignalingHub();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_PAYLOAD_BYTES,
    perMessageDeflate: false,
  });

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = (req.url ?? '').split('?')[0].replace(/\/+$/, '');
    if (pathname !== path) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  const alive = new WeakSet<object>();
  wss.on('connection', (ws) => {
    const conn: SignalingConnection = {
      send: (json) => {
        if (ws.readyState === ws.OPEN) ws.send(json);
      },
      swarms: new Map(),
    };
    alive.add(ws);
    ws.on('pong', () => alive.add(ws));
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      try {
        hub.handleMessage(conn, data.toString());
      } catch (err) {
        console.error('[Signaling] Failed to handle message:', err);
      }
    });
    ws.on('close', () => hub.disconnect(conn));
    ws.on('error', () => ws.terminate());
  });

  const keepalive = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
  }, KEEPALIVE_MS);
  keepalive.unref();
  server.on('close', () => {
    clearInterval(keepalive);
    wss.close();
  });

  return hub;
}
