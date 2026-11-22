/**
 * Qwixx on one device for several players: the table of sheets [ID: GAME-QWIXX-LOCAL-TABLE-HOOK]
 *
 * One player keeps the plain single-sheet game (no table). With two or more names every player
 * has a sheet; "<name> fertig" passes the device on through the shared handover cover.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import { usePassAndPlay, type HandoverPlayer } from '../../modules/pass-and-play';
import { createInitialSheet } from './logic/qwixxReducer';
import {
  isQwixxTable,
  openSheet,
  resetTable,
  tableFromNames,
  tableScores,
  type QwixxTable,
} from './logic/qwixxTable';
import type { PlayerSheet } from './logic/types';

const emptyLike = (sheet: PlayerSheet, name = sheet.name) =>
  createInitialSheet(name, sheet.sheetType, sheet.presetIndex, sheet.customRows);

export function useQwixxLocalTable(mySheet: PlayerSheet, loadSheet: (sheet: PlayerSheet) => void) {
  const [table, setTable] = useState<QwixxTable | null>(() => {
    const raw = storage.getJson<unknown>(STORAGE_KEYS.QWIXX_LOCAL_TABLE, null);
    return isQwixxTable(raw) ? raw : null;
  });
  useEffect(() => {
    if (table) storage.setJson(STORAGE_KEYS.QWIXX_LOCAL_TABLE, table);
    else storage.remove(STORAGE_KEYS.QWIXX_LOCAL_TABLE);
  }, [table]);

  const setPlayers = useCallback(
    (names: string[]) => {
      if (names.length < 2) {
        setTable(null);
        loadSheet(emptyLike(mySheet, names[0]));
        return;
      }
      const next = tableFromNames(names, mySheet);
      setTable(next);
      loadSheet(next.sheets[0]);
    },
    [mySheet, loadSheet],
  );

  const open = useCallback(
    (index: number) => {
      const opened = table && openSheet(table, mySheet, index);
      if (!opened) return;
      setTable(opened.table);
      loadSheet(opened.sheet);
    },
    [table, mySheet, loadSheet],
  );

  /** New game for the whole table; `null` when there is no table (single sheet). */
  const newGame = useCallback(() => {
    if (!table) return false;
    const fresh = emptyLike(mySheet);
    setTable(resetTable(table, fresh));
    loadSheet(fresh);
    return true;
  }, [table, mySheet, loadSheet]);

  const scores = useMemo(() => (table ? tableScores(table, mySheet) : []), [table, mySheet]);
  const players: HandoverPlayer[] = useMemo(
    () => scores.map(({ id, name }) => ({ id, name })),
    [scores],
  );
  const activeId = table ? String(table.activeIndex) : null;
  const handover = usePassAndPlay(
    players,
    activeId,
    useCallback((id: string) => open(Number(id)), [open]),
  );

  return {
    names: table ? scores.map((s) => s.name) : [mySheet.name],
    scores,
    activeId,
    players,
    handover,
    setPlayers,
    newGame,
  };
}
