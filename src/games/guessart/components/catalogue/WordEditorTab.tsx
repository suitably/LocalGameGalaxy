import React from 'react';
import {
  Box,
  Button,
  FormControl,
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import type { CategoryItem, WordItem } from '../../logic/types';
import { useWordEditorState } from './useWordEditorState';
import { WordFormDialog } from './WordFormDialog';
import { WordListItem } from './WordListItem';

interface WordEditorTabProps {
  categories: CategoryItem[];
  words: WordItem[];
  onChange: (words: WordItem[]) => void;
}

export const WordEditorTab: React.FC<WordEditorTabProps> = ({ categories, words, onChange }) => {
  const { t } = useTranslation();
  const s = useWordEditorState(categories, words, onChange);

  return (
    <Box sx={{ py: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 180, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel>{t('guessart.categoryFilter', 'Kategorie')}</InputLabel>
          <Select
            value={s.selectedCategory}
            label={t('guessart.categoryFilter', 'Kategorie')}
            onChange={(e) => s.changeCategory(e.target.value)}
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
          value={s.searchQuery}
          onChange={(e) => s.changeSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: <SearchRoundedIcon color="action" sx={{ mr: 1 }} fontSize="small" />,
          }}
        />

        <Tooltip title={t('guessart.addWord', 'Wort hinzufügen')}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={s.openAdd}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { xs: 'auto', sm: 'auto' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t('guessart.addWord', 'Wort hinzufügen')}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {t('guessart.addWordShort', 'Wort +')}
            </Box>
          </Button>
        </Tooltip>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        {s.filteredWords.length} {t('guessart.matchingWordsFound', 'Wörter gefunden')}
      </Typography>

      <Stack spacing={1.2}>
        {s.paginatedWords.map((word) => (
          <WordListItem
            key={word.id}
            word={word}
            categories={categories}
            onEdit={s.openEdit}
            onDelete={s.setWordToDelete}
          />
        ))}
      </Stack>

      {s.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={s.totalPages}
            page={s.page}
            onChange={(_, val) => s.setPage(val)}
            color="primary"
            size="small"
          />
        </Box>
      )}

      <WordFormDialog
        open={s.modalOpen}
        isNew={s.isNew}
        categories={categories}
        form={s.form}
        feedback={s.feedback}
        onChange={s.setForm}
        onClose={s.closeModal}
        onSave={s.handleSave}
      />

      <ConfirmDialog
        open={s.wordToDelete !== null}
        message={t('guessart.confirmDeleteWord', 'Wort wirklich löschen?')}
        confirmColor="error"
        onConfirm={s.handleConfirmDelete}
        onCancel={() => s.setWordToDelete(null)}
      />
    </Box>
  );
};
