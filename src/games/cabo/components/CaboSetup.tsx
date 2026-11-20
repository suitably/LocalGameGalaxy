/**
 * Player names and the start button, using the shared player roster [ID: UI-CABO-SETUP]
 */
import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS } from '../../../lib/storage';
import { PlayerManagerCard, useLobbyPlayers } from '../../../modules/player-management';
import { MAX_PLAYERS, MIN_PLAYERS } from '../logic/engine';
import type { CaboStartOptions } from '../hooks/useCaboGame';

interface CaboSetupProps {
  onStart: (playerNames: string[], options: CaboStartOptions) => void;
}

const RULE_KEYS = ['peek', 'draw', 'powers', 'cabo', 'scoring', 'variants'] as const;

export const CaboSetup: React.FC<CaboSetupProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const [memoryAid, setMemoryAid] = useState(false);
  const { players, addPlayer, removePlayer, hasMinPlayers } = useLobbyPlayers({
    storageKey: STORAGE_KEYS.CABO_LOBBY_PLAYERS,
    defaultPlayers: [
      t('games.cabo.setup.default_player', { n: 1 }),
      t('games.cabo.setup.default_player', { n: 2 }),
    ],
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
  });

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{t('games.cabo.setup.intro')}</Typography>

      <PlayerManagerCard
        players={players}
        onAddPlayer={addPlayer}
        onRemovePlayer={(name, index) => removePlayer(index ?? name)}
        minPlayers={MIN_PLAYERS}
        maxPlayers={MAX_PLAYERS}
        title={t('games.cabo.setup.players')}
      />

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
          <Typography fontWeight={700}>{t('games.cabo.rules.title')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            {RULE_KEYS.map((key) => (
              <Typography key={key} variant="body2">
                {t(`games.cabo.rules.${key}`)}
              </Typography>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <FormControlLabel
        control={<Switch checked={memoryAid} onChange={(e) => setMemoryAid(e.target.checked)} />}
        label={t('games.cabo.setup.memory_aid')}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
        {t('games.cabo.setup.memory_aid_hint')}
      </Typography>

      <Button
        variant="contained"
        size="large"
        disabled={!hasMinPlayers}
        onClick={() =>
          onStart(
            players.map((p) => p.name),
            { memoryAid },
          )
        }
      >
        {t('games.cabo.setup.start')}
      </Button>
    </Stack>
  );
};
