import React from 'react';
import { Button, CircularProgress, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ManualWordFormProps {
  word: string;
  synonyms: string;
  submitting: boolean;
  onWordChange: (value: string) => void;
  onSynonymsChange: (value: string) => void;
  onSubmit: () => void;
}

export const ManualWordForm: React.FC<ManualWordFormProps> = ({
  word,
  synonyms,
  submitting,
  onWordChange,
  onSynonymsChange,
  onSubmit,
}) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label={t('guessart.manualWordLabel', 'Zu zeichnendes Wort')}
        value={word}
        onChange={(e) => onWordChange(e.target.value)}
        fullWidth
        required
        autoFocus
      />
      <TextField
        label={t(
          'guessart.manualSynonymsLabel',
          'Synonyme / Alternative Schreibweisen (kommagetrennt)',
        )}
        value={synonyms}
        onChange={(e) => onSynonymsChange(e.target.value)}
        fullWidth
        placeholder={t('guessart.manualSynonymsExample', 'z.B. Rad, Drahtesel')}
      />
      <Button
        variant="contained"
        size="large"
        onClick={onSubmit}
        disabled={submitting}
        sx={{ py: 1.5, fontWeight: 700 }}
      >
        {submitting ? (
          <CircularProgress size={22} color="inherit" />
        ) : (
          t('guessart.startDrawing', 'Zeichnen starten')
        )}
      </Button>
    </Stack>
  );
};
