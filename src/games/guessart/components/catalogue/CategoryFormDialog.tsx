import React from 'react';
import { Alert, Dialog, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FormDialogActions } from './FormDialogActions';

export interface CategoryFormValues {
  id: string;
  nameEn: string;
  nameDe: string;
}

interface CategoryFormDialogProps {
  open: boolean;
  isNew: boolean;
  form: CategoryFormValues;
  feedback: string | null;
  onChange: (form: CategoryFormValues) => void;
  onClose: () => void;
  onSave: () => void;
}

export const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  isNew,
  form,
  feedback,
  onChange,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const set = (patch: Partial<CategoryFormValues>) => onChange({ ...form, ...patch });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isNew ? t('guessart.addCategoryTitle') : t('guessart.editCategoryTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {feedback && <Alert severity="warning">{feedback}</Alert>}

          <TextField
            size="small"
            fullWidth
            label={t('guessart.categoryIdLabel')}
            placeholder={t('guessart.categoryIdExample')}
            value={form.id}
            onChange={(e) => set({ id: e.target.value })}
            helperText={t('guessart.categoryIdHint')}
          />

          <TextField
            size="small"
            fullWidth
            label={t('guessart.categoryNameDe')}
            placeholder={t('guessart.categoryNameExampleDe')}
            value={form.nameDe}
            onChange={(e) => set({ nameDe: e.target.value })}
          />

          <TextField
            size="small"
            fullWidth
            label={t('guessart.categoryNameEn')}
            placeholder={t('guessart.categoryNameExampleEn')}
            value={form.nameEn}
            onChange={(e) => set({ nameEn: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <FormDialogActions onClose={onClose} onSave={onSave} />
    </Dialog>
  );
};
