import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  TextField,
  IconButton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDartsGame } from '../useDartsGame';
import { useState, useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

type DartsGameState = ReturnType<typeof useDartsGame>;

interface Props {
  open: boolean;
  onClose: () => void;
  state: DartsGameState;
}

export function DartsSettings({ open, onClose, state }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(state.settings.mode);
  const [doubleOut, setDoubleOut] = useState(state.settings.doubleOut);
  const [players, setPlayers] = useState(state.players);

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setMode(state.settings.mode);
      setDoubleOut(state.settings.doubleOut);
      setPlayers([...state.players]);
    }
  }, [open, state.settings, state.players]);

  const handleSave = () => {
    state.updateSettings({ mode, doubleOut });
    state.updatePlayers(players);
    onClose();
  };

  const handleAddPlayer = () => {
    const newId = Date.now().toString();
    setPlayers([
      ...players,
      { id: newId, name: `${t('games.darts.player')} ${players.length + 1}` },
    ]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length > 1) {
      setPlayers(players.filter((p) => p.id !== id));
    }
  };

  const handlePlayerNameChange = (id: string, newName: string) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, name: newName } : p)));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('games.darts.settings')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="mode-select-label">{t('games.darts.mode')}</InputLabel>
            <Select
              labelId="mode-select-label"
              value={mode}
              label={t('games.darts.mode')}
              onChange={(e) =>
                setMode(e.target.value as ReturnType<typeof useDartsGame>['settings']['mode'])
              }
            >
              <MenuItem value="501">501</MenuItem>
              <MenuItem value="301">301</MenuItem>
              <MenuItem value="count_up">{t('games.darts.count_up')}</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={doubleOut}
                onChange={(e) => setDoubleOut(e.target.checked)}
                disabled={mode === 'count_up'}
              />
            }
            label={t('games.darts.double_out')}
          />

          <Box sx={{ mt: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <InputLabel>{t('games.darts.players')}</InputLabel>
              <Button startIcon={<AddIcon />} size="small" onClick={handleAddPlayer}>
                {t('games.darts.add_player')}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {players.map((p, index) => (
                <Box key={p.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={p.name}
                    onChange={(e) => handlePlayerNameChange(p.id, e.target.value)}
                    placeholder={`${t('games.darts.player')} ${index + 1}`}
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleRemovePlayer(p.id)}
                    disabled={players.length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={handleSave} variant="contained">
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
