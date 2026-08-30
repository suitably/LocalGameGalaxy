import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useTranslation } from 'react-i18next';
import { gameNameOverride } from '../logic/gameNameOverride';
import type { GuessArtGameRecord } from '../logic/types';

interface EditGameDialogProps {
  open: boolean;
  onClose: () => void;
  game: GuessArtGameRecord | null;
  isHost?: boolean;
  localPlayerIds?: string[];
  onSave: (payload: {
    name?: string;
    players: { id: string; name: string }[];
  }) => Promise<void>;
}

interface EditablePlayer {
  id: string;
  name: string;
}

export const EditGameDialog: React.FC<EditGameDialogProps> = ({
  open,
  onClose,
  game,
  isHost = true,
  localPlayerIds,
  onSave,
}) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState<string>('');
  const [localAlias, setLocalAlias] = useState<string>('');
  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open && game) {
      setGameName(game.name || '');
      setLocalAlias(gameNameOverride.getAlias(game.id) || '');
      setPlayers(
        game.players.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      );
      setFeedback(null);
      setSaving(false);
    }
  }, [open, game]);

  const handlePlayerNameChange = (id: string, newName: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p)),
    );
    if (feedback) setFeedback(null);
  };

  const handleResetLocalAlias = () => {
    if (game) {
      gameNameOverride.removeAlias(game.id);
      setLocalAlias('');
    }
  };

  const handleSave = async () => {
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
        name: isHost ? gameName.trim() : (game.name || ''),
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

  if (!game) return null;

  const editablePlayers = isHost
    ? players
    : players.filter((p) =>
        localPlayerIds && localPlayerIds.length > 0
          ? localPlayerIds.includes(p.id)
          : p.id !== game.players[0]?.id,
      );

  const hasCustomLocalAlias = Boolean(localAlias.trim() || gameNameOverride.getAlias(game.id));

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1.2}>
          <EditRoundedIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={800} component="div">
              {isHost
                ? t('guessart.editGameTitle', 'Spiel & Spieler bearbeiten')
                : t('guessart.editProfileTitle', 'Spiel & Profil bearbeiten')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isHost
                ? t('guessart.editGameSubtitle', 'Passe den Namen des Spiels und die Spielernamen an.')
                : t('guessart.editProfileSubtitle', 'Passe deinen Spielernamen oder den lokalen Spielnamen an.')}
            </Typography>
          </Box>
        </Box>
        <IconButton
          aria-label={t('common.close', 'Schließen')}
          onClick={onClose}
          disabled={saving}
          size="small"
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {feedback && (
            <Alert severity="warning" onClose={() => setFeedback(null)}>
              {feedback}
            </Alert>
          )}

          {/* Game Name */}
          {isHost ? (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {t('guessart.gameName', 'Spielname')}
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder={t('guessart.gameNamePlaceholder', 'z.B. Spieleabend, WG-Runde (optional)')}
              />
            </Box>
          ) : (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {t('guessart.localGameNameLabel', 'Spielname (lokal auf diesem Gerät)')}
                </Typography>
                {hasCustomLocalAlias && (
                  <Button
                    size="small"
                    variant="text"
                    color="secondary"
                    startIcon={<RestartAltRoundedIcon fontSize="small" />}
                    onClick={handleResetLocalAlias}
                    sx={{ textTransform: 'none', py: 0, px: 1, fontSize: '0.75rem' }}
                  >
                    {t('guessart.resetLocalGameName', 'Auf Host-Namen zurücksetzen')}
                  </Button>
                )}
              </Box>
              <TextField
                size="small"
                fullWidth
                value={localAlias}
                onChange={(e) => setLocalAlias(e.target.value)}
                placeholder={game.name || t('guessart.defaultHostGameName', 'Standardname vom Host')}
                helperText={t('guessart.localGameNameHint', 'Wird nur auf diesem Gerät angezeigt')}
              />
            </Box>
          )}

          {/* Players List */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {isHost
                ? `${t('guessart.playersTitle', 'Mitspieler')} (${players.length})`
                : t('guessart.yourPlayerName', 'Dein Spielername')}
            </Typography>

            <Stack spacing={1.2}>
              {editablePlayers.map((player, index) => (
                <TextField
                  key={player.id || `p-${index}`}
                  size="small"
                  fullWidth
                  label={
                    isHost
                      ? t('guessart.playerNumber', { number: index + 1, defaultValue: `Spieler ${index + 1}` })
                      : t('guessart.yourName', 'Dein Spielername')
                  }
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(player.id, e.target.value)}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          {t('common.cancel', 'Abbrechen')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
        >
          {t('guessart.saveChanges', 'Änderungen speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
