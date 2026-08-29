import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'react-i18next';
import type { CategoryItem, WordItem } from '../../logic/types';

interface WordEditorTabProps {
  categories: CategoryItem[];
  words: WordItem[];
  onChange: (words: WordItem[]) => void;
}

const ITEMS_PER_PAGE = 20;

export const WordEditorTab: React.FC<WordEditorTabProps> = ({
  categories,
  words,
  onChange,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Edit/Add modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);

  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<number>(2);
  const [formDeCanonical, setFormDeCanonical] = useState<string>('');
  const [formDeSynonyms, setFormDeSynonyms] = useState<string>('');
  const [formEnCanonical, setFormEnCanonical] = useState<string>('');
  const [formEnSynonyms, setFormEnSynonyms] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return words.filter((w) => {
      if (selectedCategory !== 'all' && String(w.categoryId) !== selectedCategory) {
        return false;
      }
      if (!query) return true;

      const deWord = w.translations?.de?.canonical?.toLowerCase() || '';
      const deSyn = (w.translations?.de?.synonyms || []).join(' ').toLowerCase();
      const enWord = w.translations?.en?.canonical?.toLowerCase() || w.word?.toLowerCase() || '';
      const enSyn = (w.translations?.en?.synonyms || []).join(' ').toLowerCase();

      return (
        deWord.includes(query) ||
        deSyn.includes(query) ||
        enWord.includes(query) ||
        enSyn.includes(query)
      );
    });
  }, [words, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE) || 1;
  const paginatedWords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, page]);

  const handleOpenAdd = () => {
    setIsNew(true);
    setEditingWord(null);
    setFormCategoryId(selectedCategory !== 'all' ? selectedCategory : String(categories[0]?.id || 'cat_objects'));
    setFormDifficulty(2);
    setFormDeCanonical('');
    setFormDeSynonyms('');
    setFormEnCanonical('');
    setFormEnSynonyms('');
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (word: WordItem) => {
    setIsNew(false);
    setEditingWord(word);
    setFormCategoryId(String(word.categoryId || categories[0]?.id || 'cat_objects'));
    setFormDifficulty(word.difficulty || 2);
    setFormDeCanonical(word.translations?.de?.canonical || '');
    setFormDeSynonyms((word.translations?.de?.synonyms || []).join(', '));
    setFormEnCanonical(word.translations?.en?.canonical || word.word || '');
    setFormEnSynonyms((word.translations?.en?.synonyms || []).join(', '));
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSaveModal = () => {
    const trimmedDeCanonical = formDeCanonical.trim();
    const trimmedEnCanonical = formEnCanonical.trim();

    if (!trimmedDeCanonical || !trimmedEnCanonical) {
      setFeedback(t('guessart.canonicalNamesRequired', 'Hauptbegriff in Deutsch und Englisch erforderlich!'));
      return;
    }

    const parseSynonyms = (str: string) =>
      str
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== trimmedDeCanonical.toLowerCase());

    const deSynonyms = parseSynonyms(formDeSynonyms);
    const enSynonyms = parseSynonyms(formEnSynonyms);

    const wordId = isNew
      ? `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      : editingWord?.id || `w_${Date.now()}`;

    const updatedWord: WordItem = {
      id: wordId,
      categoryId: formCategoryId,
      word: trimmedEnCanonical,
      difficulty: formDifficulty,
      translations: {
        de: {
          canonical: trimmedDeCanonical,
          synonyms: deSynonyms,
        },
        en: {
          canonical: trimmedEnCanonical,
          synonyms: enSynonyms,
        },
      },
    };

    let newWords: WordItem[];
    if (isNew) {
      newWords = [updatedWord, ...words];
    } else {
      newWords = words.map((w) => (w.id === wordId ? updatedWord : w));
    }

    onChange(newWords);
    setModalOpen(false);
  };

  const handleDeleteWord = (wordId: string | number) => {
    if (!window.confirm(t('guessart.confirmDeleteWord', 'Wort wirklich löschen?'))) return;
    onChange(words.filter((w) => w.id !== wordId));
  };

  const getDifficultyColor = (diff: number) => {
    if (diff === 1) return 'success';
    if (diff === 2) return 'primary';
    return 'warning';
  };

  return (
    <Box sx={{ py: 1 }}>
      {/* Controls / Filter Bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 180, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel>{t('guessart.categoryFilter', 'Kategorie')}</InputLabel>
          <Select
            value={selectedCategory}
            label={t('guessart.categoryFilter', 'Kategorie')}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="all">{t('guessart.allCategories', 'Alle Kategorien')}</MenuItem>
            {categories.map((c) => {
              const count = words.filter((w) => String(w.categoryId) === String(c.id)).length;
              return (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.translations?.find((tr) => tr.languageCode === 'de')?.name || c.name} ({count})
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder={t('guessart.searchWordsPlaceholder', 'Wort suchen...')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          fullWidth
          InputProps={{
            startAdornment: <SearchRoundedIcon color="action" sx={{ mr: 1 }} fontSize="small" />,
          }}
        />

        <Button
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenAdd}
          sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' } }}
        >
          {t('guessart.addWord', 'Wort hinzufügen')}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        {filteredWords.length} {t('guessart.matchingWordsFound', 'Wörter gefunden')}
      </Typography>

      {/* Words List */}
      <Stack spacing={1.2}>
        {paginatedWords.map((word) => {
          const de = word.translations?.de?.canonical || '-';
          const deSyn = word.translations?.de?.synonyms || [];
          const en = word.translations?.en?.canonical || word.word || '-';
          const enSyn = word.translations?.en?.synonyms || [];
          const cat = categories.find((c) => String(c.id) === String(word.categoryId));
          const catName = cat?.translations?.find((tr) => tr.languageCode === 'de')?.name || cat?.name || word.categoryId;

          return (
            <Card key={word.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                        🇩🇪 {de}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        / 🇬🇧 {en}
                      </Typography>
                      <Chip
                        label={
                          word.difficulty === 1
                            ? t('guessart.diffEasy', 'Leicht')
                            : word.difficulty === 3
                            ? t('guessart.diffHard', 'Schwer')
                            : t('guessart.diffMedium', 'Mittel')
                        }
                        size="small"
                        color={getDifficultyColor(word.difficulty || 2)}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={catName}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>

                    {(deSyn.length > 0 || enSyn.length > 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {t('guessart.synonymsLabel', 'Synonyme')}:{' '}
                        {[...deSyn, ...enSyn].join(', ')}
                      </Typography>
                    )}
                  </Box>

                  <Box display="flex" gap={0.5}>
                    <Tooltip title={t('common.edit', 'Bearbeiten')}>
                      <IconButton size="small" onClick={() => handleOpenEdit(word)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete', 'Löschen')}>
                      <IconButton size="small" color="error" onClick={() => handleDeleteWord(word.id)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
            size="small"
          />
        </Box>
      )}

      {/* Edit / Add Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isNew
            ? t('guessart.addWordTitle', 'Neues Wort hinzufügen')
            : t('guessart.editWordTitle', 'Wort bearbeiten')}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback && <Alert severity="warning">{feedback}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>{t('guessart.categoryFilter', 'Kategorie')}</InputLabel>
                <Select
                  value={formCategoryId}
                  label={t('guessart.categoryFilter', 'Kategorie')}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.translations?.find((tr) => tr.languageCode === 'de')?.name || c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>{t('guessart.difficulty', 'Schwierigkeit')}</InputLabel>
                <Select
                  value={formDifficulty}
                  label={t('guessart.difficulty', 'Schwierigkeit')}
                  onChange={(e) => setFormDifficulty(Number(e.target.value))}
                >
                  <MenuItem value={1}>{t('guessart.diffEasy', '1 - Leicht')}</MenuItem>
                  <MenuItem value={2}>{t('guessart.diffMedium', '2 - Mittel')}</MenuItem>
                  <MenuItem value={3}>{t('guessart.diffHard', '3 - Schwer')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* German Inputs */}
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                🇩🇪 {t('guessart.germanWordSettings', 'Deutsch')}
              </Typography>
              <TextField
                size="small"
                fullWidth
                label={t('guessart.canonicalWordDe', 'Hauptbegriff')}
                placeholder="z.B. Hund"
                value={formDeCanonical}
                onChange={(e) => setFormDeCanonical(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                size="small"
                fullWidth
                label={t('guessart.synonymsDe', 'Synonyme (kommagetrennt)')}
                placeholder="z.B. Welpe, Vierbeiner, Köter"
                value={formDeSynonyms}
                onChange={(e) => setFormDeSynonyms(e.target.value)}
                helperText="Optionale alternative richtige Antworten"
              />
            </Box>

            {/* English Inputs */}
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                🇬🇧 {t('guessart.englishWordSettings', 'Englisch')}
              </Typography>
              <TextField
                size="small"
                fullWidth
                label={t('guessart.canonicalWordEn', 'Hauptbegriff')}
                placeholder="e.g. Dog"
                value={formEnCanonical}
                onChange={(e) => setFormEnCanonical(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                size="small"
                fullWidth
                label={t('guessart.synonymsEn', 'Synonyme (kommagetrennt)')}
                placeholder="e.g. Puppy, Hound, Canine"
                value={formEnSynonyms}
                onChange={(e) => setFormEnSynonyms(e.target.value)}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">
            {t('common.cancel', 'Abbrechen')}
          </Button>
          <Button
            onClick={handleSaveModal}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('common.save', 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
