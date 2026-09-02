import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import type { CardGameDefinition, CardTrackerType } from '../logic/types';
import { saveCustomCardGame } from '../logic/gamesCatalogue';
import { publishCustomCardGameViaPR } from '../logic/customPRPublisher';

interface CustomGameBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  onGameCreated: (game: CardGameDefinition) => void;
}

export const CustomGameBuilderDialog: React.FC<CustomGameBuilderDialogProps> = ({
  open,
  onClose,
  onGameCreated,
}) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trackerType, setTrackerType] = useState<CardTrackerType>('score_accumulator');
  const [defaultLives, setDefaultLives] = useState('3');
  const [authorNote, setAuthorNote] = useState('');
  const [submittingPr, setSubmittingPr] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

  const handleSaveLocally = () => {
    if (!name.trim()) return;
    const gameId = `custom_${Date.now()}`;
    const newGame: CardGameDefinition = {
      id: gameId,
      name: name.trim(),
      description: description.trim() || 'Benutzerdefiniertes Kartenspiel',
      trackerType,
      defaultLives: trackerType === 'lives_elimination' ? parseInt(defaultLives, 10) || 3 : undefined,
      icon: '🃏',
      isCustom: true,
    };

    saveCustomCardGame(newGame);
    onGameCreated(newGame);
    onClose();
  };

  const handlePublishPR = async () => {
    if (!name.trim()) return;
    const gameId = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newGame: CardGameDefinition = {
      id: gameId,
      name: name.trim(),
      description: description.trim() || 'Benutzerdefiniertes Kartenspiel',
      trackerType,
      defaultLives: trackerType === 'lives_elimination' ? parseInt(defaultLives, 10) || 3 : undefined,
      icon: '🃏',
      isCustom: true,
    };

    setSubmittingPr(true);
    setStatus(null);
    try {
      const res = await publishCustomCardGameViaPR(newGame, authorNote);
      if (res.success) {
        saveCustomCardGame(newGame);
        setStatus({
          type: 'success',
          message: t('games.cards.pr_success', 'Pull Request erfolgreich erstellt!'),
          url: res.prUrl,
        });
        onGameCreated(newGame);
      } else {
        throw new Error(res.error || 'Failed to create PR');
      }
    } catch (e: unknown) {
      setStatus({
        type: 'error',
        message: e instanceof Error ? e.message : 'Fehler beim PR-Erstellen',
      });
    } finally {
      setSubmittingPr(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(22, 22, 35, 0.98)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        🃏 {t('games.cards.builder_title', 'Kartenspiel-Suite Builder')}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t(
              'games.cards.builder_desc',
              'Erstelle einen eigenen Punktezähler oder Lebens-Tracker für beliebige Kartenspiele und reiche ihn optional als GitHub PR ein.',
            )}
          </Typography>

          <TextField
            fullWidth
            required
            label={t('games.cards.game_name', 'Spielname (z.B. Rommé, Doppelkopf, Phase 10)')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('games.cards.game_desc', 'Kurzbeschreibung der Spielregeln')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>{t('games.cards.tracker_mode', 'Tracking-Modus')}</InputLabel>
            <Select
              value={trackerType}
              label={t('games.cards.tracker_mode', 'Tracking-Modus')}
              onChange={(e) => setTrackerType(e.target.value as CardTrackerType)}
            >
              <MenuItem value="score_accumulator">
                📊 {t('games.cards.mode_scores', 'Punktezähler (Kumulativ / Rundenbasiert)')}
              </MenuItem>
              <MenuItem value="lives_elimination">
                ❤️ {t('games.cards.mode_lives', 'Lebenszähler & Ausscheiden (wie Schwimmen)')}
              </MenuItem>
              <MenuItem value="bids_and_tricks">
                🧙‍♂️ {t('games.cards.mode_bids', 'Stichvorhersage & Tricks (wie Oh Hell)')}
              </MenuItem>
            </Select>
          </FormControl>

          {trackerType === 'lives_elimination' && (
            <TextField
              fullWidth
              type="number"
              label={t('games.cards.default_lives', 'Startleben pro Spieler')}
              value={defaultLives}
              onChange={(e) => setDefaultLives(e.target.value)}
              size="small"
              inputProps={{ min: 1, max: 10 }}
            />
          )}

          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('games.cards.author_note', 'Notiz für PR-Beitrag (optional)')}
            placeholder="Erklärung für die GitHub Community..."
            value={authorNote}
            onChange={(e) => setAuthorNote(e.target.value)}
            size="small"
          />

          {status && (
            <Alert
              severity={status.type}
              sx={{
                bgcolor: status.type === 'success' ? 'rgba(46,125,50,0.2)' : 'rgba(211,47,47,0.2)',
                color: '#fff',
              }}
            >
              <Typography variant="body2">{status.message}</Typography>
              {status.url && (
                <Button size="small" href={status.url} target="_blank" rel="noopener noreferrer" sx={{ mt: 1 }}>
                  {t('settings.view_issue', 'Auf GitHub ansehen')}
                </Button>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose} variant="text" sx={{ color: 'text.secondary' }}>
          {t('common.cancel', 'Abbrechen')}
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveLocally}
            disabled={!name.trim()}
            sx={{ borderRadius: 50 }}
          >
            {t('games.cards.save_locally', 'Lokal speichern')}
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={submittingPr ? <CircularProgress size={16} color="inherit" /> : <GitHubIcon />}
            onClick={handlePublishPR}
            disabled={submittingPr || !name.trim()}
            sx={{ borderRadius: 50 }}
          >
            {submittingPr ? t('settings.submitting', 'Wird gesendet...') : t('games.cards.publish_pr', 'Als PR einreichen')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
