/**
 * Tells a player that someone played for them [ID: COMP-PARTY-HELP-NOTICE]
 *
 * A helper's device sends a live `helped` event with each action it does for another player
 * (`usePartyRoomGame`); the helped device shows who it was, so moves never appear unexplained.
 */
import React, { useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRoomEvents } from '../../../modules/room-game';
import type { RoomPlayer } from '../logic/partyRoster';
import { HELP_GAME_KEY, type HelpEvent } from '../logic/partyHelp';

/** Older events (MQTT redelivers the last one on join) are not shown. */
const FRESH_MS = 10_000;

export const PartyHelpNotice: React.FC<{
  roomId: string;
  myId: string;
  players: readonly RoomPlayer[];
}> = ({ roomId, myId, players }) => {
  const { t } = useTranslation();
  const [helper, setHelper] = useState<{ name: string; at: number } | null>(null);
  useRoomEvents<HelpEvent>({
    gameKey: HELP_GAME_KEY,
    roomId,
    onEvent: (e) => {
      if (e?.type !== 'helped' || e.for !== myId || e.by === myId) return;
      if (Date.now() - e.at > FRESH_MS) return;
      const name = players.find((p) => p.id === e.by)?.name ?? '';
      setHelper({ name, at: e.at });
    },
  });
  return (
    <Snackbar
      key={helper?.at}
      open={helper !== null}
      autoHideDuration={4000}
      onClose={() => setHelper(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="info" variant="filled" onClose={() => setHelper(null)}>
        {t('party.help.playedForYou', { name: helper?.name ?? '' })}
      </Alert>
    </Snackbar>
  );
};
