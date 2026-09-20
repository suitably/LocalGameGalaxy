/**
 * Local folder import using the File System Access API [ID: GAME-TABLETOP-LOCAL-IMPORT]
 */
import { parsePcioFile } from './pcioParser';
import { detectMimeType } from './pcioAssetUtils';
import type { TabletopGameDefinition } from './types';

interface FileSystemHandleLike {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandleLike extends FileSystemHandleLike {
  kind: 'file';
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandleLike extends FileSystemHandleLike {
  kind: 'directory';
  [Symbol.asyncIterator]?: () => AsyncIterableIterator<[string, FileSystemHandleLike]>;
  entries?: () => AsyncIterableIterator<[string, FileSystemHandleLike]>;
}

/** Returns true if the browser supports the File System Access API */
export function supportsLocalFolderImport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      'function'
  );
}

function iterateDirectory(
  dirHandle: FileSystemDirectoryHandleLike,
): AsyncIterable<[string, FileSystemHandleLike]> {
  if (typeof dirHandle[Symbol.asyncIterator] === 'function') {
    return dirHandle as AsyncIterable<[string, FileSystemHandleLike]>;
  }
  if (typeof dirHandle.entries === 'function') {
    return {
      [Symbol.asyncIterator]: () => dirHandle.entries!(),
    };
  }
  return {
    async *[Symbol.asyncIterator]() {
      // Empty iterator fallback
    },
  };
}

/**
 * Opens a directory picker and imports a game folder.
 * The JSON file + all assets are read locally, assets become blob: Object URLs.
 * These URLs are only valid for the current browser session.
 */
export async function pickAndLoadGameFolder(): Promise<TabletopGameDefinition> {
  const windowWithPicker = window as unknown as {
    showDirectoryPicker: (opts?: Record<string, unknown>) => Promise<FileSystemDirectoryHandleLike>;
  };

  if (!windowWithPicker.showDirectoryPicker) {
    throw new Error('File System Access API wird von diesem Browser nicht unterstützt');
  }

  const dirHandle = await windowWithPicker.showDirectoryPicker({ mode: 'read' });
  const assetFiles: Record<string, string> = {};
  let jsonText: string | null = null;
  const folderName = dirHandle.name;

  for await (const [name, handle] of iterateDirectory(dirHandle)) {
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandleLike;
      const file = await fileHandle.getFile();
      if (name.toLowerCase().endsWith('.json') && jsonText === null) {
        jsonText = await file.text();
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const mime = detectMimeType(bytes, name);
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        assetFiles[name] = blobUrl;
        assetFiles['/' + name] = blobUrl;
        assetFiles['assets/' + name] = blobUrl;
        assetFiles['/assets/' + name] = blobUrl;
      }
    } else if (handle.kind === 'directory' && name === 'assets') {
      const assetsDir = handle as FileSystemDirectoryHandleLike;
      for await (const [assetName, assetHandle] of iterateDirectory(assetsDir)) {
        if (assetHandle.kind === 'file') {
          const assetFile = await (assetHandle as FileSystemFileHandleLike).getFile();
          const arrayBuffer = await assetFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const mime = detectMimeType(bytes, assetName);
          const blob = new Blob([bytes], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          assetFiles[assetName] = blobUrl;
          assetFiles['/' + assetName] = blobUrl;
          assetFiles['assets/' + assetName] = blobUrl;
          assetFiles['/assets/' + assetName] = blobUrl;
        }
      }
    }
  }

  if (!jsonText) {
    throw new Error('Keine JSON-Datei im Ordner gefunden');
  }

  return parsePcioFile(jsonText, { assetFiles, defaultName: folderName });
}
