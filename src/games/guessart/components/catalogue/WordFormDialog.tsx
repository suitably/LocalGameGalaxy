import React from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import { useTranslation } from 'react-i18next';
import { FormDialogActions } from './FormDialogActions';
import type { CategoryItem } from '../../logic/types';
import type { WordFormValues } from '../../logic/wordEditing';

interface WordFormDialogProps {
  open: boolean;
  isNew: boolean;
  categories: CategoryItem[];
  form: WordFormValues;
  feedback: string | null;
  onChange: (form: WordFormValues) => void;
  onClose: () => void;
  onSave: () => void;
}

const LanguageHeading: React.FC<{ code: string; label: string }> = ({ code, label }) => (
  <Typography
    variant="subtitle2"
    fontWeight={800}
    gutterBottom
    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
  >
    <LanguageRoundedIcon fontSize="small" color="action" />
    {code} · {label}
  </Typography>
);

const sectionSx = { p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 };

export const WordFormDialog: React.FC<WordFormDialogProps> = ({
  open,
  isNew,
  categories,
  form,
  feedback,
  onChange,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const set = (patch: Partial<WordFormValues>) => onChange({ ...form, ...patch });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isNew ? t('guessart.addWordTitle') : t('guessart.editWordTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {feedback && <Alert severity="warning">{feedback}</Alert>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('guessart.categoryFilter')}</InputLabel>
              <Select
                value={form.categoryId}
                label={t('guessart.categoryFilter')}
                onChange={(e) => set({ categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.translations?.find((tr) => tr.languageCode === 'de')?.name || c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>{t('guessart.difficulty')}</InputLabel>
              <Select
                value={form.difficulty}
                label={t('guessart.difficulty')}
                onChange={(e) => set({ difficulty: Number(e.target.value) })}
              >
                <MenuItem value={1}>{t('guessart.diffEasy')}</MenuItem>
                <MenuItem value={2}>{t('guessart.diffMedium')}</MenuItem>
                <MenuItem value={3}>{t('guessart.diffHard')}</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box sx={sectionSx}>
            <LanguageHeading code="DE" label={t('guessart.germanWordSettings')} />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.canonicalWordDe')}
              placeholder={t('guessart.wordExampleDe')}
              value={form.deCanonical}
              onChange={(e) => set({ deCanonical: e.target.value })}
              sx={{ mb: 1.5 }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.synonymsDe')}
              placeholder={t('guessart.synonymsExampleDe')}
              value={form.deSynonyms}
              onChange={(e) => set({ deSynonyms: e.target.value })}
              helperText={t('guessart.synonymsOptionalHint')}
            />
          </Box>

          <Box sx={sectionSx}>
            <LanguageHeading code="EN" label={t('guessart.englishWordSettings')} />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.canonicalWordEn')}
              placeholder={t('guessart.wordExampleEn')}
              value={form.enCanonical}
              onChange={(e) => set({ enCanonical: e.target.value })}
              sx={{ mb: 1.5 }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.synonymsEn')}
              placeholder={t('guessart.synonymsExampleEn')}
              value={form.enSynonyms}
              onChange={(e) => set({ enSynonyms: e.target.value })}
            />
          </Box>
        </Stack>
      </DialogContent>
      <FormDialogActions onClose={onClose} onSave={onSave} />
    </Dialog>
  );
};
