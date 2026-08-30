import React, { useState } from 'react';
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
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import { gameNameOverride } from '../logic/gameNameOverride';
import type { GuessArtGameRecord } from '../logic/types';

interface ActiveGamesListProps {
  games: GuessArtGameRecord[];
  onResumeGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenHistory?: (gameId: string) => void;
  onEditGame?: (game: GuessArtGameRecord) => void;
  onOpenShareLinks?: (game: GuessArtGameRecord) => void;
}

export const ActiveGamesList: React.FC<ActiveGamesListProps> = ({
  games,
  onResumeGame,
  onDeleteGame,
  onOpenHistory,
  onEditGame,
  onOpenShareLinks,
}) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!games || games.length === 0) {
    return null;
  }

  const handleShareClick = (game: GuessArtGameRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenShareLinks) {
      onOpenShareLinks(game);
      return;
    }
    const snapshot = { game };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
    const url = `${window.location.origin}${window.location.pathname}#/games/guessart?gameId=${game.id}&data=${compressed}`;
    navigator.clipboard.writeText(url);
    setCopiedId(game.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Stack spacing={1.5}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
          {t('guessart.activeGamesTitle', 'Laufende Spiele')} ({games.length})
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('guessart.asyncMultiplayerHint', 'Mehrere Runden parallel spielbar')}
        </Typography>
      </Box>

      {games.map((game) => {
        const playerNames = game.players.map((p) => p.name).join(', ');
        const dateStr = new Date(game.updatedAt).toLocaleDateString();
        const isDrawing = game.status === 'drawing' || game.status === 'selecting';
        const isCopied = copiedId === game.id;

        const drawerIdx = game.status === 'guessing'
          ? (game.currentPlayerIndex - 1 + game.players.length) % (game.players.length || 1)
          : game.currentPlayerIndex % (game.players.length || 1);
        const drawerName = game.players[drawerIdx]?.name || 'Spieler 1';
        const guesserName = game.players[(drawerIdx + 1) % (game.players.length || 1)]?.name || 'Spieler 2';

        return (
          <Card
            key={game.id}
            sx={{
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
              <CardActionArea
                onClick={() => onResumeGame(game.id)}
                sx={{ flexGrow: 1, p: 0.5, borderRadius: 1 }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {drawerName} vs. {guesserName}
                    </Typography>
                    <Chip
                      label={t('guessart.roundHeader', { round: game.roundNumber, defaultValue: `Runde ${game.roundNumber}` })}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem', height: 20 }}
                    />
                    {gameNameOverride.getEffectiveGameName(game.id, game.name) && (
                      <Chip
                        label={gameNameOverride.getEffectiveGameName(game.id, game.name)}
                        size="small"
                        variant="filled"
                        sx={{ fontSize: '0.75rem', height: 20, bgcolor: 'action.selected' }}
                      />
                    )}
                  </Box>
                  <Chip
                    icon={isDrawing ? <BrushRoundedIcon sx={{ fontSize: '0.9rem !important' }} /> : <PsychologyRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                    label={isDrawing ? t('guessart.statusDrawing', 'Zeichnen') : t('guessart.statusGuessing', 'Raten')}
                    size="small"
                    color={isDrawing ? 'primary' : 'secondary'}
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                  👥 {playerNames}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {dateStr}
                </Typography>
              </CardActionArea>

              <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                <Tooltip title={isCopied ? t('common.copied', 'Kopiert!') : t('guessart.sharePlayerLinks', 'Mitspieler-Links teilen (Async)')}>
                  <IconButton
                    color={isCopied ? 'success' : 'default'}
                    size="small"
                    onClick={(e) => handleShareClick(game, e)}
                    aria-label={t('guessart.sharePlayerLinks', 'Mitspieler-Links teilen')}
                  >
                    {isCopied ? <CheckRoundedIcon fontSize="small" /> : <ShareRoundedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

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
