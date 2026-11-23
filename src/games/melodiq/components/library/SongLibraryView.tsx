import React, { useMemo } from 'react';
import { Box, List, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { type SongMeta } from '../../db';
import { useSongLibrary } from '../../hooks/useSongLibrary';
import { songsByIds, type LibraryTab } from '../../logic/songLibrary';
import { MelodiqPlaylists } from '../MelodiqPlaylists';
import { LibraryGroupList } from './LibraryGroupList';
import { LibrarySongRow } from './LibrarySongRow';
import { toAlbumGroups, toArtistGroups, type LibraryGroupLabels } from './libraryGroups';

interface SongLibraryViewProps {
  tab: Exclude<LibraryTab, 'all'>;
  /** Songs after search and filters. */
  songs: SongMeta[];
  onSelectSong: (song: SongMeta) => void;
  onSongActions: (song: SongMeta) => void;
  onOpenPlaylist: (playlistId: string) => void;
}

/** Artists, albums, favourites or playlists of the song library (#636); "All" stays the song grid. */
export const SongLibraryView: React.FC<SongLibraryViewProps> = ({
  tab,
  songs,
  onSelectSong,
  onSongActions,
  onOpenPlaylist,
}) => {
  const { t } = useTranslation();
  const library = useSongLibrary();
  const rowActions = {
    isFavorite: library.isFavorite,
    onToggleFavorite: (id: string) => void library.toggleFavorite(id),
    onSelect: onSelectSong,
    onLongPress: onSongActions,
  };

  const groups = useMemo(() => {
    if (tab !== 'artists' && tab !== 'albums') return [];
    const labels: LibraryGroupLabels = {
      unknownArtist: t('melodiq.library.unknown_artist'),
      unknownAlbum: t('melodiq.library.unknown_album'),
      artistSummary: (albums, count) =>
        `${t('melodiq.library.albums', { count: albums })} · ${t('melodiq.library.songs', { count })}`,
      albumSummary: (artist, count) => `${artist} · ${t('melodiq.library.songs', { count })}`,
    };
    return tab === 'artists' ? toArtistGroups(songs, labels) : toAlbumGroups(songs, labels);
  }, [tab, songs, t]);

  const favoriteSongs = useMemo(
    () => (tab === 'favorites' ? songsByIds(songs, library.favorites) : []),
    [tab, songs, library.favorites],
  );

  if (tab === 'playlists') {
    return <MelodiqPlaylists onSelectPlaylist={(p) => onOpenPlaylist(p.id)} />;
  }

  const empty = tab === 'favorites' ? favoriteSongs.length === 0 : groups.length === 0;
  if (empty) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8, px: 3, opacity: 0.7 }}>
        <Typography>
          {t(tab === 'favorites' ? 'melodiq.library.no_favorites' : 'melodiq.library.no_results')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      {tab === 'favorites' ? (
        <List disablePadding>
          {favoriteSongs.map((song) => (
            <LibrarySongRow key={song.id} song={song} {...rowActions} />
          ))}
        </List>
      ) : (
        <LibraryGroupList groups={groups} {...rowActions} />
      )}
    </Box>
  );
};
