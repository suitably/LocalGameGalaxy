import { useCallback, useState } from 'react';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import { LocalGameEngine } from '../logic/engine';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

/** State and handlers of the "share player links" dialog. */
export function useGuessArtShareDialog(
  language: string,
  triggerLocalUpdate: () => void,
  reload: () => Promise<void>,
) {
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [shareDialogGame, setShareDialogGame] = useState<GuessArtGameRecord | null>(null);
  const [shareDialogRound, setShareDialogRound] = useState<GuessArtRound | null>(null);

  // After a share or "play here": reload, so the share dialog never works on a stale player list.
  const handlePlayersChanged = useCallback(async () => {
    triggerLocalUpdate();
    if (shareDialogGame) {
      const snap = await LocalGameEngine.getGameSnapshot(shareDialogGame.id, language).catch(
        () => null,
      );
      if (snap) setShareDialogGame(snap.game);
    }
    await reload();
  }, [triggerLocalUpdate, shareDialogGame, language, reload]);

  const handleOpenShareLinks = useCallback(
    async (targetGame: GuessArtGameRecord | null, targetRound?: GuessArtRound | null) => {
      if (!targetGame) return;
      let effRound = targetRound || null;
      if (!effRound) {
        try {
          const snap = await LocalGameEngine.getGameSnapshot(targetGame.id, language);
          effRound = snap.round;
        } catch (e) {
          console.warn('[GuessArt] Failed to load round for share links:', e);
        }
      }
      setShareDialogGame(targetGame);
      setShareDialogRound(effRound);
      setShareDialogOpen(true);

      if (effRound) {
        try {
          await guessArtMailbox.publish(targetGame.id, {
            game: targetGame,
            round: effRound,
          });
        } catch (e) {
          console.warn('[GuessArt] Failed to publish snapshot on opening share dialog:', e);
        }
      }
    },
    [language],
  );

  const handleCloseShare = () => {
    setShareDialogOpen(false);
    triggerLocalUpdate();
  };

  return {
    shareDialogOpen,
    shareDialogGame,
    shareDialogRound,
    handlePlayersChanged,
    handleOpenShareLinks,
    handleCloseShare,
  };
}
