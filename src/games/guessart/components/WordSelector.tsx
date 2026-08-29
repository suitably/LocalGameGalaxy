import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useTranslation } from 'react-i18next';
import {
  getCategoryName,
  getWordDisplay,
  listCategories,
  listWordsForCategory,
} from '../logic/catalogueManager';
import type { CategoryItem, GuessArtRound, SelectWordPayload, WordItem } from '../logic/types';

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
  const { t, i18n } = useTranslation();
  const language = i18n.language.startsWith('de') ? 'de' : 'en';

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Manual word mode state
  const [isManualMode, setIsManualMode] = useState<boolean>(manualModeDefault);
  const [manualWord, setManualWord] = useState<string>('');
  const [manualSynonyms, setManualSynonyms] = useState<string>('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const cats = await listCategories(language);
        if (active) setCategories(cats);
      } catch (e) {
        console.error('Failed to load categories', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [language]);

  const handleCategorySelect = async (category: CategoryItem) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const items = await listWordsForCategory(category.id, language);
      setWords(items);
    } catch (e) {
      console.error('Failed to load words', e);
    } finally {
      setLoading(false);
    }
  };

  const handleWordPick = async (word: WordItem) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const displayWord = getWordDisplay(word, language);
      await onSelectWord({
        word: displayWord,
        wordId: word.id,
        categoryId: word.categoryId,
        difficulty: word.difficulty || 2,
        translations: word.translations,
      });
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('guessart.genericError', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    const trimmed = manualWord.trim();
    if (!trimmed) {
      setFeedback(t('guessart.manualWordRequired', 'Bitte gib ein Wort ein!'));
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const synonyms = manualSynonyms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await onSelectWord({
        word: trimmed,
        languageCode: language,
        difficulty: 3,
        translations: {
          [language]: {
            canonical: trimmed,
            synonyms,
          },
        },
      });
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('guessart.genericError', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
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
            onClick={() => {
              setIsManualMode(!isManualMode);
              setSelectedCategory(null);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {isManualMode ? t('guessart.useCatalog', 'Katalog nutzen') : t('guessart.customWord', 'Eigenes Wort')}
          </Button>
        </Box>
      </Box>

      {feedback && (
        <Alert severity="error" onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      {isManualMode ? (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('guessart.manualWordLabel', 'Zu zeichnendes Wort')}
            value={manualWord}
            onChange={(e) => setManualWord(e.target.value)}
            fullWidth
            required
            autoFocus
          />
          <TextField
            label={t('guessart.manualSynonymsLabel', 'Synonyme / Alternative Schreibweisen (kommagetrennt)')}
            value={manualSynonyms}
            onChange={(e) => setManualSynonyms(e.target.value)}
            fullWidth
            placeholder="z.B. Rad, Drahtesel"
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleManualSubmit}
            disabled={submitting}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : t('guessart.startDrawing', 'Zeichnen starten')}
          </Button>
        </Stack>
      ) : loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : !selectedCategory ? (
        <Stack spacing={1.5}>
          {categories.map((category) => (
            <Card key={category.id} sx={{ borderRadius: 2 }}>
              <CardActionArea
                onClick={() => handleCategorySelect(category)}
                sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 2 }}
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
            onClick={() => setSelectedCategory(null)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('guessart.backToCategories', 'Zurück zu den Kategorien')}
          </Button>

          <Stack spacing={1.5}>
            {words.map((word) => (
              <Card key={word.id} sx={{ borderRadius: 2 }}>
                <CardActionArea
                  onClick={() => handleWordPick(word)}
                  disabled={submitting}
                  sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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
                    color={word.difficulty === 1 ? 'success' : word.difficulty === 2 ? 'warning' : 'error'}
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
