import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gameNameOverride } from '../logic/gameNameOverride';
import type { GuessArtGameRecord } from '../logic/types';

export interface EditablePlayer {
  id: string;
  name: string;
}

export interface EditGamePayload {
  name?: string;
  players: EditablePlayer[];
}

interface UseEditGameStateArgs {
  open: boolean;
  game: GuessArtGameRecord | null;
  isHost: boolean;
  localPlayerIds?: string[];
  onClose: () => void;
  onSave: (payload: EditGamePayload) => Promise<void>;
}

/** Form state, validation and save handling of the "edit game & players" dialog. */
export const useEditGameState = ({
  open,
  game,
  isHost,
  localPlayerIds,
  onClose,
  onSave,
}: UseEditGameStateArgs) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState<string>('');
  const [localAlias, setLocalAlias] = useState<string>('');
  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Re-initialise the form whenever the dialog opens (or the game changes) while open.
  const [initialisedFor, setInitialisedFor] = useState<GuessArtGameRecord | null>(null);
  const activeGame = open ? game : null;
  if (activeGame !== initialisedFor) {
    setInitialisedFor(activeGame);
    if (activeGame) {
      setGameName(activeGame.name || '');
      setLocalAlias(gameNameOverride.getAlias(activeGame.id) || '');
      setPlayers(activeGame.players.map((p) => ({ id: p.id, name: p.name })));
      setFeedback(null);
      setSaving(false);
    }
  }

  const changePlayerName = (id: string, newName: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
    if (feedback) setFeedback(null);
  };

  const resetLocalAlias = () => {
    if (game) {
      gameNameOverride.removeAlias(game.id);
      setLocalAlias('');
    }
  };

  const save = async () => {
    if (!game) return;

    const trimmedPlayers = players.map((p) => ({ ...p, name: p.name.trim() }));
    if (trimmedPlayers.some((p) => !p.name)) {
      setFeedback(t('guessart.playerEmptyError', 'Spielernamen dürfen nicht leer sein.'));
      return;
    }

    const nameSet = new Set<string>();
    for (const p of trimmedPlayers) {
      const lower = p.name.toLowerCase();
      if (nameSet.has(lower)) {
        setFeedback(t('guessart.duplicatePlayerError', 'Spielernamen müssen eindeutig sein.'));
        return;
      }
      nameSet.add(lower);
    }

    setSaving(true);
    setFeedback(null);
    try {
      if (!isHost) {
        if (localAlias.trim()) {
          gameNameOverride.setAlias(game.id, localAlias.trim());
        } else {
          gameNameOverride.removeAlias(game.id);
        }
      }
      await onSave({
        name: isHost ? gameName.trim() : game.name || '',
        players: trimmedPlayers,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update game details', err);
      setFeedback(
        err instanceof Error
          ? err.message
          : t('guessart.genericError', 'Ein Fehler ist aufgetreten.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const editablePlayers =
    isHost || !game
      ? players
      : players.filter((p) =>
          localPlayerIds && localPlayerIds.length > 0
            ? localPlayerIds.includes(p.id)
            : p.id !== game.players[0]?.id,
        );

  const hasCustomLocalAlias = Boolean(
    game && (localAlias.trim() || gameNameOverride.getAlias(game.id)),
  );

  return {
    gameName,
    setGameName,
    localAlias,
    setLocalAlias,
    players,
    editablePlayers,
    feedback,
    setFeedback,
    saving,
    hasCustomLocalAlias,
    changePlayerName,
    resetLocalAlias,
    save,
  };
};
