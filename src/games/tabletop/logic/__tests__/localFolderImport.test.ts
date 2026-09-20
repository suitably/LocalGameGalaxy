import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supportsLocalFolderImport, pickAndLoadGameFolder } from '../localFolderImport';

describe('localFolderImport', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
    (globalThis as unknown as { window: unknown }).window = {
      showDirectoryPicker: undefined,
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('detects if showDirectoryPicker is supported', () => {
    (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = undefined;
    expect(supportsLocalFolderImport()).toBe(false);

    (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = vi.fn();
    expect(supportsLocalFolderImport()).toBe(true);
  });

  it('throws when showDirectoryPicker is not supported', async () => {
    (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker = undefined;
    await expect(pickAndLoadGameFolder()).rejects.toThrow(
      'File System Access API wird von diesem Browser nicht unterstützt',
    );
  });

  it('reads directory with json and assets and returns TabletopGameDefinition', async () => {
    const validGameJson = JSON.stringify({
      name: 'Test BYOG Game',
      table: { width: 1600, height: 1000 },
      widgets: {
        card1: { id: 'card1', type: 'card', value: 'Ace' },
      },
    });

    const mockJsonFile = {
      text: vi.fn().mockResolvedValue(validGameJson),
    };
    const mockImageFile = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    const mockHandles = [
      ['game.json', { kind: 'file', getFile: () => Promise.resolve(mockJsonFile) }],
      ['board.png', { kind: 'file', getFile: () => Promise.resolve(mockImageFile) }],
    ];

    const mockDirHandle = {
      name: 'MyBoardGame',
      kind: 'directory',
      [Symbol.asyncIterator]: () => {
        let index = 0;
        return {
          async next() {
            if (index < mockHandles.length) {
              return { value: mockHandles[index++], done: false };
            }
            return { value: undefined, done: true };
          },
        };
      },
    };

    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi
      .fn()
      .mockResolvedValue(mockDirHandle);

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');

    const result = await pickAndLoadGameFolder();
    expect(result.name).toBe('Test BYOG Game');
    expect(result.widgets).toBeDefined();
    expect(result.assetFiles).toBeDefined();
    expect(result.assetFiles!['board.png']).toBe('blob:mock-url');
  });

  it('throws error when no json file is found in directory', async () => {
    const mockHandles = [
      [
        'readme.txt',
        {
          kind: 'file',
          getFile: () =>
            Promise.resolve({
              text: () => Promise.resolve('hello'),
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(5)),
            }),
        },
      ],
    ];

    const mockDirHandle = {
      name: 'EmptyFolder',
      kind: 'directory',
      [Symbol.asyncIterator]: () => {
        let index = 0;
        return {
          async next() {
            if (index < mockHandles.length) {
              return { value: mockHandles[index++], done: false };
            }
            return { value: undefined, done: true };
          },
        };
      },
    };

    (window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi
      .fn()
      .mockResolvedValue(mockDirHandle);

    await expect(pickAndLoadGameFolder()).rejects.toThrow('Keine JSON-Datei im Ordner gefunden');
  });
});
