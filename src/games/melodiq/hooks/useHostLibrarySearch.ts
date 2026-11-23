import { useEffect, useRef } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { handleLibrarySearchEvent, type LibraryEvent } from '../logic/librarySearch';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';
import { useSongs } from './useSongsCore';

/** Host side of library search: answers `library.search` room events to the asking phone only. */
export function useHostLibrarySearch(): void {
  const room = useMelodiqRoomTransport();
  const { songs } = useSongs();
  const songsRef = useRef(songs);
  useEffect(() => {
    songsRef.current = songs;
  });

  useRoomEvents<LibraryEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event, send) => {
      handleLibrarySearchEvent(event, {
        getSongs: () => songsRef.current,
        send,
        selfId: room?.selfId ?? '',
      });
    },
  });
}
