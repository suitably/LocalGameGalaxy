/**
 * Moves a song's local media to a cast TV. The TV runs in its own storage partition, so file
 * handles and `blob:` URLs mean nothing there and a JSON message drops them. The bytes travel as
 * binary chunks over the PresentationConnection instead, and the TV rebuilds real Files.
 */
import type { Song } from '../db';

const MEDIA_FIELDS = [
  'audio',
  'originalAudio',
  'instrumentalAudio',
  'vocalsAudio',
  'video',
] as const;
type MediaField = (typeof MEDIA_FIELDS)[number];
type SongMedia = Partial<Record<MediaField, File>>;

/** Small enough for every connection's message limit. */
export const TV_CHUNK_BYTES = 32 * 1024;
/** The sender waits for the TV after this many chunks, so memory on both sides stays bounded. */
export const TV_ACK_EVERY = 64;
const ACK_TIMEOUT_MS = 15000;
/** The TV folds chunks into a Blob at this size, which the browser may keep on disk. */
const COMPACT_BYTES = 16 * 1024 * 1024;
const HEADER_BYTES = 8;

interface FileHandleLike {
  getFile: () => Promise<File>;
}
type MediaSource = Blob | FileHandleLike;

export interface TvMediaFile {
  /** Fields this file fills; `audio` and `originalAudio` usually share one. */
  fields: MediaField[];
  name: string;
  type: string;
}

export interface TvMediaManifest {
  transferId: number;
  songId: string;
  files: TvMediaFile[];
}

export type TvMediaMessage = string | ArrayBuffer;

const isMediaSource = (value: unknown): value is MediaSource =>
  value instanceof Blob ||
  (typeof value === 'object' &&
    value !== null &&
    typeof (value as FileHandleLike).getFile === 'function');

/** The song's media that only exists on this device, one entry per distinct file. */
export function localMediaOf(song: Partial<Song>): { fields: MediaField[]; source: MediaSource }[] {
  const entries: { fields: MediaField[]; source: MediaSource }[] = [];
  for (const field of MEDIA_FIELDS) {
    const source: unknown = song[field];
    if (!isMediaSource(source)) continue;
    const known = entries.find((entry) => entry.source === source);
    if (known) known.fields.push(field);
    else entries.push({ fields: [field], source });
  }
  return entries;
}

/**
 * Server media paths resolved for a TV that has no companion settings of its own. Absolute URLs
 * stay as they are; `/media` paths get the token, as `useMediaLoaders` does for the host.
 */
export function withAbsoluteMediaUrls<T extends Partial<Song>>(
  song: T,
  helperUrl: string,
  token: string,
): T {
  const resolved: Partial<Song> = { ...song };
  for (const field of MEDIA_FIELDS) {
    const value = song[field];
    if (typeof value !== 'string' || !value.startsWith('/')) continue;
    const url = `${helperUrl}${value}`;
    const needsToken = token && url.includes('/media') && !url.includes('token=');
    resolved[field] = needsToken
      ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : url;
  }
  return resolved as T;
}

export function encodeTvChunk(
  transferId: number,
  fileIndex: number,
  bytes: Uint8Array,
): ArrayBuffer {
  const chunk = new Uint8Array(HEADER_BYTES + bytes.byteLength);
  const header = new DataView(chunk.buffer);
  header.setUint32(0, transferId);
  header.setUint32(4, fileIndex);
  chunk.set(bytes, HEADER_BYTES);
  return chunk.buffer;
}

export function decodeTvChunk(chunk: ArrayBuffer) {
  const header = new DataView(chunk);
  return {
    transferId: header.getUint32(0),
    fileIndex: header.getUint32(4),
    bytes: new Uint8Array(chunk, HEADER_BYTES),
  };
}

/** Host side: sends a song's local media; a newer song replaces a running transfer. */
export class TvMediaSender {
  private transferId = 0;
  private sentSongId: string | null = null;
  private running: { songId: string; result: Promise<boolean> } | null = null;
  private ack: { until: number; resolve: () => void; reject: (e: Error) => void } | null = null;

  /** Whether the TV still needs bytes for this song. */
  needsTransfer(song: Partial<Song>): boolean {
    return song.id !== this.sentSongId && localMediaOf(song).length > 0;
  }

  /** Resolves true when the TV has the media, false when a newer song replaced this one. */
  send(song: Partial<Song> & { id: string }, post: (message: TvMediaMessage) => void) {
    if (this.running?.songId === song.id) return this.running.result;
    if (!this.needsTransfer(song)) return Promise.resolve(true);

    const transferId = this.cancel();
    const result = this.transfer(song, transferId, post).finally(() => {
      if (this.transferId === transferId) this.running = null;
    });
    this.running = { songId: song.id, result };
    return result;
  }

