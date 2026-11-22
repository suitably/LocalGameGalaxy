import React, { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import { useTranslation } from 'react-i18next';

interface GarticPromptStepProps {
  playerName: string;
  onSubmitPrompt: (prompt: string) => void;
}

const MAX_PROMPT_LENGTH = 70;

export const GarticPromptStep: React.FC<GarticPromptStepProps> = ({
  playerName,
  onSubmitPrompt,
}) => {
  const { t } = useTranslation();
  const [promptText, setPromptText] = useState('');

  const handleRandom = () => {
    const suggestions = t('guessart.promptSuggestions', { returnObjects: true }) as unknown;
    if (!Array.isArray(suggestions) || suggestions.length === 0) return;
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    if (typeof random === 'string') setPromptText(random);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    onSubmitPrompt(promptText.trim().slice(0, MAX_PROMPT_LENGTH));
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2.5,
          textAlign: 'center',
        }}
      >
        <EditNoteRoundedIcon color="primary" sx={{ fontSize: 56 }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {playerName ? `${playerName}: ` : ''}
            {t('guessart.writeStartingPrompt')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('guessart.promptStepHint')}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder={t('guessart.promptPlaceholder')}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
          variant="outlined"
          inputProps={{ maxLength: MAX_PROMPT_LENGTH }}
          helperText={`${promptText.length}/${MAX_PROMPT_LENGTH}`}
          FormHelperTextProps={{ sx: { textAlign: 'right', fontWeight: 600 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />

        <Box display="flex" justifyContent="space-between" width="100%" gap={1.5}>
          <Button
            variant="outlined"
            startIcon={<CasinoRoundedIcon />}
            onClick={handleRandom}
            sx={{ borderRadius: 3 }}
          >
            {t('guessart.randomPrompt')}
          </Button>

          <Button
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            disabled={!promptText.trim()}
            endIcon={<SendRoundedIcon />}
            sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
          >
            {t('common.submit')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
