import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredFolderHandle } from '../db';

// In-memory stand-in for the Dexie tables used by folderSync.
const mem = vi.hoisted(() => ({
  songs: [] as { id: string; folderId?: string; fileName: string }[],
  folders: [] as { id: string; name: string; updatedAt: number; handle: unknown }[],
}));

vi.mock('../db', () => ({
  db: {
    songs: {
      where: (field: 'folderId') => ({
        equals: (value: string) => ({
          delete: async () => {
            mem.songs = mem.songs.filter((s) => s[field] !== value);
          },
        }),
      }),
      bulkPut: async (rows: typeof mem.songs) => {
        mem.songs.push(...rows);
      },
    },
    folders: {
      toArray: async () => [...mem.folders],
      put: async (row: (typeof mem.folders)[number]) => {
        mem.folders = [...mem.folders.filter((f) => f.id !== row.id), row];
      },
      update: async (id: string, patch: Partial<(typeof mem.folders)[number]>) => {
        mem.folders = mem.folders.map((f) => (f.id === id ? { ...f, ...patch } : f));
      },
      delete: async (id: string) => {
        mem.folders = mem.folders.filter((f) => f.id !== id);
      },
    },
    transaction: async (_mode: string, ...args: unknown[]) => {
      const fn = args[args.length - 1] as () => Promise<void>;
      await fn();
    },
  },
}));

vi.mock('../deviceSong', async () => {
  const actual = await vi.importActual<typeof import('../deviceSong')>('../deviceSong');
  return {
    isScoreFileName: actual.isScoreFileName,
    // Fake parser: any file whose name contains "broken" cannot be parsed.
    storedSongFromScore: (
      fileName: string,
      _data: ArrayBuffer,
      extra: { id: string; folderId?: string; addedAt: number },
    ) => {
      if (fileName.includes('broken')) throw new Error('unreadable score');
      return { ...extra, fileName, title: fileName, artist: '', baseBpm: 120 };
    },
  };
});

import {
  pickAndSyncFolder,
  removeFolder,
  resyncAllFolders,
  supportsDirectoryPicker,
  syncFilesFromInput,
} from '../folderSync';

const fakeFile = (name: string): File => new File([new Uint8Array([1, 2, 3])], name);

type FakeEntry = { kind: 'file'; name: string } | { kind: 'directory'; name: string; dir: FakeDir };
type FakeDir = { name: string; entries: () => AsyncIterableIterator<[string, unknown]> };

const dir = (name: string, children: (string | FakeDir)[]): FakeDir => {
  const entries: FakeEntry[] = children.map((c) =>
    typeof c === 'string' ? { kind: 'file', name: c } : { kind: 'directory', name: c.name, dir: c },
  );
  return {
    name,
    async *entries() {
      for (const e of entries) {
        yield [
          e.name,
          e.kind === 'file'
            ? { kind: 'file', name: e.name, getFile: async () => fakeFile(e.name) }
            : { ...e.dir, kind: 'directory' },
        ] as [string, unknown];
      }
    },
  };
};

const setPicker = (picker?: unknown) =>
  vi.stubGlobal('window', picker ? { showDirectoryPicker: picker } : {});

const asFileList = (files: File[]) => files as unknown as FileList;
const asHandle = (d: FakeDir) => d as unknown as FileSystemDirectoryHandle;
const names = () => mem.songs.map((s) => s.fileName).sort();

