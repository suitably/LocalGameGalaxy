import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import type { CategoryItem, WordItem } from '../../logic/types';
import { CategoryFormDialog, type CategoryFormValues } from './CategoryFormDialog';

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
  const [categoryToDelete, setCategoryToDelete] = useState<string | number | null>(null);

  const [form, setForm] = useState<CategoryFormValues>({ id: '', nameEn: '', nameDe: '' });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setIsNew(true);
    setEditingCategory(null);
    setForm({ id: `cat_${Date.now().toString(36)}`, nameEn: '', nameDe: '' });
    setFeedback(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setIsNew(false);
    setEditingCategory(cat);
    setForm({
      id: String(cat.id),
      nameEn: cat.translations?.find((tr) => tr.languageCode === 'en')?.name || cat.name || '',
      nameDe: cat.translations?.find((tr) => tr.languageCode === 'de')?.name || cat.name || '',
    });
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSaveModal = () => {
    const trimmedId = form.id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const trimmedEn = form.nameEn.trim();
    const trimmedDe = form.nameDe.trim();

    if (!trimmedId) {
      setFeedback(t('guessart.catIdRequired', 'Kategorie-ID ist erforderlich.'));
      return;
    }
    if (!trimmedEn || !trimmedDe) {
      setFeedback(
        t('guessart.catNamesRequired', 'Namen in Deutsch und Englisch sind erforderlich.'),
      );
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
    setCategoryToDelete(catId);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete === null) return;
    const stringId = String(categoryToDelete);
    const newCategories = categories.filter((c) => String(c.id) !== stringId);
    const newWords = words.filter((w) => String(w.categoryId) !== stringId);
    onChange(newCategories, newWords);
    setCategoryToDelete(null);
  };

  const wordsInPendingCat =
    categoryToDelete !== null
      ? words.filter((w) => String(w.categoryId) === String(categoryToDelete))
      : [];
  const deleteConfirmMsg =
    wordsInPendingCat.length > 0
      ? t('guessart.confirmDeleteCategoryWithWords', {
          count: wordsInPendingCat.length,
          defaultValue: `Kategorie löschen? ${wordsInPendingCat.length} enthaltene Wörter werden ebenfalls gelöscht.`,
        })
      : t('guessart.confirmDeleteCategory', 'Kategorie wirklich löschen?');

  return (
    <Box sx={{ py: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
          {t('guessart.categoriesListTitle', 'Verfügbare Kategorien')} ({categories.length})
        </Typography>
        <Tooltip title={t('guessart.addCategory', 'Kategorie hinzufügen')}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAdd}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t('guessart.addCategory', 'Kategorie hinzufügen')}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {t('guessart.addCategoryShort', 'Kategorie +')}
            </Box>
          </Button>
        </Tooltip>
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
                        ID: <code style={{ fontSize: '0.8rem' }}>{cat.id}</code> • {wordsCount}{' '}
                        {t('guessart.wordsLabel', 'Wörter')}
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

      <CategoryFormDialog
        open={modalOpen}
        isNew={isNew}
        form={form}
        feedback={feedback}
        onChange={setForm}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
      />

      <ConfirmDialog
        open={categoryToDelete !== null}
        message={deleteConfirmMsg}
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </Box>
  );
};