  /** The TV confirmed `received` chunks. */
  onAck(received: number) {
    if (this.ack && received >= this.ack.until) this.ack.resolve();
  }

  /** The connection changed: stop, and assume the next TV has nothing. */
  reset() {
    this.cancel();
    this.sentSongId = null;
  }

  private cancel() {
    this.transferId += 1;
    this.running = null;
    this.ack?.reject(new Error('TV media transfer cancelled'));
    return this.transferId;
  }

  private waitForAck(until: number) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('TV stopped responding')), ACK_TIMEOUT_MS);
      const done = () => {
        clearTimeout(timeout);
        this.ack = null;
      };
      this.ack = {
        until,
        resolve: () => {
          done();
          resolve();
        },
        reject: (error) => {
          done();
          reject(error);
        },
      };
    });
  }

  private async transfer(
    song: Partial<Song> & { id: string },
    transferId: number,
    post: (message: TvMediaMessage) => void,
  ): Promise<boolean> {
    const isCurrent = () => this.transferId === transferId;
    const sources = localMediaOf(song);
    const blobs = await Promise.all(
      sources.map(({ source }) => (source instanceof Blob ? source : source.getFile())),
    );
    if (!isCurrent()) return false;

    const files = sources.map(({ fields }, index) => {
      const blob = blobs[index];
      return { fields, name: blob instanceof File ? blob.name : fields[0], type: blob.type };
    });
    const manifest: TvMediaManifest = { transferId, songId: song.id, files };
    post(JSON.stringify({ type: 'MEDIA_START', payload: manifest }));

    let sent = 0;
    const windowBytes = TV_CHUNK_BYTES * TV_ACK_EVERY;
    try {
      for (const [fileIndex, blob] of blobs.entries()) {
        for (let start = 0; start < blob.size; start += windowBytes) {
          const part = new Uint8Array(await blob.slice(start, start + windowBytes).arrayBuffer());
          if (!isCurrent()) return false;
          for (let offset = 0; offset < part.byteLength; offset += TV_CHUNK_BYTES) {
            const bytes = part.subarray(offset, offset + TV_CHUNK_BYTES);
            post(encodeTvChunk(transferId, fileIndex, bytes));
            sent += 1;
            if (sent % TV_ACK_EVERY === 0) await this.waitForAck(sent);
          }
        }
      }
    } catch (error) {
      if (!isCurrent()) return false;
      throw error;
    }

    post(JSON.stringify({ type: 'MEDIA_END', payload: { transferId } }));
    this.sentSongId = song.id;
    return true;
  }
}

/** TV side: rebuilds the files of the current transfer and keeps the last finished song. */
export class TvMediaAssembler {
  private manifest: TvMediaManifest | null = null;
  private stored: BlobPart[][] = [];
  private pending: Uint8Array[][] = [];
  private pendingBytes = 0;
  private received = 0;
  private finished: { songId: string; media: SongMedia } | null = null;

  start(manifest: TvMediaManifest) {
    this.manifest = manifest;
    this.stored = manifest.files.map(() => []);
    this.pending = manifest.files.map(() => []);
    this.pendingBytes = 0;
    this.received = 0;
  }

  /** Stores a chunk; returns the chunk count when the sender is waiting for a confirmation. */
  addChunk(chunk: ArrayBuffer): number | null {
    const { transferId, fileIndex, bytes } = decodeTvChunk(chunk);
    if (transferId !== this.manifest?.transferId || !this.pending[fileIndex]) return null;
    this.pending[fileIndex].push(bytes);
    this.pendingBytes += bytes.byteLength;
    if (this.pendingBytes >= COMPACT_BYTES) this.compact();
    this.received += 1;
    return this.received % TV_ACK_EVERY === 0 ? this.received : null;
  }

  /** Completes the transfer; a late end of a replaced transfer is ignored. */
  finish(transferId: number) {
    if (transferId !== this.manifest?.transferId) return;
    this.compact();
    const media: SongMedia = {};
    this.manifest.files.forEach(({ fields, name, type }, index) => {
      const file = new File(this.stored[index], name, { type });
      fields.forEach((field) => {
        media[field] = file;
      });
    });
    this.finished = { songId: this.manifest.songId, media };
    this.manifest = null;
    this.stored = [];
    this.pending = [];
  }

  /** The song with its transferred media in place of what JSON dropped. */
  applyTo<T extends { id: string }>(song: T): T {
    return this.finished?.songId === song.id ? { ...song, ...this.finished.media } : song;
  }

  private compact() {
    this.pending.forEach((parts, index) => {
      if (parts.length > 0) this.stored[index].push(new Blob(parts as BlobPart[]));
      this.pending[index] = [];
    });
    this.pendingBytes = 0;
  }
}
