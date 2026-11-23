import { useState, useCallback } from 'react';

/** Game id from the URL query or hash, unless the link carries a game snapshot. */
function readGameIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const gameId = params.get('gameId') || hashParams.get('gameId');
  // A link with game data is opened by the join flow once the game is imported;
  // loading it here first would fail and not be retried.
  const hasSnapshot = params.has('data') || hashParams.has('data');
  return gameId && !hasSnapshot ? gameId : null;
}

export const useGuessArtUrlParam = () => {
  const [activeGameId, setActiveGameIdState] = useState<string | null>(readGameIdFromUrl);

  const setActiveGameId = useCallback((id: string | null) => {
    setActiveGameIdState(id);
    if (id && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('gameId', id);
      window.history.replaceState({}, '', url.toString());
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('gameId');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return { activeGameId, setActiveGameId };
};