beforeEach(() => {
  mem.songs = [];
  mem.folders = [];
  setPicker();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('supportsDirectoryPicker', () => {
  it('reflects whether showDirectoryPicker exists', () => {
    expect(supportsDirectoryPicker()).toBe(false);
    setPicker(() => undefined);
    expect(supportsDirectoryPicker()).toBe(true);
  });
});

describe('syncFilesFromInput (webkitdirectory fallback)', () => {
  it('imports only supported score files and counts parse errors as skipped', async () => {
    const result = await syncFilesFromInput(
      asFileList([
        fakeFile('a.musicxml'),
        fakeFile('b.MID'),
        fakeFile('notes.txt'),
        fakeFile('cover.png'),
        fakeFile('broken.xml'),
        fakeFile('c.gp'),
      ]),
    );
    expect(result.imported.map((s) => s.fileName)).toEqual(['a.musicxml', 'b.MID', 'c.gp']);
    expect(result.skipped).toBe(1);
    expect(names()).toEqual(['a.musicxml', 'b.MID', 'c.gp']);
    expect(result.imported.every((s) => s.folderId === undefined)).toBe(true);
  });

  it('writes nothing for an empty or unsupported selection', async () => {
    const result = await syncFilesFromInput(asFileList([fakeFile('readme.md')]));
    expect(result).toEqual({ imported: [], skipped: 0 });
    expect(mem.songs).toEqual([]);
  });

  it('assigns a unique id to every imported song', async () => {
    const result = await syncFilesFromInput(asFileList([fakeFile('a.xml'), fakeFile('b.xml')]));
    expect(new Set(result.imported.map((s) => s.id)).size).toBe(2);
  });
});

describe('pickAndSyncFolder', () => {
  const pick = (d: FakeDir) => {
    setPicker(vi.fn(async () => asHandle(d)));
  };

  it('walks subfolders recursively, stores the handle and links songs to the folder', async () => {
    pick(
      dir('Songs', [
        'top.xml',
        'ignore.txt',
        dir('Sub', ['deep.mid', dir('Deeper', ['deepest.mxl', 'broken.gp'])]),
      ]),
    );
    const result = await pickAndSyncFolder();
    expect(result.imported.map((s) => s.fileName).sort()).toEqual([
      'deep.mid',
      'deepest.mxl',
      'top.xml',
    ]);
    expect(result.skipped).toBe(1);
    expect(mem.folders).toHaveLength(1);
    expect(mem.folders[0].name).toBe('Songs');
    expect(result.imported.every((s) => s.folderId === mem.folders[0].id)).toBe(true);
  });

  it('reuses the folder id when a folder with the same name is picked again and replaces its songs', async () => {
    pick(dir('Songs', ['old.xml', 'keep.xml']));
    await pickAndSyncFolder();
    const firstId = mem.folders[0].id;
    mem.songs.push({ id: 'other', folderId: 'someone-else', fileName: 'other.xml' });

    pick(dir('Songs', ['keep.xml', 'new.xml']));
    await pickAndSyncFolder();

    expect(mem.folders).toHaveLength(1);
    expect(mem.folders[0].id).toBe(firstId);
    // old.xml is gone, the other folder's song stays
    expect(names()).toEqual(['keep.xml', 'new.xml', 'other.xml']);
  });

  it('does not touch the library when the directory has no score files', async () => {
    mem.songs.push({ id: 'x', folderId: 'unrelated', fileName: 'x.xml' });
    pick(dir('Empty', ['readme.txt']));
    const result = await pickAndSyncFolder();
    expect(result).toEqual({ imported: [], skipped: 0 });
    expect(names()).toEqual(['x.xml']);
  });

  it('propagates a cancelled picker and stores nothing', async () => {
    setPicker(
      vi.fn(async () => {
        throw new DOMException('cancelled', 'AbortError');
      }),
    );
    await expect(pickAndSyncFolder()).rejects.toThrow('cancelled');
    expect(mem.folders).toEqual([]);
  });
});

describe('resyncAllFolders', () => {
  const stored = (id: string, d: FakeDir, permission: string | Error): StoredFolderHandle => {
    const handle = Object.assign(asHandle(d), {
      requestPermission: vi.fn(async () => {
        if (permission instanceof Error) throw permission;
        return permission;
      }),
    });
    return { id, name: d.name, handle, updatedAt: 1 };
  };

  it('raises every permission prompt before the first file is read', async () => {
    const order: string[] = [];
    const a = stored('fa', dir('A', ['a.xml']), 'granted');
    const b = stored('fb', dir('B', ['b.xml']), 'granted');
    const aHandle = a.handle as unknown as { requestPermission: () => Promise<string> };
    const bHandle = b.handle as unknown as { requestPermission: () => Promise<string> };
    const origEntries = (a.handle as unknown as FakeDir).entries;
    (a.handle as unknown as FakeDir).entries = () => {
      order.push('read');
      return origEntries();
    };
    aHandle.requestPermission = vi.fn(async () => (order.push('perm-a'), 'granted'));
    bHandle.requestPermission = vi.fn(async () => (order.push('perm-b'), 'granted'));

    await resyncAllFolders([a, b]);
    expect(order.slice(0, 2)).toEqual(['perm-a', 'perm-b']);
    expect(order[2]).toBe('read');
  });

  it('syncs granted folders, skips denied ones and aggregates the counts', async () => {
    mem.folders = [
      { id: 'fa', name: 'A', updatedAt: 1, handle: null },
      { id: 'fb', name: 'B', updatedAt: 1, handle: null },
    ];
    mem.songs = [{ id: 'old', folderId: 'fb', fileName: 'stays.xml' }];
    const result = await resyncAllFolders([
      stored('fa', dir('A', ['a1.xml', 'broken.xml', 'a2.mid']), 'granted'),
      stored('fb', dir('B', ['b.xml']), 'denied'),
      stored('fc', dir('C', ['c.xml']), new Error('no prompt')),
    ]);
    expect(result.imported.map((s) => s.fileName)).toEqual(['a1.xml', 'a2.mid']);
    expect(result.skipped).toBe(1);
    // the denied folder keeps its songs, the granted one got its timestamp refreshed
    expect(names()).toEqual(['a1.xml', 'a2.mid', 'stays.xml']);
    expect(mem.folders.find((f) => f.id === 'fa')!.updatedAt).toBeGreaterThan(1);
    expect(mem.folders.find((f) => f.id === 'fb')!.updatedAt).toBe(1);
  });

  it('survives a folder whose directory is gone and continues with the next one', async () => {
    const gone = stored('fx', dir('Gone', []), 'granted');
    (gone.handle as unknown as FakeDir).entries = () => {
      throw new DOMException('not found', 'NotFoundError');
    };
    const result = await resyncAllFolders([gone, stored('fy', dir('Y', ['y.xml']), 'granted')]);
    expect(result.imported.map((s) => s.fileName)).toEqual(['y.xml']);
    expect(console.warn).toHaveBeenCalled();
  });

  it('returns an empty result for no folders', async () => {
    expect(await resyncAllFolders([])).toEqual({ imported: [], skipped: 0 });
  });
});

describe('removeFolder', () => {
  it('removes the folder record and only its songs', async () => {
    mem.folders = [
      { id: 'f1', name: 'One', updatedAt: 1, handle: null },
      { id: 'f2', name: 'Two', updatedAt: 1, handle: null },
    ];
    mem.songs = [
      { id: 's1', folderId: 'f1', fileName: 'one.xml' },
      { id: 's2', folderId: 'f2', fileName: 'two.xml' },
      { id: 's3', fileName: 'loose.xml' },
    ];
    await removeFolder('f1');
    expect(mem.folders.map((f) => f.id)).toEqual(['f2']);
    expect(names()).toEqual(['loose.xml', 'two.xml']);
  });
});
