/**
 * Tells connected phones which song and singer tracks are playing, and each phone its own part
 * [ID: HOOK-MELODIQ-SONG-INFO]
 */
import { useEffect } from 'react';
import type { PlayerRuntime } from './PlayerRuntime';
import type { Song } from '../../db';
import type { SongWithNotes } from '../PitchVisualizer';
import type { WebRTCMicManager } from '../../audio/WebRTCMicManager';

interface UseBroadcastSongInfoProps {
  manager: WebRTCMicManager | null;
  parsedSong: SongWithNotes | null;
  song: Song;
  players: PlayerRuntime[];
}

const remoteTracksKey = (players: PlayerRuntime[]) =>
  players
    .filter((p) => p.config.isRemote)
    .map((p) => `${p.remotePeerId}:${p.trackIndex}`)
    .join(',');

export function useBroadcastSongInfo({
  manager,
  parsedSong,
  song,
  players,
}: UseBroadcastSongInfoProps) {
  useEffect(() => {
    if (!manager || !parsedSong) return;

    const payload = {
      type: 'songInfo',
      title: song.title,
      artist: song.artist,
      tracks: (parsedSong.tracks ?? []).map((t, i) => t.name || `Player ${i + 1}`),
    };

    for (const p of players) {
      const peerId = p.remotePeerId;
      if (!p.config.isRemote || !p.webRtcManager || !peerId) continue;
      if (p.webRtcManager.getConnectedPeers().some((cp) => cp.peerId === peerId)) {
        // the phone shows the part its singer has, also when the host switched it
        p.webRtcManager.sendToPeer(peerId, { ...payload, trackIndex: p.trackIndex });
      }
    }
    // Re-send when players join or leave or a remote part changes, not on every config change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, parsedSong, players.length, song.title, remoteTracksKey(players)]);
}
