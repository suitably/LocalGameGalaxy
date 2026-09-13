import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopGameDefinition, TabletopPlayMode } from '../../logic/types';

interface EditGameDialogProps {
  open: boolean;
  game: TabletopGameDefinition | null;
  onClose: () => void;
  onSave: (updated: TabletopGameDefinition) => Promise<void>;
}

export const EditGameDialog: React.FC<EditGameDialogProps> = ({ open, game, onClose, onSave }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(game?.name || '');
  const [description, setDescription] = useState(game?.description || '');
  const [author, setAuthor] = useState(game?.author || '');
  const [minPlayers, setMinPlayers] = useState(game?.minPlayers || 1);
  const [maxPlayers, setMaxPlayers] = useState(game?.maxPlayers || 4);
  const [modes, setModes] = useState<TabletopPlayMode[]>(game?.supportedModes || ['party_multi_device', 'local_pass_and_play']);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (game) {
      setName(game.name);
      setDescription(game.description || '');
      setAuthor(game.author || '');
      setMinPlayers(game.minPlayers);
      setMaxPlayers(game.maxPlayers);
      setModes(game.supportedModes || ['party_multi_device', 'local_pass_and_play']);
    }
  }, [game]);

  const toggleMode = (mode: TabletopPlayMode) => {
    if (modes.includes(mode)) {
      if (modes.length > 1) {
        setModes(modes.filter((m) => m !== mode));
      }
    } else {
      setModes([...modes, mode]);
    }
  };

  const handleSave = async () => {
    if (!game || !name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...game,
        name: name.trim(),
        description: description.trim(),
        author: author.trim(),
        minPlayers: Math.max(1, minPlayers),
        maxPlayers: Math.max(minPlayers, maxPlayers),
        supportedModes: modes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('games.tabletop.edit_title', 'Spiel bearbeiten')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label={t('games.tabletop.game_name', 'Spielname')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label={t('games.tabletop.description', 'Beschreibung')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label={t('games.tabletop.author', 'Autor / Urheber')}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            fullWidth
          />
          <Box display="flex" gap={2}>
            <TextField
              label={t('games.tabletop.min_players', 'Min. Spieler')}
              type="number"
              value={minPlayers}
              onChange={(e) => setMinPlayers(Number(e.target.value))}
              fullWidth
            />
            <TextField
              label={t('games.tabletop.max_players', 'Max. Spieler')}
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              fullWidth
            />
          </Box>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={modes.includes('party_multi_device')}
                  onChange={() => toggleMode('party_multi_device')}
                />
              }
              label={t('games.tabletop.mode_party', 'Party-Modus (Jeder auf seinem Smartphone)')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={modes.includes('local_pass_and_play')}
                  onChange={() => toggleMode('local_pass_and_play')}
                />
              }
              label={t('games.tabletop.mode_local', 'Lokal / Pass-and-Play (An 1 Gerät / Tablet)')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={modes.includes('solo')}
                  onChange={() => toggleMode('solo')}
                />
              }
              label={t('games.tabletop.mode_solo', 'Solo-Modus (Einzelspieler)')}
            />
          </FormGroup>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">{t('common.cancel', 'Abbrechen')}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>
          {t('common.save', 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
