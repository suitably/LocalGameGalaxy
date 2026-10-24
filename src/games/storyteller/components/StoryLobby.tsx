import React, { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'react-i18next';
import { PlayerManagerCard } from '../../../modules/player-management';
import type { StoryLobbyPlayerItem } from '../hooks/useStorytellerLobby';
import { StoryModifierCard } from './StoryModifierCard';
import { SavedStoriesCard } from './SavedStoriesCard';
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
  onStartGame: (options: {
    name?: string;
    language: string;
    modifiers: StoryModifierSettings;
  }) => void;
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
    <Box
      sx={{
        maxWidth: 800,
        mx: 'auto',
        p: { xs: 1.5, sm: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {t(
          'games.storyteller.description',
          'Schreibt gemeinsam eine Geschichte – Zug um Zug mit modularen Spielregeln!',
        )}
      </Typography>

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
      />

      <StoryModifierCard modifiers={modifiers} onUpdateModifier={onUpdateModifier} />

      {/* Story Name & Launch */}
      <Stack spacing={2}>
        <TextField
          size="small"
          fullWidth
          label={t('storyteller.storyTitleOptional', 'Titel der Geschichte (optional)')}
          placeholder={t(
            'storyteller.storyTitlePlaceholder',
            'z.B. Die geheimnisvolle Schatzkarte',
          )}
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
        >
          {t('storyteller.startStory', 'Geschichte beginnen')}
        </Button>
      </Stack>

      {activeGames.length > 0 && (
        <SavedStoriesCard
          games={activeGames}
          onResumeGame={onResumeGame}
          onDeleteGame={onDeleteGame}
        />
      )}
    </Box>
  );
};
