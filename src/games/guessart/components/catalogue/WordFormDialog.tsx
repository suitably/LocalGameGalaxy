import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
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
                value={form.categoryId}
                label={t('guessart.categoryFilter', 'Kategorie')}
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
              <InputLabel>{t('guessart.difficulty', 'Schwierigkeit')}</InputLabel>
              <Select
                value={form.difficulty}
                label={t('guessart.difficulty', 'Schwierigkeit')}
                onChange={(e) => set({ difficulty: Number(e.target.value) })}
              >
                <MenuItem value={1}>{t('guessart.diffEasy', '1 - Leicht')}</MenuItem>
                <MenuItem value={2}>{t('guessart.diffMedium', '2 - Mittel')}</MenuItem>
                <MenuItem value={3}>{t('guessart.diffHard', '3 - Schwer')}</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box sx={sectionSx}>
            <LanguageHeading code="DE" label={t('guessart.germanWordSettings', 'Deutsch')} />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.canonicalWordDe', 'Hauptbegriff')}
              placeholder={t('guessart.wordExampleDe', 'z.B. Hund')}
              value={form.deCanonical}
              onChange={(e) => set({ deCanonical: e.target.value })}
              sx={{ mb: 1.5 }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.synonymsDe', 'Synonyme (kommagetrennt)')}
              placeholder={t('guessart.synonymsExampleDe', 'z.B. Welpe, Vierbeiner, Köter')}
              value={form.deSynonyms}
              onChange={(e) => set({ deSynonyms: e.target.value })}
              helperText={t(
                'guessart.synonymsOptionalHint',
                'Optionale alternative richtige Antworten',
              )}
            />
          </Box>

          <Box sx={sectionSx}>
            <LanguageHeading code="EN" label={t('guessart.englishWordSettings', 'Englisch')} />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.canonicalWordEn', 'Hauptbegriff')}
              placeholder={t('guessart.wordExampleEn', 'e.g. Dog')}
              value={form.enCanonical}
              onChange={(e) => set({ enCanonical: e.target.value })}
              sx={{ mb: 1.5 }}
            />
            <TextField
              size="small"
              fullWidth
              label={t('guessart.synonymsEn', 'Synonyme (kommagetrennt)')}
              placeholder={t('guessart.synonymsExampleEn', 'e.g. Puppy, Hound, Canine')}
              value={form.enSynonyms}
              onChange={(e) => set({ enSynonyms: e.target.value })}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel', 'Abbrechen')}
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          color="primary"
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('common.save', 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
