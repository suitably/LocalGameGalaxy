/**
 * Create a draw pot: `games/drawpot/new` [ID: DRAWPOT-CREATE]
 */
import React from 'react';
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { GameLayout } from '../../components/Layout/GameLayout';
import { useCreatePotForm } from './hooks/useCreatePotForm';
import { EntriesField } from './components/EntriesField';
import { PotSettingsFields } from './components/PotSettingsFields';

export const DrawPotCreate: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('drawpot.create.title'));
  const form = useCreatePotForm();
  const showProblem = form.touched && form.problem;

  return (
    <GameLayout maxWidth="sm">
      <Stack
        spacing={2.5}
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void form.submit();
        }}
      >
        <TextField
          label={t('drawpot.create.name')}
          placeholder={t('drawpot.create.namePlaceholder')}
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          error={showProblem === 'title'}
          slotProps={{ htmlInput: { maxLength: 80 } }}
          required
          fullWidth
        />
        <TextField
          label={t('drawpot.create.description')}
          placeholder={t('drawpot.create.descriptionPlaceholder')}
          value={form.description}
          onChange={(e) => form.setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 300 } }}
          multiline
          minRows={2}
          fullWidth
        />
        <PotSettingsFields form={form} />
        <EntriesField form={form} />
        {showProblem && (
          <Alert severity="warning">{t(`drawpot.create.problem.${form.problem}`)}</Alert>
        )}
        {form.submitError && (
          <Alert severity="error">
            {t(`drawpot.errors.${form.submitError}`, { defaultValue: t('drawpot.errors.network') })}
          </Alert>
        )}
        <Button
          type="submit"
          size="large"
          variant="contained"
          disabled={form.submitting}
          startIcon={form.submitting ? <CircularProgress size={20} color="inherit" /> : undefined}
          sx={{ py: 1.5, fontWeight: 800, borderRadius: 3 }}
        >
          {t('drawpot.create.submit')}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t('drawpot.create.privacy')}
        </Typography>
      </Stack>
    </GameLayout>
  );
};
