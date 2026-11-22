/**
 * This device's own Qwixx sheet in a party room [ID: GAME-QWIXX-ROOM-PLAYER]
 *
 * Keeps the sheet locally (`useQwixxState`, one storage key per room and game), shows the room's
 * dice, locks rows other players closed, reports the sheet's summary to the room and says "done"
 * for each roll. Mounted with
 * `key={gameId}`, so a new game starts a fresh sheet.
 */
import React, { useEffect, useMemo } from 'react';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_PREFIXES } from '../../../lib/storage';
import { useQwixxState } from '../useQwixxState';
import {
  closedRows,
  rowsToLock,
  sameSummary,
  summarizeSheet,
  type QwixxRoomAction,
  type QwixxRoomState,
} from '../logic/qwixxRoom';
import type { RowColor } from '../logic/types';
import { QwixxDiceRoller } from './QwixxDiceRoller';
import { QwixxSheet } from './QwixxSheet';

interface Props {
  roomId: string;
  myId: string;
  state: QwixxRoomState;
  dispatch: (action: QwixxRoomAction) => void;
  /** This device may roll for the current roller (they allowed help). */
  rollForOther?: boolean;
}

export const QwixxRoomPlayer: React.FC<Props> = ({
  roomId,
  myId,
  state,
  dispatch,
  rollForOther = false,
}) => {
  const { t } = useTranslation();
  const roomPrefix = `${STORAGE_PREFIXES.QWIXX_ROOM_SHEET}${roomId}_`;
  const sheetKey = `${roomPrefix}${state.gameId}`;
  const game = useQwixxState(sheetKey);
  const sheet = game.state.mySheet;

  // Sheets of earlier games in this room are not needed any more.
  useEffect(() => {
    for (const key of storage.findKeysWithPrefix(roomPrefix))
      if (key !== sheetKey) storage.remove(key);
  }, [roomPrefix, sheetKey]);

  // Show the room's dice on this sheet (highlights use them).
  const { roll } = game;
  const diceKey = Object.values(state.dice).join(',');
  useEffect(() => {
    roll(state.dice);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow the values, not the object
  }, [diceKey, roll]);

  // A row another player closed is closed here too: lock it (no bonus, no more crosses).
  const { lockRow } = game;
  const toLock = rowsToLock(sheet, state, myId).join(',');
  useEffect(() => {
    for (const color of toLock.split(',').filter(Boolean)) lockRow(color as RowColor);
  }, [toLock, lockRow]);

  // Tell the room about this sheet whenever its score, misses or locks change.
  const summary = useMemo(() => summarizeSheet(sheet), [sheet]);
  const reported = state.boards[myId];
  useEffect(() => {
    if (!sameSummary(reported, summary)) dispatch({ type: 'REPORT', playerId: myId, summary });
  }, [reported, summary, myId, dispatch]);

  const myRoll = state.players[state.rollerIndex]?.id === myId;
  const canRoll = (myRoll || rollForOther) && !state.rolled && !state.isGameOver;
  const removedDice = useMemo(
    () => [...new Set([...game.removedDice, ...closedRows(state)])],
    [game.removedDice, state],
  );

  return (
    <>
      <QwixxDiceRoller
        dice={state.dice}
        isRolling={game.state.isRolling}
        onRoll={(dice) => canRoll && dispatch({ type: 'ROLL', dice })}
        onDieClick={game.clickDie}
        selectedDie={game.selectedDie}
        disabled={!canRoll}
        maxDieValue={sheet.sheetType === 'longo' ? 8 : 6}
        removedDice={removedDice}
      />
      <QwixxSheet
        sheet={sheet}
        onCrossNumber={game.crossNumber}
        onLockRow={game.lockRow}
        onUnlockRow={game.unlockRow}
        onAddMiss={game.addMiss}
        onRemoveMiss={game.removeMiss}
        highlightedNumbers={game.highlightedNumbers}
      />
      {state.rolled && !state.done.includes(myId) && !state.isGameOver && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 'max(12px, env(safe-area-inset-bottom))',
            display: 'flex',
            justifyContent: 'center',
            mt: 2,
            zIndex: 2,
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() => dispatch({ type: 'DONE', playerId: myId })}
            data-room-target="qwixx.done"
            sx={{ minHeight: 48, minWidth: 200, fontWeight: 800, borderRadius: 999 }}
          >
            {t('games.qwixx.room_done')}
          </Button>
        </Box>
      )}
    </>
  );
};
