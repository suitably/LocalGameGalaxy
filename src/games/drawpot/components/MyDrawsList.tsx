/**
 * This device's draws from one pot, newest first [ID: DRAWPOT-MY-DRAWS]
 */
import React from 'react';
import { Card, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DrawRecord } from '../logic/api';

export const MyDrawsList: React.FC<{ draws: DrawRecord[]; title: string }> = ({ draws, title }) => {
  const { t, i18n } = useTranslation();
  if (draws.length === 0) return null;
  const fmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ px: 2, pt: 1.5 }}>
        {title}
      </Typography>
      <List dense>
        {[...draws].reverse().map((d, i) => (
          <ListItem key={`${d.at}-${d.entryId}`} divider={i < draws.length - 1}>
            <ListItemText
              primary={d.label}
              secondary={t('drawpot.participant.drawnAt', { date: fmt.format(d.at) })}
              slotProps={{ primary: { sx: { fontWeight: 700, fontSize: 18 } } }}
            />
          </ListItem>
        ))}
      </List>
    </Card>
  );
};
