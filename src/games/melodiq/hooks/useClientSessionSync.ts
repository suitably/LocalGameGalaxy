import { useEffect, useRef } from 'react';
import { type Song, type SongMeta } from '../db';
import { type MelodiqParticipant } from '../types';

interface SessionSyncDetail {
  activeSong?: { id: string; title?: string; artist?: string } | null;
  participants?: MelodiqParticipant[];
}

interface UseClientSessionSyncProps {
  isClient: boolean;
  songs: SongMeta[];
  selectedSong: Song | null;
  getSongById: (id: string) => Promise<Song | undefined>;
  setSelectedSong: (song: Song | null) => void;
  setCurrentView: (view: 'Session' | 'Home') => void;
  setActiveParticipants: (p: MelodiqParticipant[] | null) => void;
}

/** Keeps a client's view in sync with the song the host is playing (session_sync). */
export const useClientSessionSync = ({
  isClient,
  songs,
  selectedSong,
  getSongById,
  setSelectedSong,
  setCurrentView,
  setActiveParticipants,
}: UseClientSessionSyncProps) => {
  // Holds the song ID from the last session_sync when songs hadn't loaded yet
  const pendingSyncIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isClient) return;

    const handleSessionSync = (e: Event) => {
      const data = (e as CustomEvent<SessionSyncDetail>).detail;
      if (data.activeSong) {
        // If the song ID hasn't changed, only update activeParticipants — DO NOT re-set selectedSong
        if (selectedSong && selectedSong.id === data.activeSong.id) {
          if (data.participants) setActiveParticipants(data.participants);
          return;
        }
        pendingSyncIdRef.current = data.activeSong.id;
        getSongById(data.activeSong.id)
          .then((fullSong) => {
            if (fullSong) {
              pendingSyncIdRef.current = null;
              setSelectedSong(fullSong);
              if (data.participants) setActiveParticipants(data.participants);
              setCurrentView('Session');
            } else if (data.activeSong && data.activeSong.title) {
              // If it's an online song, use the partial data from host
              pendingSyncIdRef.current = null;
              setSelectedSong(data.activeSong as unknown as Song);
              if (data.participants) setActiveParticipants(data.participants);
              setCurrentView('Session');
            }
          })
          .catch((err) => console.error('Failed to sync session song:', err));
      } else {
        pendingSyncIdRef.current = null;
        setSelectedSong(null);
        setCurrentView('Home');
      }
    };

    window.addEventListener('melodiq_client_session_sync', handleSessionSync);
    return () => window.removeEventListener('melodiq_client_session_sync', handleSessionSync);
  }, [isClient, getSongById, setSelectedSong, setCurrentView, selectedSong, setActiveParticipants]);

  // Retry session sync when the songs list updates (covers the race where the
  // sync event arrived before songs were loaded from the helper server)
  useEffect(() => {
    if (!isClient) return;
    const pendingId = pendingSyncIdRef.current;
    if (!pendingId || songs.length === 0) return;

    getSongById(pendingId)
      .then((fullSong) => {
        if (fullSong) {
          pendingSyncIdRef.current = null;
          setSelectedSong(fullSong);
          setCurrentView('Session');
        }
      })
      .catch(() => {});
  }, [isClient, songs, getSongById, setSelectedSong, setCurrentView]);
};
