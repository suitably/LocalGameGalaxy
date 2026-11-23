/**
 * Pass and play for score-sheet games on one device [ID: MOD-PASS-AND-PLAY-TURNS]
 *
 * Bundles the turn cover (`useTurnHandover`) and the player list (`LocalPlayersDialog`) for games
 * that keep `players[]` + an active index (Kniffel, Knister). Render `overlay` once.
 */
import { useCallback, useMemo, useState } from 'react';
import { HandoverCover } from './HandoverCover';
import { LocalPlayersDialog } from './LocalPlayersDialog';
import { useTurnHandover } from './useTurnHandover';
import type { HandoverPlayer } from './handover';

interface Options {
  players: HandoverPlayer[];
  activeIndex: number;
  /** Make another player the active one (the game's `SWITCH_PLAYER`). */
  onSwitch: (index: number) => void;
  /** Replace the players and start over (the game's `SET_PLAYERS`). */
  onSetPlayers: (names: string[]) => void;
  maxPlayers?: number;
}

export function usePassAndPlayTurns({
  players,
  activeIndex,
  onSwitch,
  onSetPlayers,
  maxPlayers,
}: Options) {
  const [editing, setEditing] = useState(false);
  const handoverPlayers = useMemo(
    () => players.map(({ id, name, color }) => ({ id, name, color })),
    [players],
  );
  const onActivate = useCallback(
    (id: string) => {
      const index = players.findIndex((p) => p.id === id);
      if (index >= 0) onSwitch(index);
    },
    [players, onSwitch],
  );
  const turn = useTurnHandover(handoverPlayers, players[activeIndex]?.id, onActivate);
  const { acknowledge } = turn;

  /** A switch made on purpose (tab, column header): no cover. */
  const switchTo = useCallback(
    (index: number) => {
      const id = players[index]?.id;
      if (id) acknowledge(id);
      onSwitch(index);
    },
    [players, acknowledge, onSwitch],
  );

  const overlay = (
    <>
      {turn.coveredFor && (
        <HandoverCover
          player={turn.coveredFor}
          players={handoverPlayers}
          onReveal={turn.reveal}
          onRetarget={turn.retarget}
        />
      )}
      <LocalPlayersDialog
        open={editing}
        names={players.map((p) => p.name)}
        maxPlayers={maxPlayers}
        onApply={(names) => {
          setEditing(false);
          onSetPlayers(names);
        }}
        onClose={() => setEditing(false)}
      />
    </>
  );

  return { switchTo, openPlayers: () => setEditing(true), overlay };
}
