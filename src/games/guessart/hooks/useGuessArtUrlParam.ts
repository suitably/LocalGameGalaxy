import { useState, useCallback, useEffect } from 'react';

export const useGuessArtUrlParam = () => {
  const [activeGameId, setActiveGameIdState] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const gameId = params.get('gameId') || hashParams.get('gameId');
      if (gameId) {
        setActiveGameIdState(gameId);
      }
    }
  }, []);

  return { activeGameId, setActiveGameId };
};
