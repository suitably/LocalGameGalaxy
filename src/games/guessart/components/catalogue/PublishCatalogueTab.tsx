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
import InfoOutlinedIcon from '@mui/icons-material/InfoRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { calculateCatalogueDiff, publishCatalogueToGit } from '../../logic/catalogueManager';
import type { CategoryItem, WordItem } from '../../logic/types';
import { hasGitHubPAT } from '../../../../lib/github';
import { settingsPath } from '../../../../features/settings/settingsRoutes';

interface PublishCatalogueTabProps {
  categories: CategoryItem[];
  words: WordItem[];
  onClose?: () => void;
}

export const PublishCatalogueTab: React.FC<PublishCatalogueTabProps> = ({
  categories,
  words,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userNote, setUserNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    prUrl?: string;
    prNumber?: number;
    branch?: string;
    updated?: boolean;
    error?: string;
  } | null>(null);

  const diff = useMemo(() => calculateCatalogueDiff(categories, words), [categories, words]);

  const handlePublish = async () => {
    if (!hasGitHubPAT()) {
      onClose?.();
      navigate(settingsPath({ kind: 'app', section: 'integrations', highlight: 'pat' }));
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await publishCatalogueToGit({
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
        updated: res.updated,
      });
    } catch (err: unknown) {
      console.error('Publishing failed', err);
      setResult({
        success: false,
        error: err instanceof Error ? err.message : t('guessart.publishFailed'),
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
            {t('guessart.publishTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('guessart.publishDesc')}
          </Typography>
        </Box>

        {/* Change summary card */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {t('guessart.diffSummaryTitle')}
            </Typography>

            {diff.totalChanges === 0 ? (
              <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 1 }}>
                {t('guessart.noDiffNotice')}
              </Alert>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  • <strong>{t('guessart.catalogueCategories')}:</strong>{' '}
                  {diff.addedCategories.length} {t('common.added')},{' '}
                  {diff.modifiedCategories.length} {t('common.modified')},{' '}
                  {diff.deletedCategories.length} {t('common.deleted')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  • <strong>{t('guessart.catalogueWords')}:</strong> {diff.addedWords.length}{' '}
                  {t('common.added')}, {diff.modifiedWords.length} {t('common.modified')},{' '}
                  {diff.deletedWords.length} {t('common.deleted')}
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
          label={t('guessart.prUserNoteLabel')}
          placeholder={t('guessart.prUserNotePlaceholder')}
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
              {result.updated ? t('guessart.prUpdatedSuccess') : t('guessart.prCreatedSuccess')} #
              {result.prNumber}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('guessart.prBranchInfo')}: <code>{result.branch}</code>
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
                {t('guessart.openPrOnGithub')}
              </Button>
            )}
          </Alert>
        )}

        {result?.error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              {t('guessart.prFailedTitle')}
            </Typography>
            <Typography variant="body2">{result.error}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('guessart.githubErrorHint')}
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
            {t('guessart.submitPrButton')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
