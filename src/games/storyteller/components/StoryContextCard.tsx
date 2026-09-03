import React from 'react';
import { Box, Card, CardContent, Typography, Chip, Stack } from '@mui/material';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import { useTranslation } from 'react-i18next';
import type { StoryContextView } from '../types';

interface StoryContextCardProps {
  contextView: StoryContextView;
  totalEntriesCount: number;
}

export const StoryContextCard: React.FC<StoryContextCardProps> = ({
  contextView,
  totalEntriesCount,
}) => {
  const { t } = useTranslation();

  if (totalEntriesCount === 0) {
    return (
      <Card
        variant="outlined"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AutoStoriesRoundedIcon sx={{ color: '#38bdf8', fontSize: 28 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#f8fafc' }}>
                {t('storyteller.prologueTitle', 'Kapitel 1: Der Anfang')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                {t(
                  'storyteller.prologueHint',
                  'Du machst den ersten Schritt! Schreibe den Eröffnungssatz oder die Einleitung für eure gemeinsame Geschichte.',
                )}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: contextView.isBlind ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.6)',
        borderColor: contextView.isBlind ? 'rgba(244, 63, 94, 0.3)' : 'rgba(56, 189, 248, 0.25)',
        borderRadius: 2,
        maxHeight: { xs: 180, sm: 220 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent
        sx={{
          p: 2,
          '&:last-child': { pb: 2 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flexGrow: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {contextView.isBlind ? (
              <VisibilityOffRoundedIcon sx={{ color: '#f43f5e', fontSize: 20 }} />
            ) : (
              <HistoryEduRoundedIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
            )}
            <Typography variant="caption" fontWeight={700} sx={{ color: '#cbd5e1' }}>
              {contextView.isBlind
                ? t('storyteller.blindModeTitle', 'Blind-Modus (letzter Abschnitt)')
                : t('storyteller.fullStoryContext', 'Bisherige Geschichte')}
            </Typography>
          </Stack>

          {contextView.precedingAuthorName && (
            <Chip
              size="small"
              label={`${t('storyteller.by', 'von')} ${contextView.precedingAuthorName}`}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            pr: 0.5,
            whiteSpace: 'pre-wrap',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            color: '#e2e8f0',
            fontSize: { xs: '0.9rem', sm: '0.95rem' },
            lineHeight: 1.6,
          }}
        >
          {contextView.text}
        </Box>
      </CardContent>
    </Card>
  );
};
