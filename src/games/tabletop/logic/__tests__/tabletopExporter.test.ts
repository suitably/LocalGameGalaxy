import { describe, expect, it } from 'vitest';
import { buildPcioArchive, serializeGameJson } from '../tabletopExporter';
import { validateAndSanitizeGame, type RawTabletopGameInput } from '../gameValidator';
import { parsePcioFile } from '../pcioParser';

// 1×1 transparent PNG
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const ownGame = () =>
  validateAndSanitizeGame({
    id: 'round-trip',
    name: 'Round Trip',
    description: 'A game made in the editor.',
    minPlayers: 2,
    maxPlayers: 4,
    supportedModes: ['party', 'local'],
    table: { width: 1600, height: 1000 },
    widgets: {
      c1: { id: 'c1', type: 'card', x: 10, y: 20, width: 50, height: 70, zIndex: 3 },
      c2: { id: 'c2', type: 'card', x: 10, y: 20, width: 50, height: 70, zIndex: 1 },
      b1: {
        id: 'b1',
        type: 'button',
        x: 200,
        y: 20,
        width: 80,
        height: 40,
        zIndex: 2,
        text: 'Shuffle',
        routine: [],
      },
    },
    assetFiles: { 'img/back.png': PNG },
  } as unknown as RawTabletopGameInput);

const toArrayBuffer = (u8: Uint8Array): ArrayBuffer =>
  u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

describe('tabletop export → import round trip', () => {
  it('imports a .json export as the same game', async () => {
    const game = ownGame();
    expect(await parsePcioFile(serializeGameJson(game))).toEqual(game);
  });

  it('imports a .pcio export as the same game, images included', async () => {
    const game = ownGame();
    const imported = await parsePcioFile(toArrayBuffer(buildPcioArchive(game)));
    expect(imported).toEqual(game);
    expect(imported.assetFiles?.['img/back.png']).toBe(PNG);
  });
});
