/**
 * Stammtisch card in the party lobby [ID: COMP-PARTY-STAMMTISCH-CARD]
 *
 * Saves the room as a Stammtisch (fixed code, everyone can come back), opens it on app start,
 * lets a member take over hosting, and shows a calm waiting state while nobody else is here.
 */
import React, { useState } from 'react';
import { Box, Button, Card, FormControlLabel, Switch, Typography } from '@mui/material';
import TableBarRoundedIcon from '@mui/icons-material/TableBarRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';
import { StammtischNameDialog } from './PartySettingsDialogs';
import { DEFAULT_STAMMTISCH_NAME } from '../logic/stammtisch';

export const PartyStammtischCard: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const s = lobby.stammtisch;
  const [naming, setNaming] = useState<string | null>(null);
  const [forgetting, setForgetting] = useState(false);

  return (
    <Card variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
      <Box display="flex" alignItems="center" gap={1.5} mb={s.isStammtisch ? 1.5 : 0}>
        <TableBarRoundedIcon color="primary" />
        <Box flex={1} minWidth={0}>
          <Typography variant="subtitle1" fontWeight={800} noWrap>
            {s.name ?? t('party.stammtisch.title')}
          </Typography>
          {!s.isStammtisch && (
            <Typography variant="body2" color="text.secondary">
              {t('party.stammtisch.desc')}
            </Typography>
          )}
        </Box>
        {!s.saved && (
          <Button
            variant={s.isStammtisch ? 'contained' : 'outlined'}
            sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
            onClick={() => (s.isStammtisch ? s.save() : setNaming(DEFAULT_STAMMTISCH_NAME))}
          >
            {t(s.isStammtisch ? 'party.stammtisch.saveHere' : 'party.stammtisch.save')}
          </Button>
        )}
      </Box>

      {s.isStammtisch && !s.othersHere && (
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ py: 2 }}>
          {t('party.stammtisch.waiting')}
        </Typography>
      )}

      {s.isStammtisch && (
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          {s.saved && (
            <FormControlLabel
              sx={{ flex: 1, minWidth: 220 }}
              control={
                <Switch checked={s.autoOpen} onChange={(e) => s.setAutoOpen(e.target.checked)} />
              }
              label={
                <Typography variant="body2">
                  {t('party.stammtisch.autoOpen')}
                  <Typography variant="caption" color="text.secondary" component="span" ml={1}>
                    {t('party.stammtisch.autoOpenHint')}
                  </Typography>
                </Typography>
              }
            />
          )}
          {s.canClaimHost && (
            <Button variant="outlined" sx={{ minHeight: 44 }} onClick={s.claimHost}>
              {t('party.stammtisch.claimHost')}
            </Button>
          )}
          {s.saved && (
            <Button color="inherit" sx={{ minHeight: 44 }} onClick={() => setForgetting(true)}>
              {t('party.stammtisch.forget')}
            </Button>
          )}
        </Box>
      )}

      <StammtischNameDialog
        open={naming !== null}
        value={naming ?? ''}
        onChange={setNaming}
        onClose={() => setNaming(null)}
        onSave={() => {
          if (naming?.trim()) s.save(naming);
          setNaming(null);
        }}
      />
      <ConfirmDialog
        open={forgetting}
        title={t('party.stammtisch.forgetTitle')}
        message={t('party.stammtisch.forgetDesc')}
        confirmText={t('party.stammtisch.forget')}
        confirmColor="error"
        onConfirm={() => {
          s.remove();
          setForgetting(false);
        }}
        onCancel={() => setForgetting(false)}
      />
    </Card>
  );
};
