/**
 * Name and target of a new table save, with the unique-name check [ID: COMP-TABLETOP-SAVE-FORM]
 */
import React from 'react';
import { Box, Button, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SaveNameCheck } from '../../logic/saveNames';
import type { SaveTarget } from '../../hooks/useTableSaves';

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  target: SaveTarget;
  onTargetChange: (target: SaveTarget) => void;
  /** Server target selectable (connected and `allowTabletopSaves`). */
  serverAllowed: boolean;
  /** Why the server cannot be chosen; null hides the hint. */
  serverHint: string | null;
  check: SaveNameCheck;
}

export const SaveStateForm: React.FC<Props> = ({
  name,
  onNameChange,
  target,
  onTargetChange,
  serverAllowed,
  serverHint,
  check,
}) => {
  const { t } = useTranslation();
  const helper =
    check.kind === 'taken'
      ? t('games.tabletop.saves.nameTaken')
      : check.kind === 'own'
        ? t('games.tabletop.saves.overwriteHint')
        : ' ';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        fullWidth
        value={target}
        onChange={(_, value: SaveTarget | null) => value && onTargetChange(value)}
      >
        <ToggleButton value="local">{t('games.tabletop.saves.targetLocal')}</ToggleButton>
        <ToggleButton value="server" disabled={!serverAllowed}>
          {t('games.tabletop.saves.targetServer')}
        </ToggleButton>
      </ToggleButtonGroup>
      {serverHint && (
        <Typography variant="caption" color="text.secondary">
          {serverHint}
        </Typography>
      )}
      <TextField
        autoFocus
        fullWidth
        label={t('games.tabletop.saves.nameLabel')}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        error={check.kind === 'taken'}
        helperText={helper}
        inputProps={{ maxLength: 120 }}
      />
      {(check.kind === 'taken' || check.kind === 'own') && (
        <Button
          size="small"
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => onNameChange(check.suggestion)}
        >
          {t('games.tabletop.saves.useSuggestion', { name: check.suggestion })}
        </Button>
      )}
    </Box>
  );
};
