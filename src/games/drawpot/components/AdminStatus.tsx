/**
 * Host view: progress and draw log [ID: DRAWPOT-ADMIN-STATUS]
 */
import React from 'react';
import {
  Box,
  Card,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useTranslation } from 'react-i18next';
import type { DrawPotAdminView } from '../logic/api';

interface AdminStatusProps {
  pot: DrawPotAdminView;
  busy: boolean;
  onRefresh: () => void;
}

export const AdminStatus: React.FC<AdminStatusProps> = ({ pot, busy, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const fmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' });
  const santa = pot.settings.mode === 'secret-santa';
  const nameOf = (id?: string) => pot.entries.find((e) => e.id === id)?.label ?? '?';

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          {t('drawpot.admin.status')}
        </Typography>
        <IconButton
          size="small"
          onClick={onRefresh}
          disabled={busy}
          aria-label={t('drawpot.admin.refresh')}
        >
          <RefreshRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
        {pot.closed && (
          <Chip
            size="small"
            color="warning"
            icon={<LockRoundedIcon />}
            label={t('drawpot.admin.closed')}
          />
        )}
        <Chip size="small" label={t('drawpot.admin.drawCount', { count: pot.drawCount })} />
        <Chip
          size="small"
          label={t('drawpot.admin.participantCount', { count: pot.participantCount })}
        />
        {pot.settings.removeDrawn && (
          <Chip
            size="small"
            label={t('drawpot.admin.remaining', {
              count: pot.remainingCount,
              total: pot.totalEntries,
            })}
          />
        )}
        <Chip
          size="small"
          variant="outlined"
          label={t('drawpot.admin.expires', { date: fmt.format(pot.expiresAt) })}
        />
      </Stack>
      {!pot.settings.hostSeesResults && (
        <Typography variant="body2" color="text.secondary">
          {t('drawpot.admin.resultsHidden')}
        </Typography>
      )}
      {pot.draws.length > 0 && (
        <List dense disablePadding>
          {[...pot.draws].reverse().map((d) => (
            <ListItem key={`${d.at}-${d.participantId}`} disableGutters divider>
              <ListItemText
                primary={
                  santa
                    ? `${nameOf(d.identityId)} → ${d.label ?? '•••'}`
                    : (d.label ?? t('drawpot.admin.hiddenDraw'))
                }
                secondary={`${fmt.format(d.at)} · ${t('drawpot.admin.device', { id: d.participantId.slice(-4) })}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Card>
  );
};
