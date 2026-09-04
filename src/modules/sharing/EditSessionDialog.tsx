import React, { useState, useEffect } from 'react';
import {
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
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useTranslation } from 'react-i18next';

export interface EditableSessionPlayer {
  id: string;
  name: string;
}

export interface EditSessionDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  initialName?: string;
  nameLabel?: string;
  players: EditableSessionPlayer[];
  isHost?: boolean;
  onSave: (payload: { name?: string; players: EditableSessionPlayer[] }) => Promise<void>;
  extraContent?: React.ReactNode;
}

export const EditSessionDialog: React.FC<EditSessionDialogProps> = ({
  open,
  onClose,
  title,
  initialName = '',
  nameLabel,
  players: initialPlayers,
  isHost = true,
  onSave,
  extraContent,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [players, setPlayers] = useState<EditableSessionPlayer[]>(initialPlayers);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setPlayers(initialPlayers.map((p) => ({ ...p })));
    }
  }, [open, initialName, initialPlayers]);

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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {title || t('common.editSession', 'Sitzung bearbeiten')}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={t('common.close', 'Schließen')}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {isHost && (
            <TextField
              label={nameLabel || t('common.title', 'Titel')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
            />
          )}

          {extraContent}

          <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
            {t('common.playerNames', 'Spielernamen')}
          </Typography>

          <Stack spacing={1.5}>
            {players.map((p, idx) => (
              <TextField
                key={p.id}
                label={`${t('common.player', 'Spieler')} ${idx + 1}`}
                value={p.name}
                onChange={(e) => handlePlayerNameChange(p.id, e.target.value)}
                size="small"
                fullWidth
                disabled={!isHost}
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel', 'Abbrechen')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
          disabled={saving}
          sx={{ fontWeight: 700 }}
        >
          {t('common.save', 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
