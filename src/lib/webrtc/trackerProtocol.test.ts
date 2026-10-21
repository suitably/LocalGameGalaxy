import { describe, it, expect, vi } from 'vitest';
import {
  decodeNdjsonChunk,
  filterTrackerUrls,
  generatePeerId,
  stringToInfoHash,
} from './trackerProtocol';

describe('trackerProtocol', () => {
  it('stringToInfoHash is deterministic, 20 bytes, repeating the UTF-8 bytes', () => {
    const hash = stringToInfoHash('ab');
    expect(hash).toHaveLength(20);
    expect(Array.from(hash.slice(0, 4))).toEqual([97, 98, 97, 98]);
    expect(stringToInfoHash('party-1')).toEqual(stringToInfoHash('party-1'));
    expect(stringToInfoHash('party-1')).not.toEqual(stringToInfoHash('party-2'));
  });

  it('generatePeerId has the fixed prefix and 20 random hex chars', () => {
    const id = generatePeerId();
    expect(id).toHaveLength(40);
    expect(id.startsWith('01234567890123456789')).toBe(true);
    expect(id.slice(20)).toMatch(/^[0-9a-f]{20}$/);
    expect(generatePeerId()).not.toBe(id);
  });

  it('decodes multi-line chunks and skips blank lines', () => {
    expect(decodeNdjsonChunk('{"a":1}\n\n  \n{"b":2}\n')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('accepts Uint8Array input', () => {
    const bytes = new TextEncoder().encode('{"type":"host_hello"}\n');
    expect(decodeNdjsonChunk(bytes)).toEqual([{ type: 'host_hello' }]);
  });

  it('reports malformed lines and keeps the rest of the chunk', () => {
    const onInvalid = vi.fn();
    expect(decodeNdjsonChunk('{"a":1}\nnot json\n{"b":2}', onInvalid)).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
    expect(onInvalid).toHaveBeenCalledWith('not json', expect.any(SyntaxError));
  });

  it('does not buffer partial lines across chunks', () => {
    expect(decodeNdjsonChunk('{"a":')).toEqual([]);
    expect(decodeNdjsonChunk('1}')).toEqual([]);
  });

  describe('filterTrackerUrls', () => {
    const urls = [
      'ws://tracker.example',
      'wss://b.example',
      'ws://localhost:8000',
      'ws://192.168.1.5:8000',
      'wss://b.example',
    ];

    it('upgrades ws to wss on https and drops local trackers on a public page', () => {
      expect(filterTrackerUrls(urls, { isSecure: true, hostname: 'nexumia.de' })).toEqual([
        'wss://tracker.example',
        'wss://b.example',
      ]);
    });

    it('keeps local trackers and ws on a local http page', () => {
      expect(filterTrackerUrls(urls, { isSecure: false, hostname: 'localhost' })).toEqual([
        'ws://tracker.example',
        'wss://b.example',
        'ws://localhost:8000',
        'ws://192.168.1.5:8000',
      ]);
    });
  });
});
