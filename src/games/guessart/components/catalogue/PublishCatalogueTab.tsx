import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import {
  calculateCatalogueDiff,
  publishCatalogueToGit,
} from '../../logic/catalogueManager';
import type { CategoryItem, WordItem } from '../../logic/types';

interface PublishCatalogueTabProps {
  categories: CategoryItem[];
  words: WordItem[];
}

export const PublishCatalogueTab: React.FC<PublishCatalogueTabProps> = ({
  categories,
  words,
}) => {
  const { t } = useTranslation();
  const [userNote, setUserNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    prUrl?: string;
    prNumber?: number;
    branch?: string;
    error?: string;
  } | null>(null);

  const diff = useMemo(() => calculateCatalogueDiff(categories, words), [categories, words]);

  const handlePublish = async () => {
    setSubmitting(true);
    setResult(null);

    const baseUrl = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
    const token = localStorage.getItem('melodiq_helper_token') || '';

    try {
      const res = await publishCatalogueToGit({
        baseUrl,
        token: token || undefined,
        categories,
        words,
        userNote,
        prTitle: userNote.trim()
          ? `[GuessArt] ${userNote.trim().slice(0, 50)}`
          : '[GuessArt] Update Word & Category Catalogue',
      });

      setResult({
        success: true,
        prUrl: res.prUrl,
        prNumber: res.prNumber,
        branch: res.branch,
      });
    } catch (err: unknown) {
      console.error('Publishing failed', err);
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to publish catalogue',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: 1 }}>
      <Stack spacing={2.5}>
        {/* Intro */}
        <Box>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            {t('guessart.publishTitle', 'Änderungen in das Git-Repository übertragen')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'guessart.publishDesc',
              'Erstelle automatisiert einen GitHub Pull Request mit deinen lokalen Kategorien und Wörtern. Der Repository-Admin kann diese anschließend prüfen und freigeben.',
            )}
          </Typography>
        </Box>

        {/* Change summary card */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {t('guessart.diffSummaryTitle', 'Lokale Änderungen gegenüber dem Standard-Katalog')}
            </Typography>

            {diff.totalChanges === 0 ? (
              <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 1 }}>
                {t(
                  'guessart.noDiffNotice',
                  'Keine Unterschiede zum Standard-Katalog festgestellt. Du kannst trotzdem einen PR erstellen oder zuerst neue Wörter hinzufügen.',
                )}
              </Alert>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  • <strong>{t('guessart.catalogueCategories', 'Kategorien')}:</strong>{' '}
                  {diff.addedCategories.length} {t('common.added', 'hinzugefügt')},{' '}
                  {diff.modifiedCategories.length} {t('common.modified', 'geändert')},{' '}
                  {diff.deletedCategories.length} {t('common.deleted', 'gelöscht')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  • <strong>{t('guessart.catalogueWords', 'Wörter')}:</strong>{' '}
                  {diff.addedWords.length} {t('common.added', 'hinzugefügt')},{' '}
                  {diff.modifiedWords.length} {t('common.modified', 'geändert')},{' '}
                  {diff.deletedWords.length} {t('common.deleted', 'gelöscht')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* PR Message input */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label={t('guessart.prUserNoteLabel', 'Beschreibung der Änderungen (optional)')}
          placeholder={t(
            'guessart.prUserNotePlaceholder',
            'z.B. 10 neue Tierarten und Fabelwesen hinzugefügt...',
          )}
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          disabled={submitting}
        />

        {/* Result Alerts */}
        {result?.success && (
          <Alert
            severity="success"
            icon={<CheckCircleOutlineRoundedIcon fontSize="inherit" />}
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={800}>
              {t('guessart.prCreatedSuccess', 'Pull Request erfolgreich erstellt!')} #{result.prNumber}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('guessart.prBranchInfo', 'Branch')}: <code>{result.branch}</code>
            </Typography>
            {result.prUrl && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<OpenInNewRoundedIcon />}
                href={result.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none', fontWeight: 700, mt: 0.5 }}
              >
                {t('guessart.openPrOnGithub', 'Pull Request auf GitHub ansehen')}
              </Button>
            )}
          </Alert>
        )}

        {result?.error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              {t('guessart.prFailedTitle', 'Fehler beim Erstellen des Pull Requests')}
            </Typography>
            <Typography variant="body2">{result.error}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t(
                'guessart.helperServerHint',
                'Stelle sicher, dass der Helper-Server läuft und ein GitHub-Token in den Server-Einstellungen hinterlegt ist.',
              )}
            </Typography>
          </Alert>
        )}

        <Divider />

        {/* Action Button */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <GitHubIcon />}
            onClick={handlePublish}
            disabled={submitting}
            sx={{ textTransform: 'none', fontWeight: 800, px: 3, py: 1.2, borderRadius: 2 }}
          >
            {t('guessart.submitPrButton', 'Pull Request auf GitHub erstellen')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
