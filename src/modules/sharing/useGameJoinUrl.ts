/**
 * Game Join URL Hook [ID: MODULES-SHARING-JOINURL]
 *
 * Encapsulates URL parameter extraction, LZString decompression of game snapshots,
 * direct game ID joins, and URL cleaning on initial mount and hashchange events.
 */

import { useEffect, useRef } from 'react';
import LZString from 'lz-string';
import { parseGameUrlParams, cleanWindowUrlQuery } from './parseGameUrlParams';

export interface UseGameJoinUrlOptions<T> {
  onSnapshotLoaded?: (snapshot: T, params: URLSearchParams) => Promise<void> | void;
  onDirectGameId?: (gameId: string, params: URLSearchParams) => Promise<void> | void;
  defaultHashPath?: string;
  cleanUrlOnSuccess?: boolean;
  listenHashChange?: boolean;
  enabled?: boolean;
}

export function useGameJoinUrl<T>({
  onSnapshotLoaded,
  onDirectGameId,
  defaultHashPath,
  cleanUrlOnSuccess = true,
  listenHashChange = true,
  enabled = true,
}: UseGameJoinUrlOptions<T>): void {
  const onSnapshotLoadedRef = useRef(onSnapshotLoaded);
  const onDirectGameIdRef = useRef(onDirectGameId);

  useEffect(() => {
    onSnapshotLoadedRef.current = onSnapshotLoaded;
    onDirectGameIdRef.current = onDirectGameId;
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const processUrl = async () => {
      const params = parseGameUrlParams();
      if (!params.toString()) return;

      const dataParam = params.get('data');
      const gameIdParam = params.get('gameId') || params.get('game') || params.get('room') || params.get('roomId');

      if (dataParam && onSnapshotLoadedRef.current) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
          if (decompressed) {
            const parsed = JSON.parse(decompressed) as T;
            await onSnapshotLoadedRef.current(parsed, params);
            if (cleanUrlOnSuccess) {
              cleanWindowUrlQuery(defaultHashPath);
            }
            return;
          }
        } catch (err) {
          console.warn('[useGameJoinUrl] Failed to decompress snapshot payload:', err);
        }
      }

      if (gameIdParam && onDirectGameIdRef.current) {
        try {
          await onDirectGameIdRef.current(gameIdParam, params);
          if (cleanUrlOnSuccess) {
            cleanWindowUrlQuery(defaultHashPath);
          }
        } catch (err) {
          console.warn('[useGameJoinUrl] Failed to join game by ID:', err);
        }
      }
    };

    void processUrl();

    if (listenHashChange) {
      window.addEventListener('hashchange', processUrl);
      return () => {
        window.removeEventListener('hashchange', processUrl);
      };
    }
  }, [defaultHashPath, cleanUrlOnSuccess, listenHashChange, enabled]);
}
