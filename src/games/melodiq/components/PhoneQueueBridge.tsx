import React, { useEffect } from 'react';
import { storage } from '../../../lib/storage';
import { useWebRTC } from '../audio/WebRTCContext';
import { useSongs } from '../hooks/useSongs';
import { useHostQueueRoom } from '../hooks/useHostQueueRoom';

/** Host side for phones: the queue room (state + requests), `helper_config.get` and library search. */
export const PhoneQueueBridge: React.FC = () => {
  const { manager } = useWebRTC();
  const { songs } = useSongs();
  useHostQueueRoom();

  // Listen for commands
  useEffect(() => {
    if (!manager) return;

    const handleMessage = (peerId: string, data: any) => {
      if (!data || !data.type) return;

      switch (data.type) {
        case 'helper_config.get': {
          // Direct reply (not a room event, #813): the helper URL lets the phone load
          // songs through the WebRTC proxy; it is the trigger for the phone's useSongs.
          const helperUrl = storage.getHelperUrl();
          const helperToken = storage.getHelperToken();
          if (helperUrl) {
            manager.sendToPeer(peerId, {
              type: 'helper_config',
              url: helperUrl,
              token: helperToken,
            });
          }
          break;
        }

        case 'library.search': {
          const query = (data.query || '').toLowerCase();
          const filters = data.filters || {};
          console.log(
            `[PhoneQueueBridge] Search: "${query}" Filters:`,
            filters,
            `Total Songs: ${songs.length}`,
          );

          let results = songs;

          // Apply Filters
          if (filters.genre && filters.genre !== 'All') {
            results = results.filter(
              (s) => s.genre && s.genre.toLowerCase() === filters.genre.toLowerCase(),
            );
          }
          if (filters.year && filters.year !== 'All') {
            // Decades logic: 2010s -> starts with 201, 1990s -> starts with 199
            // If exact match fails, try decade matching
            const filterYearStr = String(filters.year);
            if (filterYearStr.endsWith('s')) {
              const prefix = filterYearStr.substring(0, 3); // "2010s" -> "201"
              results = results.filter((s) => s.year && String(s.year).startsWith(prefix));
            } else {
              results = results.filter((s) => s.year && String(s.year) === filterYearStr);
            }
          }
          if (filters.language && filters.language !== 'All') {
            results = results.filter(
              (s) => s.language && s.language.toLowerCase() === filters.language.toLowerCase(),
            );
          }

          // Apply Search Query
          if (query) {
            results = results.filter(
              (s) =>
                s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query),
            );
          }

          console.log(`[PhoneQueueBridge] Found ${results.length} matches`);

          // Slice to avoid sending huge payload
          const sliced = results.slice(0, 50).map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            year: s.year,
            genre: s.genre,
            language: s.language,
          }));

          manager.sendToPeer(peerId, {
            type: 'library.results',
            results: sliced,
            query: data.query,
          });
          break;
        }
      }
    };

    manager.on('message', handleMessage);

    return () => {
      manager.off('message', handleMessage);
    };
  }, [manager, songs]);

  return null;
};
