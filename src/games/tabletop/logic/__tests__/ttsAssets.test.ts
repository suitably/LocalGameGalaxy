import { describe, expect, it } from 'vitest';
import { parseTtsSaveFile, sanitizeTtsUrl } from '../ttsParser';
import type { TTSObjectState, TTSSaveFile } from '../ttsTypes';
import type { BagWidget, TokenWidget } from '../types';

const obj = (GUID: string, Name: string, fields: Partial<TTSObjectState> = {}): TTSObjectState =>
  ({
    GUID,
    Name,
    Transform: {
      posX: 0,
      posY: 1,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
    ...fields,
  }) as TTSObjectState;

const mesh = (DiffuseURL: string) => ({ MeshURL: 'http://h/m.obj', DiffuseURL });

describe('sanitizeTtsUrl (#693)', () => {
  it('rewrites http to https for every host', () => {
    expect(sanitizeTtsUrl('http://i.imgur.com/abc.png')).toBe('https://i.imgur.com/abc.png');
    expect(sanitizeTtsUrl('HTTP://example.org/x.jpg')).toBe('https://example.org/x.jpg');
    expect(sanitizeTtsUrl(' http://pastebin.com/raw/x ')).toBe('https://pastebin.com/raw/x');
  });

  it('maps legacy Steam UGC hosts to the CORS-enabled CDN', () => {
    expect(sanitizeTtsUrl('http://cloud-3.steamusercontent.com/ugc/1/2/')).toBe(
      'https://steamusercontent-a.akamaihd.net/ugc/1/2/',
    );
    expect(sanitizeTtsUrl('http://steamuserimages-a.akamaihd.net/ugc/1/')).toBe(
      'https://steamuserimages-a.akamaihd.net/ugc/1/',
    );
  });

  it('keeps https and non-http values unchanged', () => {
    expect(sanitizeTtsUrl('https://i.imgur.com/a.png')).toBe('https://i.imgur.com/a.png');
    expect(sanitizeTtsUrl('data:image/png;base64,AA')).toBe('data:image/png;base64,AA');
    expect(sanitizeTtsUrl(undefined)).toBe('');
    expect(sanitizeTtsUrl('  ')).toBe('');
  });
});

describe('Custom_Model mapping (D7)', () => {
  const parse = (objects: TTSObjectState[]) =>
    parseTtsSaveFile({ SaveName: 'm', ObjectStates: objects } as unknown as TTSSaveFile);

  it('top level: diffuse texture as sprite, https', () => {
    const game = parse([
      obj('m1', 'Custom_Model', { Nickname: 'Road', CustomMesh: mesh('http://i.imgur.com/r.png') }),
    ]);
    const w = game.widgets.m1 as TokenWidget;
    expect(w.type).toBe('token');
    expect(w.image).toBe('https://i.imgur.com/r.png');
    expect(w.label).toBe('Road');
  });

  it('without texture: labelled token, not a nameless circle', () => {
    const game = parse([obj('m2', 'Custom_Model')]);
    const w = game.widgets.m2 as TokenWidget;
    expect(w.image).toBeUndefined();
    expect(w.labelKey).toBe('games.tabletop.labels.model');
  });

  it('same rule inside bags', () => {
    const game = parse([
      obj('bag', 'Bag', {
        ContainedObjects: [
          obj('m3', 'Custom_Model', { CustomMesh: mesh('http://i.imgur.com/c.png') }),
        ],
      }),
    ]);
    const bag = game.widgets.bag as BagWidget;
    const inside = Object.values(game.widgets).find(
      (w) => w.type === 'token' && (w as TokenWidget).image === 'https://i.imgur.com/c.png',
    );
    expect(inside).toBeDefined();
    expect(bag.type).toBe('bag');
  });

  it('every image URL of the game is https after import', () => {
    const game = parse([
      obj('b', 'Custom_Board', { CustomImage: { ImageURL: 'http://i.imgur.com/board.png' } }),
      obj('m', 'Custom_Model', { CustomMesh: mesh('http://i.imgur.com/m.png') }),
    ]);
    const images = Object.values(game.widgets)
      .map((w) => (w as TokenWidget).image)
      .filter(Boolean);
    expect(images.length).toBe(2);
    expect(images.every((u) => u!.startsWith('https://'))).toBe(true);
  });
});
