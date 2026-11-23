/**
 * Status line of a Qwixx room game [ID: GAME-QWIXX-ROOM-STATUS]
 */
import { useTranslation } from 'react-i18next';
import type { QwixxRoomState } from './logic/qwixxRoom';

/** Status line for everyone: who rolls, who still has to finish, or game over. */
export function useQwixxRoomStatus(state: QwixxRoomState, myId: string): string {
  const { t } = useTranslation();
  if (state.isGameOver) return t('games.qwixx.room_game_over');
  if (state.rolled) {
    if (!state.done.includes(myId) && state.players.some((p) => p.id === myId))
      return t('games.qwixx.room_cross');
    const names = state.players.filter((p) => !state.done.includes(p.id)).map((p) => p.name);
    return t('games.qwixx.room_waiting', { names: names.join(', ') });
  }
  const roller = state.players[state.rollerIndex];
  return roller?.id === myId
    ? t('games.qwixx.room_your_roll')
    : t('games.qwixx.room_roll_of', { name: roller?.name ?? '' });
}
