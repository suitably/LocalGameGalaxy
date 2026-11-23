import React, { useState } from 'react';
import { Box } from '@mui/material';
import { type SongMeta } from '../db';
import { type useSearchFilters } from '../hooks/useSearchFilters';
import { MelodiqSearchBar } from './MelodiqSearchBar';
import { LibraryEmptyState } from './LibraryEmptyState';
import { OnlineSongsView } from './OnlineSongsView';
import { LocalSongsView } from './LocalSongsView';
import { MINI_PLAYER_OFFSET } from './miniPlayerLayout';
import { LibraryTabs } from './library/LibraryTabs';
import { SongLibraryView } from './library/SongLibraryView';
import { type LibraryTab } from '../logic/songLibrary';

type SearchFilterState = ReturnType<typeof useSearchFilters>;
type OnlineProps = React.ComponentProps<typeof OnlineSongsView>;

interface MelodiqHomeViewProps {
  visible: boolean;
  searchFilterState: SearchFilterState;
  songs: SongMeta[];
  jobs: OnlineProps['jobs'];
  isLoading: boolean;
  hasConnectionError: boolean;
  refreshSongs: () => Promise<void>;
  isClient: boolean;
  isSinger: boolean;
  canDownload: boolean;
  viewMode: 'list' | 'grid';
  handleSelectSong: OnlineProps['handleSelectSong'];
  handleSongLongPress: OnlineProps['handleSongLongPress'];
  handleDownloadAndQueue: OnlineProps['handleDownloadAndQueue'];
  handleDownloadOnly: OnlineProps['handleDownloadOnly'];
  /** Opens a playlist from the library's Playlists tab. */
  onOpenPlaylist: (playlistId: string) => void;
}

/**
 * Song library of the Home/Session view (#636): search bar, tabs (All / Artists / Albums /
 * Favourites / Playlists), empty state, local or online results.
 */
export const MelodiqHomeView: React.FC<MelodiqHomeViewProps> = ({
  visible,
  searchFilterState,
  songs,
  jobs,
  isLoading,
  hasConnectionError,
  refreshSongs,
  isClient,
  isSinger,
  canDownload,
  viewMode,
  handleSelectSong,
  handleSongLongPress,
  handleDownloadAndQueue,
  handleDownloadOnly,
  onOpenPlaylist,
}) => {
  const [tab, setTab] = useState<LibraryTab>('all');
  const { isOnlineSearch, isSearchingOnline, filteredSongs, filteredOnlineSongs } =
    searchFilterState;
  return (
    <Box
      sx={{
        display: visible ? 'flex' : 'none',
        height: '100%',
        flexDirection: 'column',
        overflow: 'hidden',
        pb: MINI_PLAYER_OFFSET,
      }}
    >
      {(!hasConnectionError || songs.length > 0) && (
        <MelodiqSearchBar
          {...searchFilterState}
          filteredSongsLength={filteredSongs.length}
          totalSongsLength={songs.length}
          canSearchOnline={!hasConnectionError}
        />
      )}

      {!isOnlineSearch && (
        <LibraryTabs value={tab} onChange={setTab} hidden={isClient ? ['playlists'] : []} />
      )}

      {!isOnlineSearch && tab !== 'all' && (
        <SongLibraryView
          tab={tab}
          songs={filteredSongs}
          onSelectSong={handleSelectSong}
          onSongActions={handleSongLongPress}
          onOpenPlaylist={onOpenPlaylist}
        />
      )}

      {(isOnlineSearch || tab === 'all') && (
        <LibraryEmptyState
          hasConnectionError={hasConnectionError && songs.length === 0}
          isLoading={isLoading}
          songsLength={isOnlineSearch ? songs?.length || 0 : filteredSongs?.length || 0}
          isOnlineSearch={isOnlineSearch}
          refreshSongs={refreshSongs}
          isClient={isClient}
        />
      )}

      {isOnlineSearch && (
        <OnlineSongsView
          isSearchingOnline={isSearchingOnline}
          viewMode={viewMode}
          filteredOnlineSongs={filteredOnlineSongs}
          songs={songs}
          jobs={jobs}
          handleSelectSong={handleSelectSong}
          handleDownloadAndQueue={handleDownloadAndQueue}
          handleSongLongPress={handleSongLongPress}
          handleDownloadOnly={handleDownloadOnly}
          isSinger={isSinger}
          canDownload={canDownload}
        />
      )}

      {!isOnlineSearch && tab === 'all' && (
        <LocalSongsView
          viewMode={viewMode}
          filteredSongs={filteredSongs}
          handleSelectSong={handleSelectSong}
          handleSongLongPress={handleSongLongPress}
          isSinger={isSinger}
          jobs={jobs}
        />
      )}
    </Box>
  );
};
