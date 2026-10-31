import { describe, expect, it } from 'vitest';
import type { Song } from '../db';
import {
  decodeTvChunk,
  encodeTvChunk,
  localMediaOf,
  TV_ACK_EVERY,
  TV_CHUNK_BYTES,
  TvMediaAssembler,
  TvMediaSender,
  withAbsoluteMediaUrls,
  type TvMediaMessage,
} from './tvMediaTransfer';

const handleFor = (file: File) => ({ getFile: async () => file }) as unknown as Song['audio'];

const bytesOf = (length: number, seed = 1) => {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) bytes[index] = (index * 31 + seed) % 256;
  return bytes;
};

/** `toEqual` is too slow for megabytes. */
const sameBytes = async (file: File, bytes: Uint8Array) =>
  Buffer.from(await file.arrayBuffer()).equals(Buffer.from(bytes));

/** Connects a sender to an assembler the way the Presentation connection does. */
function connect() {
  const sender = new TvMediaSender();
  const assembler = new TvMediaAssembler();
  const chunks: ArrayBuffer[] = [];
  const types: string[] = [];
  const post = (message: TvMediaMessage) => {
    if (typeof message === 'string') {
      const { type, payload } = JSON.parse(message);
      types.push(type);
      if (type === 'MEDIA_START') assembler.start(payload);
      if (type === 'MEDIA_END') assembler.finish(payload.transferId);
      return;
    }
    chunks.push(message);
    const ack = assembler.addChunk(message);
    if (ack !== null) queueMicrotask(() => sender.onAck(ack));
  };
  return { sender, assembler, post, chunks, types };
}

describe('localMediaOf', () => {
  it('finds handles and Blobs, ignores URLs', () => {
    const handle = handleFor(new File(['a'], 'a.mp3'));
    const video = new Blob(['v']);
    const media = localMediaOf({ audio: handle, video, vocalsAudio: 'https://x/y.mp3' });
    expect(media.map((entry) => entry.fields)).toEqual([['audio'], ['video']]);
  });

  it('merges fields that share one file', () => {
    const handle = handleFor(new File(['a'], 'a.mp3'));
    expect(localMediaOf({ audio: handle, originalAudio: handle })).toHaveLength(1);
    expect(localMediaOf({ audio: handle, originalAudio: handle })[0].fields).toEqual([
      'audio',
      'originalAudio',
    ]);
  });

  it('skips a handle that JSON already flattened', () => {
    expect(localMediaOf({ audio: {} as unknown as Song['audio'] })).toEqual([]);
  });
});

describe('withAbsoluteMediaUrls', () => {
  const helper = 'https://helper.example.com';

  it('resolves media paths with the token', () => {
    const song = withAbsoluteMediaUrls({ audio: '/media?path=a.mp3' }, helper, 't k');
    expect(song.audio).toBe(`${helper}/media?path=a.mp3&token=t%20k`);
  });

  it('adds no token without one', () => {
    expect(withAbsoluteMediaUrls({ audio: '/media/a.mp3' }, helper, '').audio).toBe(
      `${helper}/media/a.mp3`,
    );
  });

  it('keeps absolute URLs and relative file names', () => {
    const song = withAbsoluteMediaUrls(
      { audio: 'https://cdn.example.com/a.mp3', video: 'clip.mp4' },
      helper,
      'x',
    );
    expect(song).toEqual({ audio: 'https://cdn.example.com/a.mp3', video: 'clip.mp4' });
  });
});

describe('TV chunks', () => {
  it('round-trips ids and bytes', () => {
    const bytes = bytesOf(100);
    const decoded = decodeTvChunk(encodeTvChunk(7, 2, bytes));
    expect(decoded.transferId).toBe(7);
    expect(decoded.fileIndex).toBe(2);
    expect(decoded.bytes).toEqual(bytes);
  });
});

