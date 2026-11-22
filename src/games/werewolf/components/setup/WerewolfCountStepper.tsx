/**
 * Number of werewolves, with the role info button [ID: GAME-WEREWOLF-COUNT-STEPPER]
 */
import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/InfoRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import RemoveIcon from '@mui/icons-material/RemoveRounded';
import { useTranslation } from 'react-i18next';
import type { RoleDefinition } from '../../logic/types';
import { DEFAULT_ROLES } from '../../logic/defaultRoles';
import { RoleIcon } from '../RoleIcon';

interface Props {
  value: number;
  playerCount: number;
  onChange: (update: (prev: number) => number) => void;
  onShowInfo: (role: RoleDefinition | null) => void;
}

export const WerewolfCountStepper: React.FC<Props> = ({
  value,
  playerCount,
  onChange,
  onShowInfo,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
      <Typography
        variant="body1"
        sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <RoleIcon icon="WEREWOLF" fontSize="1.25rem" /> {t('games.werewolf.ui.num_werewolves')}:
        <IconButton
          size="small"
          aria-label={t('games.werewolf.ui.role_info')}
          onClick={() => onShowInfo(DEFAULT_ROLES.find((r) => r.id === 'WEREWOLF') || null)}
          sx={{ ml: 0.5, p: 0.5, color: 'text.secondary', opacity: 0.5 }}
        >
          <InfoIcon fontSize="inherit" />
        </IconButton>
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <IconButton
          size="small"
          aria-label={t('common.a11y.decrease')}
          onClick={() => onChange((prev) => Math.max(1, prev - 1))}
          disabled={value <= 1}
        >
          <RemoveIcon />
        </IconButton>
        <Typography
          sx={{
            mx: 2,
            minWidth: '1.5rem',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
        <IconButton
          size="small"
          aria-label={t('common.a11y.increase')}
          onClick={() => onChange((prev) => prev + 1)}
          disabled={value >= playerCount - 1 && playerCount > 0}
        >
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
