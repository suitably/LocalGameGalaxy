import React, { useState } from 'react';
import { Box, Button, Paper, TextField } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from '../../guessart/components/ExcalidrawViewer';

interface GarticGuessingStepProps {
  canvasData: string;
  authorName: string;
  onSubmitGuess: (guessText: string) => void;
}

const MAX_GUESS_LENGTH = 70;

export const GarticGuessingStep: React.FC<GarticGuessingStepProps> = ({
  canvasData,
  onSubmitGuess,
}) => {
  const { t } = useTranslation();
  const [guess, setGuess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    onSubmitGuess(guess.trim().slice(0, MAX_GUESS_LENGTH));
  };

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
      {/* Viewer Box: Takes maximum available space without extra header */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2.5,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <ExcalidrawViewer data={canvasData} animate={false} />
        </Box>
      </Box>

      {/* Input Form */}
      <Paper
        elevation={2}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mt: 0.8,
          p: 1.2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2.5,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder={t('guessart.describeDrawingPlaceholder', 'Was stellt die Zeichnung dar? Beschreibe sie...')}
          value={guess}
          onChange={(e) => setGuess(e.target.value.slice(0, MAX_GUESS_LENGTH))}
          variant="outlined"
          inputProps={{ maxLength: MAX_GUESS_LENGTH }}
          helperText={`${guess.length}/${MAX_GUESS_LENGTH}`}
          FormHelperTextProps={{ sx: { textAlign: 'right', fontWeight: 600, m: 0 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!guess.trim()}
          startIcon={<SendRoundedIcon />}
          sx={{ px: 2.5, fontWeight: 700, borderRadius: 2, height: 40, whiteSpace: 'nowrap' }}
        >
          {t('common.send', 'Senden')}
        </Button>
      </Paper>
    </Box>
  );
};