describe('song media transfer', () => {
  it('rebuilds files byte for byte, with name and type', async () => {
    const audioBytes = bytesOf(TV_CHUNK_BYTES * TV_ACK_EVERY * 2 + 123);
    const videoBytes = bytesOf(TV_CHUNK_BYTES + 5, 9);
    const audio = handleFor(new File([audioBytes], 'song.mp3', { type: 'audio/mpeg' }));
    const video = handleFor(new File([videoBytes], 'clip.mp4', { type: 'video/mp4' }));
    const song = { id: 's1', audio, originalAudio: audio, video };

    const { sender, assembler, post, types } = connect();
    await expect(sender.send(song, post)).resolves.toBe(true);
    expect(types).toEqual(['MEDIA_START', 'MEDIA_END']);

    // What arrives at the TV: JSON has dropped the handles
    const rebuilt = assembler.applyTo(JSON.parse(JSON.stringify(song)));
    expect(rebuilt.audio).toBe(rebuilt.originalAudio);
    expect(rebuilt.audio.name).toBe('song.mp3');
    expect(rebuilt.audio.type).toBe('audio/mpeg');
    expect(await sameBytes(rebuilt.audio, audioBytes)).toBe(true);
    expect(await sameBytes(rebuilt.video, videoBytes)).toBe(true);
  });

  it('sends no chunk over the window until the TV confirms', async () => {
    const file = new File([bytesOf(TV_CHUNK_BYTES * (TV_ACK_EVERY + 1))], 'a.mp3');
    const chunks: ArrayBuffer[] = [];
    const sender = new TvMediaSender();
    const sending = sender.send({ id: 's1', audio: handleFor(file) }, (message) => {
      if (typeof message !== 'string') chunks.push(message);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(chunks).toHaveLength(TV_ACK_EVERY);

    sender.onAck(TV_ACK_EVERY);
    await expect(sending).resolves.toBe(true);
    expect(chunks).toHaveLength(TV_ACK_EVERY + 1);
  });

  it('does not send a song twice, but sends it again to a new TV', async () => {
    const song = { id: 's1', audio: handleFor(new File(['abc'], 'a.mp3')) };
    const { sender, post, types } = connect();
    await sender.send(song, post);
    await sender.send(song, post);
    expect(types).toEqual(['MEDIA_START', 'MEDIA_END']);

    sender.reset();
    await sender.send(song, post);
    expect(types).toHaveLength(4);
  });

  it('shares a running transfer of the same song', async () => {
    const song = { id: 's1', audio: handleFor(new File(['abc'], 'a.mp3')) };
    const { sender, post, types } = connect();
    await Promise.all([sender.send(song, post), sender.send(song, post)]);
    expect(types).toEqual(['MEDIA_START', 'MEDIA_END']);
  });

  it('a newer song replaces a running transfer', async () => {
    const big = new File([bytesOf(TV_CHUNK_BYTES * TV_ACK_EVERY * 2)], 'big.mp3');
    const { sender, assembler, post } = connect();
    const posted: string[] = [];
    const logged = (message: TvMediaMessage) => {
      if (typeof message === 'string') {
        posted.push(JSON.parse(message).type);
        post(message);
      }
      // Binary chunks of the first song stay unconfirmed, so it hangs at its first window
    };
    const first = sender.send({ id: 'first', audio: handleFor(big) }, logged);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = { id: 'second', audio: handleFor(new File(['abc'], 'b.mp3')) };
    await expect(sender.send(second, post)).resolves.toBe(true);
    await expect(first).resolves.toBe(false);

    const rebuilt = assembler.applyTo({ id: 'second' } as { id: string; audio?: File });
    expect(await rebuilt.audio?.text()).toBe('abc');
    expect(assembler.applyTo({ id: 'first' })).toEqual({ id: 'first' });
  });

  it('ignores chunks and the end of a replaced transfer', () => {
    const assembler = new TvMediaAssembler();
    assembler.start({
      transferId: 2,
      songId: 's2',
      files: [{ fields: ['audio'], name: 'a', type: '' }],
    });
    expect(assembler.addChunk(encodeTvChunk(1, 0, bytesOf(10)))).toBeNull();
    assembler.finish(1);
    expect(assembler.applyTo({ id: 's2' })).toEqual({ id: 's2' });
  });

  it('leaves other songs untouched', async () => {
    const { sender, assembler, post } = connect();
    await sender.send({ id: 's1', audio: handleFor(new File(['a'], 'a.mp3')) }, post);
    expect(assembler.applyTo({ id: 'other' })).toEqual({ id: 'other' });
  });
});
