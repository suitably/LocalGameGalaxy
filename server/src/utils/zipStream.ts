import fs from 'node:fs';
import zlib from 'node:zlib';

/**
 * A ZIP archive streamed file by file, without compression ("stored"): song folders hold audio
 * and compressed scores (`.mxl`, `.gp`), which do not shrink, and nothing is buffered in memory.
 * Sizes are known from `stat`, so the archive length is known before the first byte; the CRC
 * follows each file in a data descriptor. No ZIP64: archives up to 4 GiB.
 */

export interface ZipEntry {
  /** Path inside the archive, `/`-separated. */
  name: string;
  /** File on disk. */
  path: string;
  size: number;
  mtime: Date;
}

const LOCAL_HEADER = 30;
const DESCRIPTOR = 16;
const CENTRAL_HEADER = 46;
const END_RECORD = 22;
/** Bit 3: CRC and sizes follow in a data descriptor; bit 11: names are UTF-8. */
const FLAGS = 0x0808;
export const MAX_ZIP_BYTES = 0xffffffff;

/** MS-DOS time and date of a file (local time, 2-second steps, 1980 at the earliest). */
function dosTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Byte length of the archive for these entries. */
export function zipSize(entries: ZipEntry[]): number {
  return (
    entries.reduce(
      (sum, e) =>
        sum + LOCAL_HEADER + DESCRIPTOR + CENTRAL_HEADER + 2 * Buffer.byteLength(e.name) + e.size,
      0,
    ) + END_RECORD
  );
}

function localHeader(name: Buffer, mtime: Date): Buffer {
  const b = Buffer.alloc(LOCAL_HEADER);
  const { time, date } = dosTime(mtime);
  b.writeUInt32LE(0x04034b50, 0);
  b.writeUInt16LE(20, 4); // version needed
  b.writeUInt16LE(FLAGS, 6);
  b.writeUInt16LE(0, 8); // stored
  b.writeUInt16LE(time, 10);
  b.writeUInt16LE(date, 12);
  // CRC and sizes stay 0 here: they are in the data descriptor
  b.writeUInt16LE(name.length, 26);
  return Buffer.concat([b, name]);
}

function descriptor(crc: number, size: number): Buffer {
  const b = Buffer.alloc(DESCRIPTOR);
  b.writeUInt32LE(0x08074b50, 0);
  b.writeUInt32LE(crc, 4);
  b.writeUInt32LE(size, 8);
  b.writeUInt32LE(size, 12);
  return b;
}

interface Written {
  name: Buffer;
  mtime: Date;
  crc: number;
  size: number;
  offset: number;
}

function centralHeader(w: Written): Buffer {
  const b = Buffer.alloc(CENTRAL_HEADER);
  const { time, date } = dosTime(w.mtime);
  b.writeUInt32LE(0x02014b50, 0);
  b.writeUInt16LE(20, 4); // version made by
  b.writeUInt16LE(20, 6); // version needed
  b.writeUInt16LE(FLAGS, 8);
  b.writeUInt16LE(0, 10);
  b.writeUInt16LE(time, 12);
  b.writeUInt16LE(date, 14);
  b.writeUInt32LE(w.crc, 16);
  b.writeUInt32LE(w.size, 20);
  b.writeUInt32LE(w.size, 24);
  b.writeUInt16LE(w.name.length, 28);
  b.writeUInt32LE(w.offset, 42);
  return Buffer.concat([b, w.name]);
}

function endRecord(count: number, centralSize: number, centralOffset: number): Buffer {
  const b = Buffer.alloc(END_RECORD);
  b.writeUInt32LE(0x06054b50, 0);
  b.writeUInt16LE(count, 8);
  b.writeUInt16LE(count, 10);
  b.writeUInt32LE(centralSize, 12);
  b.writeUInt32LE(centralOffset, 16);
  return b;
}

/**
 * The archive's bytes. Each file is read with exactly its `stat` size, so the length matches
 * `zipSize`; a file that shrank meanwhile fails the stream instead of corrupting the archive.
 */
export async function* zipChunks(entries: ZipEntry[]): AsyncGenerator<Buffer> {
  if (entries.length > 0xffff) throw new Error('Too many files for a ZIP archive');
  if (zipSize(entries) > MAX_ZIP_BYTES) throw new Error('Archive larger than 4 GiB');
  const written: Written[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf-8');
    const header = localHeader(name, entry.mtime);
    yield header;
    let crc = 0;
    let read = 0;
    if (entry.size > 0) {
      for await (const chunk of fs.createReadStream(entry.path, { end: entry.size - 1 })) {
        const buf = chunk as Buffer;
        crc = zlib.crc32(buf, crc);
        read += buf.length;
        yield buf;
      }
    }
    if (read !== entry.size) throw new Error(`File changed while zipping: ${entry.name}`);
    yield descriptor(crc, entry.size);
    written.push({ name, mtime: entry.mtime, crc, size: entry.size, offset });
    offset += header.length + entry.size + DESCRIPTOR;
  }
  const central = Buffer.concat(written.map(centralHeader));
  yield central;
  yield endRecord(written.length, central.length, offset);
}
