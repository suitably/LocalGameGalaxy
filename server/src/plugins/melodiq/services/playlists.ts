import fs from 'node:fs';
import path from 'node:path';
import type { Playlist } from '../../../core/types';

let playlistsFile = path.join(process.cwd(), 'playlists.json');
let currentPlaylists: Playlist[] = [];

function loadPlaylists(): void {
  const searchPaths = [
    process.cwd(),
    path.dirname(process.execPath),
    path.resolve(path.dirname(process.execPath), '..'),
  ];

  const uniquePaths = [...new Set(searchPaths)];
  let foundPlaylists: string | null = null;

  for (const searchDir of uniquePaths) {
    const p = path.join(searchDir, 'playlists.json');
    if (fs.existsSync(p)) {
      console.log(`[Playlists] Found playlists at: ${p}`);
      playlistsFile = p;
      foundPlaylists = p;
      break;
    }
  }

  if (foundPlaylists) {
    try {
      const fileContent = fs.readFileSync(foundPlaylists, 'utf-8');
      const parsed = JSON.parse(fileContent);
      currentPlaylists = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`[Playlists] Failed to parse playlists at ${foundPlaylists}:`, e);
      currentPlaylists = [];
    }
  } else {
    console.log(`[Playlists] Using playlists location: ${playlistsFile}`);
  }
}

function savePlaylists(): void {
  try {
    fs.writeFileSync(playlistsFile, JSON.stringify(currentPlaylists, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Playlists] Failed to save playlists:', e);
  }
}

// Initial load
loadPlaylists();

export const getAllPlaylists = (): Playlist[] => {
  return currentPlaylists;
};

export const savePlaylist = (playlist: Playlist): Playlist => {
  const index = currentPlaylists.findIndex((p) => p.id === playlist.id);
  if (index > -1) {
    currentPlaylists[index] = playlist;
  } else {
    currentPlaylists.push(playlist);
  }
  savePlaylists();
  return playlist;
};

export const deletePlaylist = (id: string): boolean => {
  const index = currentPlaylists.findIndex((p) => p.id === id);
  if (index > -1) {
    currentPlaylists.splice(index, 1);
    savePlaylists();
    return true;
  }
  return false;
};
