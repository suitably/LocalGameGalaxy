import { useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { GuessArtGameRecord } from '../logic/types';

/** Open/close state of the info, history, edit and catalogue dialogs. */
export function useGuessArtDialogState() {
  const [historyGameId, setHistoryGameId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [catalogueEditorOpen, setCatalogueEditorOpen] = useState<boolean>(false);
  const [editGameRecord, setEditGameRecord] = useState<GuessArtGameRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);

  const handleOpenHistory = (gameId: string | null) => {
    setHistoryGameId(gameId);
    setHistoryOpen(true);
  };

  const handleOpenEdit = (targetGame: GuessArtGameRecord | null) => {
    setEditGameRecord(targetGame);
    setEditDialogOpen(true);
  };

  const handleCloseInfo = () => {
    setInfoOpen(false);
    storage.set(STORAGE_KEYS.GUESSART_SEEN_INFO, 'true');
  };

  return {
    historyGameId,
    historyOpen,
    setHistoryOpen,
    catalogueEditorOpen,
    setCatalogueEditorOpen,
    editGameRecord,
    editDialogOpen,
    setEditDialogOpen,
    infoOpen,
    setInfoOpen,
    handleOpenHistory,
    handleOpenEdit,
    handleCloseInfo,
  };
}
