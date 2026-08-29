import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useTranslation } from 'react-i18next';
import type { GuessArtGameRecord } from '../logic/types';

interface ActiveGamesListProps {
  games: GuessArtGameRecord[];
  onResumeGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenHistory?: (gameId: string) => void;
  onEditGame?: (game: GuessArtGameRecord) => void;
}

export const ActiveGamesList: React.FC<ActiveGamesListProps> = ({
  games,
  onResumeGame,
  onDeleteGame,
  onOpenHistory,
  onEditGame,
}) => {
  const { t } = useTranslation();

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
        {t('guessart.activeGamesTitle', 'Laufende Spiele')}
      </Typography>
      {games.map((game) => {
        const playerNames = game.players.map((p) => p.name).join(', ');
        const dateStr = new Date(game.updatedAt).toLocaleDateString();

        return (
          <Card key={game.id} sx={{ borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
              <CardActionArea
                onClick={() => onResumeGame(game.id)}
                sx={{ flexGrow: 1, p: 0.5, borderRadius: 1 }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {game.name || t('guessart.roundHeader', { round: game.roundNumber, defaultValue: `Runde ${game.roundNumber}` })}
                    </Typography>
                    {game.name && (
                      <Chip
                        label={t('guessart.roundHeader', { round: game.roundNumber, defaultValue: `Runde ${game.roundNumber}` })}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', height: 20 }}
                      />
                    )}
                  </Box>
                  <Chip
                    label={game.status.toUpperCase()}
                    size="small"
                    color={game.status === 'drawing' ? 'primary' : 'secondary'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                  {playerNames}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {dateStr}
                </Typography>
              </CardActionArea>

              <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                {onEditGame && (
                  <Tooltip title={t('guessart.editGame', 'Spiel bearbeiten')}>
                    <IconButton
                      color="default"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditGame(game);
                      }}
                      aria-label={t('guessart.editGame', 'Spiel bearbeiten')}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {onOpenHistory && (
                  <Tooltip title={t('guessart.viewHistory', 'Historie ansehen')}>
                    <IconButton
                      color="info"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenHistory(game.id);
                      }}
                      aria-label={t('guessart.viewHistory', 'Historie ansehen')}
                    >
                      <HistoryRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title={t('guessart.resumeGame', 'Weiterspielen')}>
                  <IconButton
                    color="primary"
                    onClick={() => onResumeGame(game.id)}
                    aria-label={t('guessart.resumeGame', 'Weiterspielen')}
                  >
                    <PlayArrowRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.delete', 'Löschen')}>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGame(game.id);
                    }}
                    aria-label={t('common.delete', 'Löschen')}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Card>
        );
      })}
    </Stack>
  );
};

