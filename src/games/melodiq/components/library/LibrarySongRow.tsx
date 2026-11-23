import React from 'react';
import {
  Avatar,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorderRounded';
import MoreVertIcon from '@mui/icons-material/MoreVertRounded';
import { useTranslation } from 'react-i18next';
import { type SongMeta } from '../../db';
import { type SongRowActions } from './types';

interface LibrarySongRowProps extends SongRowActions {
  song: SongMeta;
  /** Second line; defaults to the artist. */
  secondary?: string;
}

/** One song in the library lists: tap picks it, the menu button opens its actions, heart toggles favourite. */
export const LibrarySongRow: React.FC<LibrarySongRowProps> = ({
  song,
  secondary,
  isFavorite,
  onToggleFavorite,
  onSelect,
  onLongPress,
}) => {
  const { t } = useTranslation();
  const favorite = isFavorite(song.id);
  const cover = song.coverThumbnail ?? (typeof song.cover === 'string' ? song.cover : undefined);
  return (
    <ListItem
      disablePadding
      sx={{ '& .MuiListItemButton-root': { pr: 12 } }}
      secondaryAction={
        <>
          <IconButton
            aria-label={t(
              favorite ? 'melodiq.library.remove_favorite' : 'melodiq.library.add_favorite',
            )}
            aria-pressed={favorite}
            onClick={() => onToggleFavorite(song.id)}
          >
            {favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
          </IconButton>
          <IconButton
            edge="end"
            aria-label={t('melodiq.a11y.more_actions')}
            onClick={() => onLongPress(song)}
          >
            <MoreVertIcon />
          </IconButton>
        </>
      }
    >
      <ListItemButton onClick={() => onSelect(song)}>
        <ListItemAvatar>
          <Avatar variant="rounded" src={cover}>
            <MusicNoteIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={song.title}
          secondary={secondary ?? song.artist}
          primaryTypographyProps={{ noWrap: true }}
          secondaryTypographyProps={{ noWrap: true }}
        />
      </ListItemButton>
    </ListItem>
  );
};
