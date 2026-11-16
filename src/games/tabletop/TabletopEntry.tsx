/**
 * Entry of the Spieltisch route [ID: GAME-TABLETOP-ENTRY]
 *
 * Scripted card games (`scripted/`: the rules are enforced) open their own table; everything
 * else is the free tabletop engine (`TabletopGame`).
 */
import { useSearchParams } from 'react-router-dom';
import { TabletopGame } from './TabletopGame';
import { LocalScriptedGame, RoomScriptedGame, isScriptedGame } from './scripted';

export function TabletopEntry() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const roomId = searchParams.get('room');
  if (gameId && isScriptedGame(gameId)) {
    if (roomId) return <RoomScriptedGame scriptId={gameId} roomId={roomId} />;
    if (searchParams.get('local') === '1') return <LocalScriptedGame scriptId={gameId} />;
  }
  return <TabletopGame />;
}
