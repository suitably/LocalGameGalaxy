import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PoolIcon from '@mui/icons-material/Pool';
import DangerousIcon from '@mui/icons-material/Dangerous';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import UndoIcon from '@mui/icons-material/Undo';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';
import { adjustPlayerLives, processSchwimmenRound } from '../logic/schwimmenEngine';
import type { CardPlayer } from '../logic/types';

interface SchwimmenGameViewProps {
  initialPlayers: string[];
  defaultLives?: number;
  onExit: () => void;
}

interface RoundHistoryEntry {
  round: number;
  description: string;
  losers: string[];
  isBlitz: boolean;
  blitzWinnerName?: string;
  snapshot: CardPlayer[];
}

export const SchwimmenGameView: React.FC<SchwimmenGameViewProps> = ({
  initialPlayers,
  defaultLives = 3,
  onExit,
}) => {
  const { t } = useTranslation();

  const [players, setPlayers] = useState<CardPlayer[]>(() =>
    initialPlayers.map((name, idx) => ({
      id: `p${idx + 1}`,
      name,
      lives: defaultLives,
      isSwimming: false,
      isEliminated: false,
      score: 0,
      roundScores: [],
      bids: [],
      tricksWon: [],
    })),
  );

  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedLoserIds, setSelectedLoserIds] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryEntry[]>([]);
  const [winner, setWinner] = useState<CardPlayer | null>(null);
  const [blitzConfirmPlayer, setBlitzConfirmPlayer] = useState<CardPlayer | null>(null);

  const activePlayers = players.filter((p) => !p.isEliminated);

  const handleToggleLoser = (playerId: string) => {
    setSelectedLoserIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
    );
  };

  const handleEvaluateRound = () => {
    if (selectedLoserIds.length === 0) return;

    const result = processSchwimmenRound(players, { losers: selectedLoserIds });
    const loserNames = players
      .filter((p) => selectedLoserIds.includes(p.id))
      .map((p) => p.name)
      .join(', ');

    const newHistoryEntry: RoundHistoryEntry = {
      round: roundNumber,
      description: `${loserNames} ${t('games.cards.schwimmen.lost_life_desc', 'verliert 1 Leben')}`,
      losers: selectedLoserIds,
      isBlitz: false,
      snapshot: players,
    };

    setRoundHistory((prev) => [newHistoryEntry, ...prev]);
    setPlayers(result.updatedPlayers);
    setSelectedLoserIds([]);
    setRoundNumber((r) => r + 1);

    if (result.isGameOver && result.winner) {
      setWinner(result.winner);
    }
  };

  const handleExecuteBlitz = (player: CardPlayer) => {
    const result = processSchwimmenRound(players, { blitzWinnerId: player.id });
    const penalizedNames = players
      .filter((p) => !p.isEliminated && p.id !== player.id)
      .map((p) => p.name)
      .join(', ');

    const newHistoryEntry: RoundHistoryEntry = {
      round: roundNumber,
      description: `⚡ Blitz von ${player.name}! (${penalizedNames} -1 Leben)`,
      losers: result.losers,
      isBlitz: true,
      blitzWinnerName: player.name,
      snapshot: players,
    };

    setRoundHistory((prev) => [newHistoryEntry, ...prev]);
    setPlayers(result.updatedPlayers);
    setSelectedLoserIds([]);
    setBlitzConfirmPlayer(null);
    setRoundNumber((r) => r + 1);

    if (result.isGameOver && result.winner) {
      setWinner(result.winner);
    }
  };

  const handleUndo = () => {
    if (roundHistory.length === 0) return;
    const lastEntry = roundHistory[0];
    setPlayers(lastEntry.snapshot);
    setRoundHistory((prev) => prev.slice(1));
    setRoundNumber((r) => Math.max(1, r - 1));
    setSelectedLoserIds([]);
    setWinner(null);
  };

  const handleAdjustSingleLife = (playerId: string, delta: number) => {
    setPlayers((prev) => adjustPlayerLives(prev, playerId, delta, defaultLives));
  };

  const handleRestart = () => {
    setPlayers(
      initialPlayers.map((name, idx) => ({
        id: `p${idx + 1}`,
        name,
        lives: defaultLives,
        isSwimming: false,
        isEliminated: false,
        score: 0,
        roundScores: [],
        bids: [],
        tricksWon: [],
      })),
    );
    setRoundNumber(1);
    setSelectedLoserIds([]);
    setRoundHistory([]);
    setWinner(null);
    setBlitzConfirmPlayer(null);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onExit}
          size="small"
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          {t('common.back', 'Zurück')}
        </Button>

        <Typography variant="h6" sx={{ fontWeight: 800, color: '#00e5ff' }}>
          🏊 {t('games.cards.schwimmen.title', 'Schwimmen')} - {t('games.cards.round', 'Runde')} {roundNumber}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {roundHistory.length > 0 && (
            <Tooltip title={t('games.cards.undo', 'Rückgängig')}>
              <IconButton size="small" onClick={handleUndo}>
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {roundHistory.length > 0 && (
            <Tooltip title={t('games.cards.round_history', 'Rundenhistorie')}>
              <IconButton size="small" onClick={() => setHistoryOpen(true)}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('common.restart', 'Neu starten')}>
            <IconButton size="small" onClick={handleRestart}>
              <ReplayIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Instructions Hint */}
      {!winner && activePlayers.length > 1 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 3,
            bgcolor: 'rgba(0, 172, 193, 0.08)',
            border: '1px solid rgba(0, 172, 193, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: '#80deea', fontWeight: 600 }}>
            ℹ️ {t('games.cards.schwimmen.hint', 'Markiere den Verlierer mit 💔 oder tippe bei 31 auf ⚡ Blitz.')}
          </Typography>
        </Paper>
      )}

      {/* Players Life Cards */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {players.map((player) => {
          const isDead = player.isEliminated;
          const isSwim = player.isSwimming;
          const isMarkedLoser = selectedLoserIds.includes(player.id);

          return (
            <Paper
              key={player.id}
              elevation={isDead ? 0 : 2}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                bgcolor: isDead
                  ? 'rgba(255, 255, 255, 0.02)'
                  : isMarkedLoser
                  ? alpha('#f44336', 0.15)
                  : isSwim
                  ? 'rgba(0, 172, 193, 0.12)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: '2px solid',
                borderColor: isDead
                  ? 'transparent'
                  : isMarkedLoser
                  ? '#f44336'
                  : isSwim
                  ? '#00acc1'
                  : 'rgba(255, 255, 255, 0.1)',
                opacity: isDead ? 0.45 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Player Name and Lives */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 160 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {player.name}
                  </Typography>

                  {/* Status & Lives Display */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
                    {isDead ? (
                      <Chip
                        icon={<DangerousIcon fontSize="small" />}
                        label={t('games.cards.eliminated', 'Ertrunken')}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                      />
                    ) : isSwim ? (
                      <Chip
                        icon={<PoolIcon fontSize="small" />}
                        label={t('games.cards.swimming_status', 'Schwimmt (0 Leben)')}
                        size="small"
                        sx={{
                          bgcolor: alpha('#00acc1', 0.3),
                          color: '#80deea',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          border: '1px solid #00acc1',
                        }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        {Array.from({ length: player.lives }).map((_, i) => (
                          <FavoriteIcon
                            key={i}
                            sx={{ fontSize: 20, color: '#f44336' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Direct Round Actions */}
              {!isDead && !winner && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {/* Mark as Loser toggle button */}
                  <Button
                    variant={isMarkedLoser ? 'contained' : 'outlined'}
                    color="error"
                    size="small"
                    startIcon={<HeartBrokenIcon />}
                    onClick={() => handleToggleLoser(player.id)}
                    sx={{
                      borderRadius: 50,
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 1.5,
                      boxShadow: isMarkedLoser ? '0 0 12px rgba(244, 67, 54, 0.5)' : 'none',
                    }}
                  >
                    {isMarkedLoser
                      ? t('games.cards.schwimmen.marked_loser', 'Verliert Leben ✓')
                      : t('games.cards.schwimmen.lose_life_btn', '-1 Leben')}
                  </Button>

                  {/* Instant Blitz Button */}
                  <Tooltip title={t('games.cards.schwimmen.blitz_tooltip', 'Blitz! (31) - Alle anderen verlieren 1 Leben')}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<FlashOnIcon />}
                      onClick={() => setBlitzConfirmPlayer(player)}
                      sx={{
                        bgcolor: '#ffb300',
                        color: '#000',
                        fontWeight: 800,
                        borderRadius: 50,
                        textTransform: 'none',
                        px: 1.5,
                        '&:hover': { bgcolor: '#ffa000' },
                      }}
                    >
                      {t('games.cards.schwimmen.blitz_btn', '⚡ Blitz!')}
                    </Button>
                  </Tooltip>

                  {/* Manual +/- adjustment */}
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                    <Tooltip title={t('games.cards.schwimmen.minus_life', 'Leben abziehen')}>
                      <IconButton
                        size="small"
                        onClick={() => handleAdjustSingleLife(player.id, -1)}
                        sx={{ p: 0.4, opacity: 0.6, '&:hover': { opacity: 1 } }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('games.cards.schwimmen.plus_life', 'Leben hinzufügen')}>
                      <IconButton
                        size="small"
                        onClick={() => handleAdjustSingleLife(player.id, 1)}
                        sx={{ p: 0.4, opacity: 0.6, '&:hover': { opacity: 1 } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {/* Evaluate round button */}
      {!winner && activePlayers.length > 1 && (
        <Button
          variant="contained"
          color="error"
          size="large"
          fullWidth
          disabled={selectedLoserIds.length === 0}
          onClick={handleEvaluateRound}
          sx={{
            py: 1.5,
            fontWeight: 800,
            fontSize: '1.05rem',
            borderRadius: 50,
            boxShadow:
              selectedLoserIds.length > 0
                ? '0 4px 20px rgba(244, 67, 54, 0.4)'
                : 'none',
            background:
              selectedLoserIds.length > 0
                ? 'linear-gradient(90deg, #d32f2f, #c2185b)'
                : undefined,
          }}
        >
          {selectedLoserIds.length === 0
            ? t('games.cards.schwimmen.select_loser_btn', 'Verlierer auswählen')
            : `${t('games.cards.schwimmen.deduct_lives_btn', 'Runde abschließen')} (${selectedLoserIds.length} ${t('games.cards.schwimmen.lives_deducted', 'Leben abziehen')})`}
        </Button>
      )}

      {/* Winner Celebration Screen */}
      {winner && (
        <Paper
          elevation={6}
          sx={{
            p: 3,
            mt: 2,
            textAlign: 'center',
            bgcolor: 'rgba(255, 183, 77, 0.15)',
            border: '2px solid #ffb74d',
            borderRadius: 4,
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 64, color: '#ffb74d', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            🎉 {winner.name} {t('games.cards.has_won', 'hat gewonnen!')} 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            {t('games.cards.survived_all', 'Hat alle Runden überstanden!')}
          </Typography>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestart}
            startIcon={<ReplayIcon />}
            sx={{ borderRadius: 50, fontWeight: 700 }}
          >
            {t('games.cards.play_again', 'Nochmal spielen')}
          </Button>
        </Paper>
      )}

      {/* Blitz Confirmation Dialog */}
      <Dialog
        open={Boolean(blitzConfirmPlayer)}
        onClose={() => setBlitzConfirmPlayer(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#ffb300', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlashOnIcon /> {t('games.cards.schwimmen.blitz_dialog_title', '⚡ Blitz / Feuer!')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>{blitzConfirmPlayer?.name}</strong> {t('games.cards.schwimmen.blitz_dialog_desc', 'hat 31 / Blitz! Alle anderen aktiven Spieler verlieren sofort 1 Leben.')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBlitzConfirmPlayer(null)} sx={{ color: 'text.secondary' }}>
            {t('common.cancel', 'Abbrechen')}
          </Button>
          <Button
            variant="contained"
            onClick={() => blitzConfirmPlayer && handleExecuteBlitz(blitzConfirmPlayer)}
            sx={{
              bgcolor: '#ffb300',
              color: '#000',
              fontWeight: 800,
              borderRadius: 50,
              '&:hover': { bgcolor: '#ffa000' },
            }}
          >
            {t('games.cards.schwimmen.confirm_blitz', 'Blitz ausführen')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Round History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t('games.cards.round_history', 'Rundenhistorie')}</DialogTitle>
        <DialogContent dividers>
          {roundHistory.map((rh) => (
            <Box key={rh.round} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: rh.isBlitz ? '#ffb300' : '#00acc1' }}>
                {t('games.cards.round', 'Runde')} {rh.round}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {rh.description}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('common.close', 'Schließen')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

