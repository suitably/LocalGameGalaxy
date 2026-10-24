import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTranslation } from 'react-i18next';
import type { DbCategory } from '../logic/types';
import { PlayerManagerCard } from '../../../modules/player-management';
import { useImposterSetupState, type ImposterStartOptions } from '../hooks/useImposterSetupState';

interface GameSetupProps {
  players: Array<{ name: string; isRemote?: boolean }>;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (name: string, index?: number) => void;
  onStartGame: (setup: ImposterStartOptions) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  players,
  onAddPlayer,
  onRemovePlayer,
  onStartGame,
}) => {
  const { t, i18n } = useTranslation();
  const setup = useImposterSetupState(players.length, onStartGame);
  const { settings, allCategories } = setup;
  const currentLang = i18n.language.startsWith('de') ? 'de' : 'en';

  return (
    <Box maxWidth="sm" mx="auto">
      <PlayerManagerCard
        players={players}
        onAddPlayer={onAddPlayer}
        onRemovePlayer={onRemovePlayer}
        minPlayers={3}
        maxPlayers={20}
        sx={{ mb: 4 }}
      />

      <Paper variant="outlined" sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('games.imposter.setup.title')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('games.imposter.setup.select_category')}
            </Typography>
            <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" onClick={setup.selectAllCategories}>
                {t('games.imposter.setup.select_all')}
              </Button>
              <Button size="small" onClick={setup.selectNoCategories}>
                {t('games.imposter.setup.select_none')}
              </Button>
            </Box>
            <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {allCategories.map((category: DbCategory) => (
                <FormControlLabel
                  key={category.id}
                  control={
                    <Checkbox
                      checked={settings.selectedCategoryIds.includes(category.id)}
                      onChange={() => setup.toggleCategory(category.id)}
                    />
                  }
                  label={category.name[currentLang] || category.name.en}
                />
              ))}
            </FormGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label={t('games.imposter.setup.imposter_count')}
              type="number"
              value={settings.imposterCount}
              onChange={setup.changeImposterCount}
              inputProps={{ min: 1, max: Math.max(1, players.length - 1) }}
              sx={{ width: 150 }}
            />
            {settings.isManualImposterCount && (
              <Button size="small" startIcon={<RestoreIcon />} onClick={setup.resetImposterCount}>
                {t('games.imposter.setup.reset_to_default')}
              </Button>
            )}
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('games.imposter.setup.timer_length')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('games.imposter.setup.minutes')}
                type="number"
                value={settings.timerMinutes}
                onChange={(e) => setup.changeTimerMinutes(e.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
              />
              <TextField
                label={t('games.imposter.setup.seconds')}
                type="number"
                value={settings.timerSeconds}
                onChange={(e) => setup.changeTimerSeconds(e.target.value)}
                InputProps={{ endAdornment: <InputAdornment position="end">s</InputAdornment> }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      <Button
        variant="contained"
        size="large"
        fullWidth
        color="primary"
        disabled={players.length < 3 || settings.selectedCategoryIds.length === 0}
        onClick={setup.start}
        startIcon={<PlayArrowIcon />}
        sx={{ py: 2, borderRadius: 2, fontSize: '1.2rem', fontWeight: 'bold', mb: 4 }}
      >
        {t('common.start')}
      </Button>
    </Box>
  );
};
