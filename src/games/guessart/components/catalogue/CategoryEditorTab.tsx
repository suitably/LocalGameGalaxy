import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { useTranslation } from 'react-i18next';
import type { CategoryItem, WordItem } from '../../logic/types';

interface CategoryEditorTabProps {
  categories: CategoryItem[];
  words: WordItem[];
  onChange: (categories: CategoryItem[], words: WordItem[]) => void;
}

export const CategoryEditorTab: React.FC<CategoryEditorTabProps> = ({
  categories,
  words,
  onChange,
}) => {
  const { t } = useTranslation();
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const [formId, setFormId] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameDe, setFormNameDe] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setIsNew(true);
    setEditingCategory(null);
    setFormId(`cat_${Date.now().toString(36)}`);
    setFormNameEn('');
    setFormNameDe('');
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setIsNew(false);
    setEditingCategory(cat);
    setFormId(String(cat.id));
    const enName = cat.translations?.find((tr) => tr.languageCode === 'en')?.name || cat.name || '';
    const deName = cat.translations?.find((tr) => tr.languageCode === 'de')?.name || cat.name || '';
    setFormNameEn(enName);
    setFormNameDe(deName);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSaveModal = () => {
    const trimmedId = formId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const trimmedEn = formNameEn.trim();
    const trimmedDe = formNameDe.trim();

    if (!trimmedId) {
      setFeedback(t('guessart.catIdRequired', 'Kategorie-ID ist erforderlich.'));
      return;
    }
    if (!trimmedEn || !trimmedDe) {
      setFeedback(t('guessart.catNamesRequired', 'Namen in Deutsch und Englisch sind erforderlich.'));
      return;
    }

    if (isNew && categories.some((c) => String(c.id).toLowerCase() === trimmedId)) {
      setFeedback(t('guessart.catIdExists', 'Diese Kategorie-ID existiert bereits!'));
      return;
    }

    const updatedCat: CategoryItem = {
      id: trimmedId,
      name: trimmedEn,
      translations: [
        { languageCode: 'en', name: trimmedEn },
        { languageCode: 'de', name: trimmedDe },
      ],
    };

    let newCategories: CategoryItem[];
    let newWords = [...words];

    if (isNew) {
      newCategories = [...categories, updatedCat];
    } else {
      const oldId = String(editingCategory?.id);
      newCategories = categories.map((c) => (String(c.id) === oldId ? updatedCat : c));
      if (oldId !== trimmedId) {
        newWords = words.map((w) =>
          String(w.categoryId) === oldId ? { ...w, categoryId: trimmedId } : w,
        );
      }
    }

    onChange(newCategories, newWords);
    setModalOpen(false);
  };

  const handleDeleteCategory = (catId: string | number) => {
    const stringId = String(catId);
    const wordsInCat = words.filter((w) => String(w.categoryId) === stringId);
    const confirmMsg = wordsInCat.length > 0
      ? t('guessart.confirmDeleteCategoryWithWords', {
          count: wordsInCat.length,
          defaultValue: `Kategorie löschen? ${wordsInCat.length} enthaltene Wörter werden ebenfalls gelöscht.`,
        })
      : t('guessart.confirmDeleteCategory', 'Kategorie wirklich löschen?');

    if (!window.confirm(confirmMsg)) return;

    const newCategories = categories.filter((c) => String(c.id) !== stringId);
    const newWords = words.filter((w) => String(w.categoryId) !== stringId);
    onChange(newCategories, newWords);
  };

  return (
    <Box sx={{ py: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
          {t('guessart.categoriesListTitle', 'Verfügbare Kategorien')} ({categories.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenAdd}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('guessart.addCategory', 'Kategorie hinzufügen')}
        </Button>
      </Box>

      <Stack spacing={1.5}>
        {categories.map((cat) => {
          const enName = cat.translations?.find((tr) => tr.languageCode === 'en')?.name || cat.name;
          const deName = cat.translations?.find((tr) => tr.languageCode === 'de')?.name || cat.name;
          const wordsCount = words.filter((w) => String(w.categoryId) === String(cat.id)).length;

          return (
            <Card key={cat.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <CategoryRoundedIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {deName} / {enName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: <code style={{ fontSize: '0.8rem' }}>{cat.id}</code> • {wordsCount} {t('guessart.wordsLabel', 'Wörter')}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={0.5}>
                    <Tooltip title={t('common.edit', 'Bearbeiten')}>
                      <IconButton size="small" onClick={() => handleOpenEdit(cat)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete', 'Löschen')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={categories.length <= 1}
                      >
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

      {/* Edit / Add Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isNew
            ? t('guessart.addCategoryTitle', 'Neue Kategorie')
            : t('guessart.editCategoryTitle', 'Kategorie bearbeiten')}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback && <Alert severity="warning">{feedback}</Alert>}

            <TextField
              size="small"
              fullWidth
              label={t('guessart.categoryIdLabel', 'Kategorie-ID (intern)')}
              placeholder="z.B. cat_fantasy"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              helperText="Eindeutiger Bezeichner (Kleinbuchstaben & Unterstriche)"
            />

            <TextField
              size="small"
              fullWidth
              label={t('guessart.categoryNameDe', 'Name (Deutsch)')}
              placeholder="z.B. Fabelwesen"
              value={formNameDe}
              onChange={(e) => setFormNameDe(e.target.value)}
            />

            <TextField
              size="small"
              fullWidth
              label={t('guessart.categoryNameEn', 'Name (Englisch)')}
              placeholder="e.g. Mythical Creatures"
              value={formNameEn}
              onChange={(e) => setFormNameEn(e.target.value)}
            />
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
