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
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useTranslation } from 'react-i18next';
import type { GuessArtGameRecord } from '../logic/types';

interface EditGameDialogProps {
  open: boolean;
  onClose: () => void;
  game: GuessArtGameRecord | null;
  onSave: (payload: {
    name: string;
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
  onSave,
}) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState<string>('');
  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open && game) {
      setGameName(game.name || '');
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

  const handlePlayerNameChange = (index: number, newName: string) => {
    setPlayers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, name: newName } : p)),
    );
    if (feedback) setFeedback(null);
  };

  const handleSave = async () => {
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
      await onSave({
        name: gameName.trim(),
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
              {t('guessart.editGameTitle', 'Spiel & Spieler bearbeiten')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('guessart.editGameSubtitle', 'Passe den Namen des Spiels und die Spielernamen an.')}
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

          {/* Players List */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {t('guessart.playersTitle', 'Mitspieler')} ({players.length})
            </Typography>

            <Stack spacing={1.2}>
              {players.map((player, index) => (
                <TextField
                  key={player.id || `p-${index}`}
                  size="small"
                  fullWidth
                  label={t('guessart.playerNumber', { number: index + 1, defaultValue: `Spieler ${index + 1}` })}
                  value={player.name}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
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
