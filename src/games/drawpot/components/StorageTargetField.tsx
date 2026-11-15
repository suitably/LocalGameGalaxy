/**
 * Where a new pot is stored: Nexumia cloud or the user's own Nexumia server
 * [ID: DRAWPOT-STORAGE-TARGET]
 *
 * Only shown when a companion server is set up on this device.
 */
import React from 'react';
import { Alert, Card, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import { useTranslation } from 'react-i18next';
import type { CreatePotForm } from '../hooks/useCreatePotForm';
import { isPublicServerUrl } from '../logic/api';

export const StorageTargetField: React.FC<{ form: CreatePotForm }> = ({ form }) => {
  const { t } = useTranslation();
  if (!form.companionUrl) return null;
  const companion = form.target === 'companion';
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>
          {t('drawpot.storage.label')}
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={form.target}
          onChange={(_, v) => v && form.setTarget(v)}
          aria-label={t('drawpot.storage.label')}
        >
          <ToggleButton value="cloud" sx={{ gap: 1 }}>
            <CloudRoundedIcon fontSize="small" />
            {t('drawpot.storage.cloud')}
          </ToggleButton>
          <ToggleButton value="companion" sx={{ gap: 1 }}>
            <DnsRoundedIcon fontSize="small" />
            {t('drawpot.storage.companion')}
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {companion
            ? t('drawpot.storage.companionHint', { url: form.companionUrl })
            : t('drawpot.storage.cloudHint')}
        </Typography>
        {companion && !isPublicServerUrl(form.companionUrl) && (
          <Alert severity="warning">{t('drawpot.storage.notPublic')}</Alert>
        )}
      </Stack>
    </Card>
  );
};
