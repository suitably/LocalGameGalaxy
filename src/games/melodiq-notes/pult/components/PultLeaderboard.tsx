import { useMemo } from 'react';
import { Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LeaderboardRows } from '../../stage/components/LeaderboardTable';
import { playerKey } from '../../stage/logic/songResults';
import type { PultRoomState } from '../logic/protocol';

/**
 * The stage's leaderboard of the song on stage, on a player's own device (#699): shown while the
 * song is not playing, with this player's row highlighted.
 */
export function PultLeaderboard({ state, name }: { state: PultRoomState; name: string }) {
  const { t } = useTranslation();
  const me = useMemo(() => new Set([playerKey({ player: name, seat: -1 })]), [name]);
  const board = state.board;
  if (state.play === 'playing' || !board?.rows.length || board.songKey !== state.song?.key)
    return null;
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 3, display: 'grid', justifyItems: 'center' }}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        {t('games.melodiq_notes.stage.leaderboard.title')}
      </Typography>
      <LeaderboardRows
        rows={board.rows}
        highlight={me}
        badge={t('games.melodiq_notes.pult.leaderboard_you')}
      />
    </Paper>
  );
}
