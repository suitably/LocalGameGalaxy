import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import { useTranslation } from 'react-i18next';
import { PlayerManagerCard } from '../../../modules/player-management';
import type { StoryLobbyPlayerItem } from '../hooks/useStorytellerLobby';
import type { StoryGameRecord, StoryModifierSettings } from '../types';

interface StoryLobbyProps {
  players: StoryLobbyPlayerItem[];
  modifiers: StoryModifierSettings;
  activeGames: StoryGameRecord[];
  onAddPlayer: (name: string, isRemote?: boolean) => boolean | void;
  onRemovePlayer: (nameOrIndex: string | number) => void;
  onUpdateModifier: <K extends keyof StoryModifierSettings>(
    key: K,
    patch: Partial<StoryModifierSettings[K]>,
  ) => void;
  onStartGame: (options: { name?: string; language: string; modifiers: StoryModifierSettings }) => void;
  onResumeGame: (id: string) => void;
  onDeleteGame: (id: string) => void;
}

export const StoryLobby: React.FC<StoryLobbyProps> = ({
  players,
  modifiers,
  activeGames,
  onAddPlayer,
  onRemovePlayer,
  onUpdateModifier,
  onStartGame,
  onResumeGame,
  onDeleteGame,
}) => {
  const { t, i18n } = useTranslation();
  const [storyName, setStoryName] = useState('');
  const language = i18n.language.startsWith('de') ? 'de' : 'en';

  const handleStart = () => {
    onStartGame({
      name: storyName.trim() || undefined,
      language,
      modifiers,
    });
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1.5, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Title & Banner */}
      <Box textAlign="center" pt={1}>
        <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
          <AutoStoriesRoundedIcon sx={{ fontSize: 36, color: '#38bdf8' }} />
          <Typography variant="h4" fontWeight={800} sx={{ color: '#f8fafc' }}>
            {t('games.storyteller.title', 'Geschichtenschreiber')}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
          {t('games.storyteller.description', 'Schreibt gemeinsam eine Geschichte – Zug um Zug mit modularen Spielregeln!')}
        </Typography>
      </Box>

      {/* Players Setup */}
      <PlayerManagerCard
        players={players}
        onAddPlayer={(name, isRemote) => Boolean(onAddPlayer(name, isRemote))}
        onRemovePlayer={onRemovePlayer}
        cardVariant="outlined"
        title={t('storyteller.playersTitle', 'Spieler')}
        description=""
        placeholder={t('storyteller.playerNamePlaceholder', 'Name eingeben...')}
        minPlayers={2}
        sx={{
          bgcolor: 'rgba(15, 23, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
        }}
      />

      {/* Modifiers Baukasten */}
      <Card variant="outlined" sx={{ bgcolor: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <TuneRoundedIcon sx={{ color: '#38bdf8' }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc' }}>
              {t('storyteller.modifiersTitle', 'Modifikatoren (Baukasten)')}
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {/* Blind Mode */}
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={modifiers.blindMode.enabled}
                    onChange={(e) => onUpdateModifier('blindMode', { enabled: e.target.checked })}
                    sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }}
                  />
                }
                label={<Typography fontWeight={700}>{t('storyteller.modBlindTitle', 'Blind Mode')}</Typography>}
              />
              <Typography variant="caption" display="block" sx={{ color: '#94a3b8', ml: 4 }}>
                {t('storyteller.modBlindDesc', 'Spieler sehen nur die letzten 10 Wörter des vorherigen Spielers, nicht die ganze Geschichte.')}
              </Typography>
            </Box>

            {/* Time Attack */}
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={modifiers.timeAttack.enabled}
                      onChange={(e) => onUpdateModifier('timeAttack', { enabled: e.target.checked })}
                      sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }}
                    />
                  }
                  label={<Typography fontWeight={700}>{t('storyteller.modTimeTitle', 'Time Attack')}</Typography>}
                />
                {modifiers.timeAttack.enabled && (
                  <Select
                    size="small"
                    value={modifiers.timeAttack.timeLimitSeconds}
                    onChange={(e) => onUpdateModifier('timeAttack', { timeLimitSeconds: Number(e.target.value) })}
                    sx={{ height: 32, fontSize: '0.8rem', color: '#f8fafc' }}
                  >
                    <MenuItem value={30}>30s</MenuItem>
                    <MenuItem value={45}>45s</MenuItem>
                    <MenuItem value={60}>60s</MenuItem>
                    <MenuItem value={90}>90s</MenuItem>
                  </Select>
                )}
              </Stack>
              <Typography variant="caption" display="block" sx={{ color: '#94a3b8', ml: 4 }}>
                {t('storyteller.modTimeDesc', 'Ein Timer läuft pro Zug ab. Nach Ablauf der Zeit wird der Text automatisch übermittelt.')}
              </Typography>
            </Box>

            {/* Word Roulette */}
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={modifiers.wordRoulette.enabled}
                    onChange={(e) => onUpdateModifier('wordRoulette', { enabled: e.target.checked })}
                    sx={{ color: '#38bdf8', '&.Mui-checked': { color: '#38bdf8' } }}
                  />
                }
                label={<Typography fontWeight={700}>{t('storyteller.modRouletteTitle', 'Word Roulette')}</Typography>}
              />
              <Typography variant="caption" display="block" sx={{ color: '#94a3b8', ml: 4 }}>
                {t('storyteller.modRouletteDesc', 'Das System zieht pro Zug 3 zufällige Pflichtwörter, die im Text vorkommen müssen, bevor man absenden kann.')}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Story Name & Launch */}
      <Stack spacing={2}>
        <TextField
          size="small"
          fullWidth
          label={t('storyteller.storyTitleOptional', 'Titel der Geschichte (optional)')}
          placeholder={t('storyteller.storyTitlePlaceholder', 'z.B. Die geheimnisvolle Schatzkarte')}
          value={storyName}
          onChange={(e) => setStoryName(e.target.value)}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleStart}
          disabled={players.length < 2}
          startIcon={<PlayArrowRoundedIcon />}
          sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, py: 1.25, fontWeight: 700 }}
        >
          {t('storyteller.startStory', 'Geschichte beginnen')}
        </Button>
      </Stack>

      {/* Active Stories */}
      {activeGames.length > 0 && (
        <Card variant="outlined" sx={{ bgcolor: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc', mb: 1.5 }}>
              {t('storyteller.savedStories', 'Gespeicherte Geschichten')}
            </Typography>

            <List dense disablePadding>
              {activeGames.map((g) => (
                <ListItem
                  key={g.id}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 1.5,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                  }}
                  onClick={() => onResumeGame(g.id)}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={700}>
                          {g.name || t('games.storyteller.title', 'Geschichtenschreiber')}
                        </Typography>
                        <Chip
                          size="small"
                          label={g.status === 'completed' ? t('storyteller.completed', 'Beendet') : `${t('storyteller.turnLabel', 'Zug')} ${g.turnNumber}`}
                          color={g.status === 'completed' ? 'success' : 'info'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Stack>
                    }
                    secondary={`${g.players.map((p) => p.name).join(', ')} • ${new Date(g.updatedAt).toLocaleDateString()}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" edge="end" onClick={(e) => { e.stopPropagation(); onDeleteGame(g.id); }}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
