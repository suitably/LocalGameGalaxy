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

const PROMPT_SUGGESTIONS = [
  'Ein Roboter der Pfannkuchen backt',
  'Katze mit Sonnenbrille auf einem Skateboard',
  'Astronaut reitet ein Lama auf dem Mond',
  'Dinosaurier trinkt gemütlich Kaffee',
  'Pinguin fliegt mit bunten Luftballons',
  'Schneemann am heißen Strand in Hawaii',
  'Superheld verliert seinen Umhang im Sturm',
];

export const GarticPromptStep: React.FC<GarticPromptStepProps> = ({
  playerName,
  onSubmitPrompt,
}) => {
  const { t } = useTranslation();
  const [promptText, setPromptText] = useState('');

  const handleRandom = () => {
    const random = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
    setPromptText(random);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    onSubmitPrompt(promptText.trim().slice(0, MAX_PROMPT_LENGTH));
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={4}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 4,
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
            {playerName ? `${playerName}: ` : ''}{t('guessart.writeStartingPrompt', 'Schreibe einen geheimen Satz!')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('guessart.promptStepHint', 'Dein Satz wird an den nächsten Spieler weitergegeben, der ihn zeichnen muss!')}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder={t('guessart.promptPlaceholder', 'z.B. Ein Pinguin der Fallschirm springt...')}
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
            sx={{ borderRadius: 2.5 }}
          >
            {t('guessart.randomPrompt', 'Zufällige Idee')}
          </Button>

          <Button
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            disabled={!promptText.trim()}
            endIcon={<SendRoundedIcon />}
            sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
          >
            {t('common.submit', 'Absenden')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
