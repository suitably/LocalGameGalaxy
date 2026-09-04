import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import { useTranslation } from 'react-i18next';
import type { PlayerManagerCardProps } from './types';

export const PlayerManagerCard: React.FC<PlayerManagerCardProps> = ({
  players,
  onAddPlayer,
  onRemovePlayer,
  onToggleRemote: _onToggleRemote,
  minPlayers = 2,
  maxPlayers,
  title,
  description,
  placeholder,
  cardVariant = 'elevation',
  sx,
  headerRight,
}) => {
  const { t } = useTranslation();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const displayTitle = title ?? t('lobby.playersTitle', 'Mitspieler');
  const displayDescription =
    description ??
    t('lobby.playersSetupDesc', {
      min: minPlayers,
      defaultValue: `Füge mindestens ${minPlayers} Spieler hinzu. Gespielt werden kann flexibel an einem Gerät oder mit eigenen Einladungslinks.`,
    });
  const displayPlaceholder =
    placeholder ?? t('lobby.playerNamePlaceholder', 'Name eingeben...');

  const handleAdd = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) {
      return;
    }

    if (maxPlayers !== undefined && players.length >= maxPlayers) {
      setFeedback(
        t('lobby.maxPlayers', {
          max: maxPlayers,
          defaultValue: `Maximale Anzahl von ${maxPlayers} Spielern erreicht!`,
        }),
      );
      return;
    }

    const success = onAddPlayer(trimmed);
    if (success !== false) {
      setNewPlayerName('');
      setFeedback(null);
    } else {
      setFeedback(t('lobby.duplicatePlayer', 'Spieler existiert bereits!'));
    }
  };

  return (
    <Card variant={cardVariant} sx={{ borderRadius: 3, boxShadow: cardVariant === 'elevation' ? 3 : undefined, ...sx }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Card Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="h6" fontWeight={700}>
            {displayTitle} ({players.length})
          </Typography>
          {headerRight}
        </Box>

        {displayDescription && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {displayDescription}
          </Typography>
        )}

        {feedback && (
          <Alert severity="warning" onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
            {feedback}
          </Alert>
        )}

        {/* Input & Add Button */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={displayPlaceholder}
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddAltRoundedIcon />}
            onClick={handleAdd}
            sx={{ minWidth: 130, fontWeight: 700 }}
          >
            {t('common.add', 'Hinzufügen')}
          </Button>
        </Stack>

        {/* Player Chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minHeight: 40, alignItems: 'center' }}>
          {players.map((player, idx) => (
            <Chip
              key={player.name}
              label={player.name}
              onDelete={() => onRemovePlayer(player.name, idx)}
              color="primary"
              variant="filled"
              sx={{ fontWeight: 700, fontSize: '0.95rem', py: 2.2, px: 0.5 }}
            />
          ))}
          {players.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
              {t('lobby.noPlayersYet', 'Noch keine Spieler hinzugefügt.')}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
