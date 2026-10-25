/**
 * Saved table states of one place (device or server), with load and delete [ID: COMP-TABLETOP-SAVE-LIST]
 */
import React, { useState } from 'react';
import {
  Box,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useTranslation } from 'react-i18next';

export interface SaveListEntry {
  id: string;
  name: string;
  savedAt: number;
  /** Server saves only: who stored it. */
  ownerName?: string;
  mine: boolean;
}

interface Props {
  title: string;
  saves: readonly SaveListEntry[];
  busy: boolean;
  /** Offers the "only my saves" filter (server lists hold every user's saves). */
  filterByOwner?: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SaveStateList: React.FC<Props> = ({
  title,
  saves,
  busy,
  filterByOwner = false,
  onLoad,
  onDelete,
}) => {
  const { t, i18n } = useTranslation();
  const [onlyMine, setOnlyMine] = useState(false);
  const shown = onlyMine ? saves.filter((s) => s.mine) : saves;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {filterByOwner && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
              />
            }
            label={t('games.tabletop.saves.onlyMine')}
          />
        )}
      </Box>
      {shown.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('games.tabletop.saves.empty')}
        </Typography>
      ) : (
        <List dense disablePadding>
          {shown.map((s) => (
            <ListItem
              key={s.id}
              disableGutters
              secondaryAction={
                <>
                  <Tooltip title={t('games.tabletop.saves.load')}>
                    <span>
                      <IconButton
                        edge="end"
                        disabled={busy}
                        onClick={() => onLoad(s.id)}
                        aria-label={t('games.tabletop.saves.load')}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {s.mine && (
                    <Tooltip title={t('games.tabletop.saves.delete')}>
                      <span>
                        <IconButton
                          edge="end"
                          disabled={busy}
                          onClick={() => onDelete(s.id)}
                          aria-label={t('games.tabletop.saves.delete')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </>
              }
            >
              <ListItemText
                primary={s.name}
                secondary={[s.ownerName, new Date(s.savedAt).toLocaleString(i18n.language)]
                  .filter(Boolean)
                  .join(' · ')}
                sx={{ pr: 10 }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
