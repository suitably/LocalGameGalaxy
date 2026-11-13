import { describe, expect, it } from 'vitest';
import {
  QR_CAPACITY,
  QR_LINK_MAX_LENGTH,
  buildSessionLink,
  fitsQrCode,
  pickQrLink,
} from './sessionLink';

const base = {
  appUrl: 'https://example.test/app/',
  basePath: '/games/guessart',
  gameId: 'g1',
  playerId: 'p2',
};

describe('buildSessionLink', () => {
  it('builds a short link without game data', () => {
    expect(buildSessionLink(base)).toBe(
      'https://example.test/app/#/games/guessart?gameId=g1&player=p2',
    );
  });

  it('appends the snapshot and the encoded relay', () => {
    expect(buildSessionLink({ ...base, data: 'ABC', relay: 'https://ntfy.sh/x y' })).toBe(
      'https://example.test/app/#/games/guessart?gameId=g1&player=p2&data=ABC&gameRelay=https%3A%2F%2Fntfy.sh%2Fx%20y',
    );
  });
});

describe('pickQrLink', () => {
  const short = buildSessionLink(base);

  it('keeps a full link that is short enough to scan', () => {
    const full = buildSessionLink({ ...base, data: 'A'.repeat(100) });
    expect(pickQrLink(full, short)).toBe(full);
  });

  it('falls back to the short link for a long snapshot', () => {
    const full = buildSessionLink({ ...base, data: 'A'.repeat(QR_LINK_MAX_LENGTH) });
    expect(pickQrLink(full, short)).toBe(short);
  });
});

describe('fitsQrCode', () => {
  it('rejects links beyond the QR capacity', () => {
    expect(fitsQrCode('a'.repeat(QR_CAPACITY))).toBe(true);
    expect(fitsQrCode('a'.repeat(QR_CAPACITY + 1))).toBe(false);
  });
});
