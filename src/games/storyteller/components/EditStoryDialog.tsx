import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StoryGameRecord } from '../types';

interface EditStoryDialogProps {
  open: boolean;
  onClose: () => void;
  game: StoryGameRecord | null;
  onSave: (payload: { name?: string; players?: { id: string; name: string }[] }) => Promise<void>;
}

export const EditStoryDialog: React.FC<EditStoryDialogProps> = ({
  open,
  onClose,
  game,
  onSave,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (game) {
      setName(game.name || '');
      setPlayers(game.players.map((p) => ({ id: p.id, name: p.name })));
    }
  }, [game]);

  const handlePlayerNameChange = (id: string, newName: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || undefined,
        players,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('storyteller.editStory', 'Geschichte bearbeiten')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <TextField
            label={t('storyteller.storyTitleLabel', 'Titel der Geschichte')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
          />

          <Typography variant="subtitle2" fontWeight={700}>
            {t('storyteller.playersTitle', 'Spieler')}
          </Typography>

          <Stack spacing={1.5}>
            {players.map((player, idx) => (
              <TextField
                key={player.id}
                label={`${t('storyteller.defaultPlayer', 'Spieler')} ${idx + 1}`}
                value={player.name}
                onChange={(e) => handlePlayerNameChange(player.id, e.target.value)}
                size="small"
                fullWidth
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel', 'Abbrechen')}
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {t('common.save', 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
