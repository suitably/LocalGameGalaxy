import React from 'react';
import {
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { useTranslation } from 'react-i18next';
import type { StoryGameRecord } from '../types';

interface SavedStoriesCardProps {
  games: StoryGameRecord[];
  onResumeGame: (id: string) => void;
  onDeleteGame: (id: string) => void;
}

export const SavedStoriesCard: React.FC<SavedStoriesCardProps> = ({
  games,
  onResumeGame,
  onDeleteGame,
}) => {
  const { t } = useTranslation();

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('storyteller.savedStories', 'Gespeicherte Geschichten')}
        </Typography>

        <List dense disablePadding>
          {games.map((g) => (
            <ListItem
              key={g.id}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' },
              }}
              onClick={() => onResumeGame(g.id)}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={700}>
                      {g.name || t('games.storyteller.title', 'Geschichtenschreiber')}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        g.status === 'completed'
                          ? t('storyteller.completed', 'Beendet')
                          : `${t('storyteller.turnLabel', 'Zug')} ${g.turnNumber}`
                      }
                      color={g.status === 'completed' ? 'success' : 'info'}
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  </Stack>
                }
                secondary={`${g.players.map((p) => p.name).join(', ')} • ${new Date(g.updatedAt).toLocaleDateString()}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteGame(g.id);
                  }}
                >
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
