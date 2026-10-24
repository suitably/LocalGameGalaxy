import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useTranslation } from 'react-i18next';
import { getCategoryName, getWordDisplay } from '../logic/catalogueManager';
import type { GuessArtRound, SelectWordPayload } from '../logic/types';
import { ManualWordForm } from './ManualWordForm';
import { useWordSelector } from './useWordSelector';

interface WordSelectorProps {
  currentRound?: GuessArtRound | null;
  onSelectWord: (payload: SelectWordPayload) => Promise<void>;
  onOpenCatalogue?: () => void;
  manualModeDefault?: boolean;
}

export const WordSelector: React.FC<WordSelectorProps> = ({
  currentRound: _currentRound,
  onSelectWord,
  onOpenCatalogue,
  manualModeDefault = false,
}) => {
  const { t } = useTranslation();
  const sel = useWordSelector(onSelectWord, manualModeDefault);
  const { language, isManualMode, selectedCategory, submitting } = sel;

  return (
    <Stack spacing={2.5} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h6" fontWeight={700}>
          {isManualMode
            ? t('guessart.manualWordTitle', 'Eigenes Wort eingeben')
            : selectedCategory
              ? t('guessart.pickWordTitle', 'Wähle ein Wort zum Zeichnen')
              : t('guessart.pickCategoryTitle', 'Wähle eine Kategorie')}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {onOpenCatalogue && !isManualMode && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<MenuBookRoundedIcon />}
              onClick={onOpenCatalogue}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('guessart.catalogueButton', 'Wortkatalog')}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditRoundedIcon />}
            onClick={sel.toggleManualMode}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {isManualMode
              ? t('guessart.useCatalog', 'Katalog nutzen')
              : t('guessart.customWord', 'Eigenes Wort')}
          </Button>
        </Box>
      </Box>

      {sel.feedback && (
        <Alert severity="error" onClose={() => sel.setFeedback(null)}>
          {sel.feedback}
        </Alert>
      )}

      {isManualMode ? (
        <ManualWordForm
          word={sel.manualWord}
          synonyms={sel.manualSynonyms}
          submitting={submitting}
          onWordChange={sel.setManualWord}
          onSynonymsChange={sel.setManualSynonyms}
          onSubmit={sel.submitManualWord}
        />
      ) : sel.loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : !selectedCategory ? (
        <Stack spacing={1.5}>
          {sel.categories.map((category) => (
            <Card key={category.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea
                onClick={() => sel.selectCategory(category)}
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 2,
                }}
              >
                <CategoryRoundedIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  {getCategoryName(category, language)}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Button
            size="small"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => sel.setSelectedCategory(null)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('guessart.backToCategories', 'Zurück zu den Kategorien')}
          </Button>

          <Stack spacing={1.5}>
            {sel.words.map((word) => (
              <Card key={word.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardActionArea
                  onClick={() => sel.pickWord(word)}
                  disabled={submitting}
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {getWordDisplay(word, language)}
                  </Typography>
                  <Chip
                    label={
                      word.difficulty === 1
                        ? t('guessart.difficultyEasy', 'Leicht')
                        : word.difficulty === 2
                          ? t('guessart.difficultyMedium', 'Mittel')
                          : t('guessart.difficultyHard', 'Schwer')
                    }
                    size="small"
                    color={
                      word.difficulty === 1
                        ? 'success'
                        : word.difficulty === 2
                          ? 'warning'
                          : 'error'
                    }
                  />
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};
