import { describe, expect, it } from 'vitest';
import { buildScreenUrl, canTryPresentation, screenOptions, screenOrigin } from './secondScreen';
import { PUBLIC_APP_URL } from './publicAppUrl';

const web = {
  native: false,
  android: false,
  mobile: false,
  hasPresentationApi: true,
  origin: 'http://192.168.1.5:5173',
};

describe('secondScreen', () => {
  it('uses the page origin on the web and the hosted app in the native shell', () => {
    expect(screenOrigin(web)).toBe('http://192.168.1.5:5173');
    expect(screenOrigin({ native: true, origin: 'https://localhost' })).toBe(PUBLIC_APP_URL);
  });

  it('joins origin and route with exactly one slash', () => {
    expect(buildScreenUrl('/games/tabletop?room=AB&role=screen', web)).toBe(
      'http://192.168.1.5:5173/games/tabletop?room=AB&role=screen',
    );
    expect(buildScreenUrl('games/x', { native: false, origin: 'https://a.de/' })).toBe(
      'https://a.de/games/x',
    );
  });

  it('offers Presentation API casting only on desktop browsers that have it', () => {
    expect(canTryPresentation(web)).toBe(true);
    expect(canTryPresentation({ ...web, android: true })).toBe(false);
    expect(canTryPresentation({ ...web, native: true })).toBe(false);
    expect(canTryPresentation({ ...web, hasPresentationApi: false })).toBe(false);
  });

  it('offers cast and a separate window on desktop, share and mirroring on phones', () => {
    const opts = { canShare: true, mirrorSafe: true };
    expect(screenOptions(web, opts)).toEqual(['cast', 'window']);
    expect(screenOptions({ ...web, hasPresentationApi: false }, opts)).toEqual(['window']);
    const phone = { ...web, android: true, mobile: true };
    expect(screenOptions(phone, opts)).toEqual(['share', 'mirror']);
    expect(screenOptions({ ...phone, native: true }, opts)).toEqual(['share', 'mirror']);
  });

  it('never offers mirroring when this screen shows private cards', () => {
    const phone = { ...web, android: true, mobile: true };
    expect(screenOptions(phone, { canShare: false, mirrorSafe: false })).toEqual([]);
  });
});
