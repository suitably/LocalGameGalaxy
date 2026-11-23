import { useCallback, useRef, useState } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import {
  handleLibraryResultsEvent,
  type LibraryEvent,
  type LibrarySearchFilters,
  type LibrarySearchResult,
} from '../logic/librarySearch';
import { MELODIQ_GAME_KEY, usePhoneRoom } from './useMelodiqRoomTransport';

/**
 * Phone side of library search: `search()` sends `library.search` to the host; `results` holds the
 * reply to the latest request only (stale replies are dropped). `search` returns false (nothing
 * sent) while not connected, and on the host.
 */
export function usePhoneLibrarySearch(): {
  results: LibrarySearchResult[];
  search: (query: string, filters?: LibrarySearchFilters) => boolean;
} {
  const room = usePhoneRoom();
  const [results, setResults] = useState<LibrarySearchResult[]>([]);
  const latestRef = useRef<string | null>(null);
  const selfId = room?.selfId ?? '';
  const { send } = useRoomEvents<LibraryEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event) =>
      handleLibraryResultsEvent(event, {
        selfId,
        getLatestReqId: () => latestRef.current,
        onResults: setResults,
      }),
  });

  const search = useCallback(
    (query: string, filters: LibrarySearchFilters = {}) => {
      if (!selfId) return false;
      const reqId = `ls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      latestRef.current = reqId;
      send({ type: 'library.search', from: selfId, reqId, query, filters });
      return true;
    },
    [send, selfId],
  );
  return { results, search };
}
