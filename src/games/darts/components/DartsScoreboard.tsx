import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDartsGame } from '../useDartsGame';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

type DartsGameState = ReturnType<typeof useDartsGame>;

interface Props {
  state: DartsGameState;
}

export function DartsScoreboard({ state }: Props) {
  const { t } = useTranslation();
  const { players, currentPlayerIndex, getPlayerScore, currentTurnThrows, turns, winner } = state;

  const currentPlayer = players[currentPlayerIndex] || players[0];
  const focusPlayer = winner
    ? players.find((p) => p.id === winner) || currentPlayer
    : currentPlayer;
  const otherPlayers = players.filter((p) => p.id !== focusPlayer.id);

  const renderPlayerHistory = (playerId: string, isWinner: boolean) => {
    const playerTurns = turns.filter((turn) => turn.playerId === playerId);
    const lastTurn = playerTurns.length > 0 ? playerTurns[playerTurns.length - 1] : null;

    if (winner && !isWinner) return null;

    if (focusPlayer.id === playerId && !winner) {
      return currentTurnThrows.map((throwData, i) => (
        <Typography key={i} variant="h6" sx={{ fontWeight: 'bold' }}>
          {throwData.multiplier === 1 ? '' : throwData.multiplier === 2 ? 'D' : 'T'}
          {throwData.value === 25 ? 'Bull' : throwData.value === 50 ? 'Bullseye' : throwData.value}
        </Typography>
      ));
    }

    if (lastTurn && !isWinner) {
      return (
        <Typography
          variant="body1"
          color="inherit"
          sx={{ opacity: 0.8, width: '100%', textAlign: 'center' }}
        >
          {lastTurn.busted
            ? t('games.darts.busted')
            : t('games.darts.last_score', {
                score: Math.abs(lastTurn.scoreBefore - lastTurn.scoreAfter),
              })}
        </Typography>
      );
    }

    return null;
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        height: '100%',
      }}
    >
      {/* Left Side: Active/Winner Player */}
      <Paper
        elevation={4}
        sx={{
          flex: { xs: 'none', md: 1 },
          p: 3,
          bgcolor: winner ? 'success.light' : 'primary.light',
          color: 'primary.contrastText',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 200, md: 'auto' },
        }}
      >
        {winner && (
          <EmojiEventsIcon
            sx={{ position: 'absolute', top: 16, right: 16, color: 'gold', fontSize: 48 }}
          />
        )}

        <Typography variant="h5" noWrap>
          {focusPlayer.name}
        </Typography>

        <Typography
          variant="h1"
          sx={{ my: 2, fontWeight: 'bold', fontSize: { xs: '4rem', sm: '5rem', md: '6rem' } }}
        >
          {getPlayerScore(focusPlayer.id)}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, height: 32, width: '100%' }}>
          {renderPlayerHistory(focusPlayer.id, winner === focusPlayer.id)}
        </Box>
      </Paper>

      {/* Right Side: Other Players */}
      {otherPlayers.length > 0 && (
        <Paper
          elevation={1}
          sx={{
            flex: { xs: 'none', md: 1 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <TableContainer sx={{ flex: 1, maxHeight: { xs: 200, md: 'none' } }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t('games.darts.player')}</TableCell>
                  <TableCell align="right">{t('games.darts.score_label', 'Score')}</TableCell>
                  <TableCell align="right">
                    {t('games.darts.last_turn_label', 'Last Turn')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {otherPlayers.map((player) => {
                  const score = getPlayerScore(player.id);
                  const playerTurns = turns.filter((turn) => turn.playerId === player.id);
                  const lastTurn =
                    playerTurns.length > 0 ? playerTurns[playerTurns.length - 1] : null;

                  let lastTurnText = '';
                  if (lastTurn) {
                    lastTurnText = lastTurn.busted
                      ? t('games.darts.busted')
                      : t('games.darts.last_score', {
                          score: Math.abs(lastTurn.scoreBefore - lastTurn.scoreAfter),
                        });
                  }

                  return (
                    <TableRow key={player.id}>
                      <TableCell component="th" scope="row">
                        <Typography noWrap sx={{ maxWidth: { xs: 80, sm: 120 } }}>
                          {player.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">{score}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {lastTurnText}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
