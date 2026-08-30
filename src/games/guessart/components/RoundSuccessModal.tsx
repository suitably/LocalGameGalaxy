import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { useTranslation } from 'react-i18next';
import { addSynonymToWord } from '../logic/catalogueManager';

interface RoundSuccessModalProps {
  open: boolean;
  word: string;
  roundNumber: number;
  guessesCount: number;
  guesses?: string[];
  drawerName?: string;
  guesserName?: string;
  language?: string;
  onNextRound: () => void;
}

export const RoundSuccessModal: React.FC<RoundSuccessModalProps> = ({
  open,
  word,
  roundNumber,
  guessesCount,
  guesses = [],
  drawerName,
  guesserName,
  language = 'de',
  onNextRound,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedLang, setSelectedLang] = useState<string>(language);
  const [addedSynonyms, setAddedSynonyms] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLang(language);
    setAddedSynonyms(new Set());
    setFeedback(null);
  }, [open, language, word]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const incorrectGuesses = guesses.filter(
    (g) => g.trim().toLowerCase() !== word.trim().toLowerCase(),
  );

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

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      style={{
        margin: 'auto',
        border: 'none',
        borderRadius: '16px',
        padding: 0,
        backgroundColor: 'transparent',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        maxWidth: '440px',
        width: '90%',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <CheckCircleRoundedIcon color="success" sx={{ fontSize: { xs: 48, sm: 60 } }} />
        <Typography variant="h5" fontWeight={800}>
          {t('guessart.correctCelebration', 'Richtig erraten!')}
        </Typography>

        {drawerName && guesserName && (
          <Chip
            label={`${drawerName} vs. ${guesserName}`}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontWeight: 700 }}
          />
        )}

        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, width: '100%' }}>
          <Typography variant="body2" color="text.secondary">
            {t('guessart.searchedWord', 'Gesuchtes Wort:')}
          </Typography>
          <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
            {word}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {t('guessart.roundStats', {
            round: roundNumber,
            guesses: guessesCount,
            defaultValue: `Runde ${roundNumber} mit ${guessesCount} Versuchen gelöst!`,
          })}
        </Typography>

        {/* Synonym Addition Section if there were wrong guesses */}
        {incorrectGuesses.length > 0 && (
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
              <Box display="flex" gap={0.5}>
                <IconButton
                  size="small"
                  onClick={() => setSelectedLang('de')}
                  sx={{
                    p: 0.3,
                    border: selectedLang === 'de' ? '2px solid' : '1px solid transparent',
                    borderColor: 'primary.main',
                    fontSize: '0.85rem',
                  }}
                >
                  🇩🇪
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setSelectedLang('en')}
                  sx={{
                    p: 0.3,
                    border: selectedLang === 'en' ? '2px solid' : '1px solid transparent',
                    borderColor: 'primary.main',
                    fontSize: '0.85rem',
                  }}
                >
                  🇬🇧
                </IconButton>
              </Box>
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
                      icon={isAdded ? <DoneRoundedIcon fontSize="small" /> : <AddRoundedIcon fontSize="small" />}
                      onClick={() => !isAdded && handleAddSynonym(guess)}
                      clickable={!isAdded}
                      sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                    />
                  </Tooltip>
                );
              })}
            </Stack>

            {feedback && (
              <Alert severity="success" sx={{ mt: 1, py: 0.2, fontSize: '0.78rem' }}>
                {feedback}
              </Alert>
            )}
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={onNextRound}
          sx={{ mt: 1, py: 1.5, fontWeight: 700 }}
        >
          {t('guessart.nextRound', 'Nächste Runde')}
        </Button>
      </Box>
    </dialog>
  );
};
