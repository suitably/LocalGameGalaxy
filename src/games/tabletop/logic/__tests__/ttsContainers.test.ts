import { describe, it, expect } from 'vitest';
import { parseTtsSaveFile } from '../ttsParser';
import { tileShape } from '../ttsContainers';
import { tabletopReducer } from '../tabletopReducer';
import { HEX_CLIP_PATH, type BagWidget, type TokenWidget } from '../types';
import type { TTSObjectState, TTSSaveFile } from '../ttsTypes';

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

const save = (objects: TTSObjectState[]): TTSSaveFile =>
  ({ SaveName: 'T', ObjectStates: objects }) as unknown as TTSSaveFile;

describe('TTS bags, tiles and fog (#449)', () => {
  it('a Bag becomes a finite bag whose contents are hidden items', () => {
    const game = parseTtsSaveFile(
      save([
        obj('bag1', 'Bag', {
          ContainedObjects: [obj('t1', 'Custom_Token'), obj('t2', 'Custom_Token')],
        }),
      ]),
    );
    const bag = game.widgets.bag1 as BagWidget;
    expect(bag).toMatchObject({
      type: 'bag',
      isInfinite: false,
      itemIds: ['t1', 't2'],
      itemCount: 2,
    });
    expect(game.widgets.t1).toBeDefined();

    const state = tabletopReducer(
      { game, flyingCards: [] },
      { type: 'DRAW_FROM_BAG', payload: { bagId: 'bag1' } },
    );
    expect((state.game.widgets.bag1 as BagWidget).itemIds).toEqual(['t1']);
  });

  it('an Infinite_Bag clones its first object on every draw', () => {
    const game = parseTtsSaveFile(
      save([obj('inf', 'Infinite_Bag', { ContainedObjects: [obj('c', 'Custom_Token')] })]),
    );
    const bag = game.widgets.inf as BagWidget;
    expect(bag).toMatchObject({ isInfinite: true });
    expect(bag.templateWidget?.id).toBe('c');
    expect(game.widgets.c).toBeUndefined();

    const drawn = tabletopReducer(
      { game, flyingCards: [] },
      { type: 'DRAW_FROM_BAG', payload: { bagId: 'inf', spawnedId: 'spawn1' } },
    );
    expect(drawn.game.widgets.spawn1).toMatchObject({ type: 'token' });
  });

  it('Custom_Tile shapes map to hex, circle, rounded and box', () => {
    const tile = (Type: number) =>
      obj('x', 'Custom_Tile', { CustomImage: { ImageURL: '', CustomTile: { Type } } });
    expect(tileShape(tile(1))).toEqual({ shape: 'square', clipPath: HEX_CLIP_PATH });
    expect(tileShape(tile(2))).toEqual({ shape: 'circle' });
    expect(tileShape(tile(3)).borderRadius).toBe('18%');
    expect(tileShape(tile(0)).shape).toBe('square');
    const game = parseTtsSaveFile(save([tile(1)]));
    expect((game.widgets.x as TokenWidget).clipPath).toBe(HEX_CLIP_PATH);
  });

  it('a FogOfWarTrigger becomes a hidden zone for its seat', () => {
    const game = parseTtsSaveFile(save([obj('fog1', 'FogOfWarTrigger', { FogColor: 'Red' })]));
    const zone = game.hiddenZones?.fog_fog1;
    expect(zone).toBeDefined();
    expect(typeof zone?.ownerSeat).toBe('number');
  });
});
