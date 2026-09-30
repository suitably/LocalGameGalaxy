import { Box, Typography, Paper } from '@mui/material';
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

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -1 }}>
        {players.map((player, index) => {
          const isCurrent = index === currentPlayerIndex;
          const score = getPlayerScore(player.id);
          const isWinner = winner === player.id;

          // Find last turn for this player
          const playerTurns = turns.filter((turn) => turn.playerId === player.id);
          const lastTurn = playerTurns.length > 0 ? playerTurns[playerTurns.length - 1] : null;

          return (
            <Box
              sx={{
                width: { xs: '100%', sm: '50%', md: players.length > 2 ? '33.33%' : '50%' },
                p: 1,
              }}
              key={player.id}
            >
              <Paper
                elevation={isCurrent && !winner ? 4 : 1}
                sx={{
                  p: 2,
                  bgcolor: isWinner
                    ? 'success.light'
                    : isCurrent && !winner
                      ? 'primary.light'
                      : 'background.paper',
                  color:
                    isWinner || (isCurrent && !winner) ? 'primary.contrastText' : 'text.primary',
                  position: 'relative',
                  border: isCurrent && !winner ? 2 : 0,
                  borderColor: 'primary.main',
                }}
              >
                {isWinner && (
                  <EmojiEventsIcon
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'gold', fontSize: 32 }}
                  />
                )}

                <Typography variant="h6" noWrap>
                  {player.name}
                </Typography>

                <Typography variant="h2" sx={{ textAlign: 'center', my: 2, fontWeight: 'bold' }}>
                  {score}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', height: 24 }}>
                  {/* Show current throws if it's their turn */}
                  {isCurrent && !winner ? (
                    currentTurnThrows.map((throwData, i) => (
                      <Typography key={i} variant="body2" sx={{ fontWeight: 'bold' }}>
                        {throwData.multiplier === 1 ? '' : throwData.multiplier === 2 ? 'D' : 'T'}
                        {throwData.value === 25
                          ? 'Bull'
                          : throwData.value === 50
                            ? 'Bullseye'
                            : throwData.value}
                      </Typography>
                    ))
                  ) : lastTurn && !isWinner ? (
                    <Typography
                      variant="body2"
                      color="inherit"
                      sx={{ opacity: 0.8, width: '100%', textAlign: 'center' }}
                    >
                      {lastTurn.busted
                        ? t('games.darts.busted')
                        : t('games.darts.last_score', {
                            score: Math.abs(lastTurn.scoreBefore - lastTurn.scoreAfter),
                          })}
                    </Typography>
                  ) : null}
                </Box>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
