import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useTranslation } from 'react-i18next';
import { DrawingCanvas } from '../../guessart/components/DrawingCanvas';

interface GarticDrawingStepProps {
  promptText: string;
  authorName: string;
  onSubmitDrawing: (canvasData: string) => void;
}

export const GarticDrawingStep: React.FC<GarticDrawingStepProps> = ({
  promptText,
  authorName,
  onSubmitDrawing,
}) => {
  const { t } = useTranslation();

  // Dynamic font scaling for long prompts so they are always 100% visible
  const fontSize =
    promptText.length > 50
      ? '0.78rem'
      : promptText.length > 30
        ? '0.88rem'
        : '0.98rem';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Second Header: Styled matching GuessArt's Secret Word Banner with responsive prompt scaling */}
      <Paper
        elevation={1}
        sx={{
          px: { xs: 1.2, sm: 2 },
          py: 0.6,
          mb: 1,
          borderRadius: 2.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0.8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}
      >
        <Box display="flex" alignItems="center" gap={0.8} sx={{ flex: 1, minWidth: 0 }}>
          <BrushRoundedIcon sx={{ fontSize: 18, flexShrink: 0 }} />
          <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0, fontSize: '0.85rem' }}>
            {t('guessart.drawWordPrompt', 'Zeichne:')}
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              bgcolor: 'background.paper',
              color: 'text.primary',
              px: 1,
              py: 0.3,
              borderRadius: 2,
              boxShadow: 1,
              fontWeight: 800,
              fontSize,
              lineHeight: 1.2,
              wordBreak: 'break-word',
              maxWidth: '100%',
            }}
          >
            "{promptText}"
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={0.5} sx={{ opacity: 0.9, flexShrink: 0 }}>
          <LockRoundedIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
            {t('guessart.secretWordOnlyYou', 'Nur für dich')} ({authorName})
          </Typography>
        </Box>
      </Paper>

      {/* Canvas */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <DrawingCanvas currentRound={null} onSubmit={async (data) => onSubmitDrawing(data)} />
      </Box>
    </Box>
  );
};
