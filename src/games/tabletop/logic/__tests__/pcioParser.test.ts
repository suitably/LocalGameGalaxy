import { describe, it, expect } from 'vitest';
import { parsePcioFile } from '../pcioParser';
import { validateAndSanitizeGame } from '../gameValidator';
import type { HolderWidget, CardWidget } from '../types';
import { zipSync, strToU8 } from 'fflate';

describe('Tabletop pcioParser', () => {
  it('parses valid JSON game definitions', async () => {
    const rawJson = JSON.stringify({
      name: 'Mau-Mau Test',
      author: 'Tester',
      minPlayers: 2,
      maxPlayers: 5,
      widgets: {
        deck1: {
          id: 'deck1',
          type: 'deck',
          x: 400,
          y: 300,
          cardIds: ['c1', 'c2'],
        },
        hand1: {
          id: 'hand1',
          type: 'cardhand',
          x: 100,
          y: 700,
          seat: 0,
          childIds: ['c1'],
        },
      },
    });

    const result = await parsePcioFile(rawJson);
    expect(result.name).toBe('Mau-Mau Test');
    expect(result.author).toBe('Tester');
    expect(result.widgets.deck1.type).toBe('deck');
    expect(result.widgets.hand1.type).toBe('holder');
    expect(result.widgets.hand1.ownerSeat).toBe(0);
    expect(result.supportedModes).toContain('party_multi_device');
  });

  it('unpacks and normalizes a zipped .pcio archive', async () => {
    const templateContent = JSON.stringify({
      name: 'Zipped Game',
      widgets: {
        discard: {
          id: 'discard',
          type: 'holder',
          dropTarget: true,
          childIds: [],
        },
      },
    });

    const zipBytes = zipSync({
      'template.json': strToU8(templateContent),
      'card.png': new Uint8Array([137, 80, 78, 71]), // dummy png header
    });

    const result = await parsePcioFile(zipBytes.buffer);
    expect(result.name).toBe('Zipped Game');
    expect((result.widgets.discard as HolderWidget).dropTarget).toBe(true);
    expect(result.assetFiles?.['card.png']).toBeDefined();
    expect(result.assetFiles?.['card.png']).toContain('data:image/png;base64,');
  });

  it('maps assetFiles to card faces, backs, and table background', async () => {
    const templateContent = JSON.stringify({
      name: 'Asset Game',
      table: {
        background: 'assets/felt.png',
      },
      widgets: {
        ace: {
          id: 'ace',
          type: 'card',
          frontImage: 'card_ace.png',
          backImage: 'card_back.png',
        },
      },
    });

    const zipBytes = zipSync({
      'template.json': strToU8(templateContent),
      'assets/felt.png': new Uint8Array([137, 80, 78, 71]),
      'card_ace.png': new Uint8Array([137, 80, 78, 71]),
      'card_back.png': new Uint8Array([137, 80, 78, 71]),
    });

    const result = await parsePcioFile(zipBytes.buffer);
    expect(result.table.backgroundImageUrl).toContain('data:image/png;base64,');
    const ace = result.widgets.ace as CardWidget;
    expect(ace.frontContent?.type).toBe('image');
    expect(ace.frontContent?.value).toContain('data:image/png;base64,');
    expect(ace.backContent?.type).toBe('image');
    expect(ace.backContent?.value).toContain('data:image/png;base64,');
  });

  it('sanitizes missing IDs, invalid bounds and sets sensible defaults', () => {
    const sanitized = validateAndSanitizeGame({
      name: '',
      minPlayers: -5,
      widgets: {
        w1: { id: '', type: 'card', x: -10, y: -10 } as unknown as CardWidget,
      },
    });

    expect(sanitized.name).toBe('Unbenanntes Spiel');
    expect(sanitized.minPlayers).toBe(1);
    expect(sanitized.table.width).toBeGreaterThanOrEqual(1600);
    expect(sanitized.widgets.w1.id).toBe('w1');
  });
});
