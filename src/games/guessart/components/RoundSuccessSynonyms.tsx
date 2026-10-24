import React, { useEffect, useState } from 'react';
import { Alert, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { useTranslation } from 'react-i18next';
import { addSynonymToWord } from '../logic/catalogueManager';
import { SynonymLanguageToggle } from './SynonymLanguageToggle';

interface RoundSuccessSynonymsProps {
  open: boolean;
  word: string;
  language: string;
  incorrectGuesses: string[];
}

/** Lets the players store wrong guesses as synonyms of the solved word. */
export const RoundSuccessSynonyms: React.FC<RoundSuccessSynonymsProps> = ({
  open,
  word,
  language,
  incorrectGuesses,
}) => {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>(language);
  const [addedSynonyms, setAddedSynonyms] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLang(language);
    setAddedSynonyms(new Set());
    setFeedback(null);
  }, [open, language, word]);

  const handleAddSynonym = async (guess: string) => {
    try {
      const res = await addSynonymToWord(word, guess, selectedLang);
      if (res.success) {
        setAddedSynonyms((prev) => new Set([...prev, guess]));
        setFeedback(
          t('guessart.synonymAddedSuccess', {
            synonym: guess,
            defaultValue: `"${guess}" wurde als Synonym hinzugefügt!`,
          }),
        );
      }
    } catch (e) {
      console.warn('Failed to add synonym', e);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        p: 1.5,
        bgcolor: 'background.default',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'left',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          {t('guessart.addAsSynonymPrompt', 'Eingaben als Synonym übernehmen:')}
        </Typography>
        <SynonymLanguageToggle value={selectedLang} onChange={setSelectedLang} />
      </Box>

      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
        {incorrectGuesses.map((guess) => {
          const isAdded = addedSynonyms.has(guess);
          return (
            <Tooltip
              key={guess}
              title={
                isAdded
                  ? t('guessart.synonymAddedTooltip', 'Bereits hinzugefügt')
                  : t('guessart.addSynonymTooltip', 'Als Synonym zum Wort speichern')
              }
            >
              <Chip
                label={guess}
                size="small"
                color={isAdded ? 'success' : 'default'}
                variant={isAdded ? 'filled' : 'outlined'}
                icon={
                  isAdded ? (
                    <DoneRoundedIcon fontSize="small" />
                  ) : (
                    <AddRoundedIcon fontSize="small" />
                  )
                }
                onClick={() => !isAdded && handleAddSynonym(guess)}
                clickable={!isAdded}
                sx={{ fontWeight: 600, fontSize: '0.8rem' }}
              />
            </Tooltip>
          );
        })}
      </Stack>

      {feedback && (
        <Alert severity="success" sx={{ mt: 1, py: 0.2, fontSize: '0.75rem' }}>
          {feedback}
        </Alert>
      )}
    </Box>
  );
};
