import React from 'react';
import { Avatar, Box, Card, CardContent, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from '../../../modules/drawing';
import type { GarticGameState } from '../types';

type AlbumStep = GarticGameState['books'][number]['steps'][number];

interface AlbumStepCardProps {
  step: AlbumStep;
  isInitial: boolean;
}

export const AlbumStepCard: React.FC<AlbumStepCardProps> = ({ step, isInitial }) => {
  const { t } = useTranslation();

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, borderColor: isInitial ? 'primary.main' : 'divider' }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <Avatar sx={{ width: 28, height: 28, fontSize: '0.85rem', bgcolor: 'primary.main' }}>
            {step.authorName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle2" fontWeight={800}>
            {step.authorName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {step.type === 'prompt'
              ? isInitial
                ? `• ${t('guessart.originalPrompt', 'Original-Satz')}`
                : `• ${t('guessart.guess', 'Tipp')}`
              : `• ${t('guessart.drawing', 'Zeichnung')}`}
          </Typography>
        </Box>

        {step.type === 'prompt' ? (
          <Paper
            variant="outlined"
            sx={{ p: 2, bgcolor: isInitial ? 'action.selected' : 'action.hover', borderRadius: 2 }}
          >
            <Typography
              variant="body1"
              fontWeight={700}
              color={isInitial ? 'primary.main' : 'text.primary'}
            >
              "{step.content}"
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <ExcalidrawViewer data={step.content} animate={false} height={320} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
