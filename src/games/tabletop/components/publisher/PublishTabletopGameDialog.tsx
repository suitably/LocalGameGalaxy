import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TabletopGameDefinition } from '../../logic/types';
import { validateGameForPublishing, buildPublishPrPayload } from '../../logic/publishValidator';
import { hasGitHubPAT, resolveGitHubConfig, createGitHubPR } from '../../../../lib/github';
import { PublishFormFields } from './PublishFormFields';

interface PublishTabletopGameDialogProps {
  open: boolean;
  game: TabletopGameDefinition | null;
  onClose: () => void;
}

export const PublishTabletopGameDialog: React.FC<PublishTabletopGameDialogProps> = ({
  open,
  game,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [authorName, setAuthorName] = useState(game?.author || '');
  const [notes, setNotes] = useState('');
  const [licenseAgreed, setLicenseAgreed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdPrUrl, setCreatedPrUrl] = useState<string | null>(null);

  const hasPat = hasGitHubPAT();
  const validation = game ? validateGameForPublishing(game) : { valid: false, errors: [] };

  const handlePublish = async () => {
    if (!game || !validation.valid || !licenseAgreed || !authorName.trim()) return;

    setErrorMsg(null);
    setPublishing(true);

    try {
      const { config } = resolveGitHubConfig();
      if (!config) {
        throw new Error('Kein GitHub Personal Access Token konfiguriert. Bitte hinterlege einen Token in den Einstellungen.');
      }

      const payload = buildPublishPrPayload(game, authorName.trim(), notes.trim());
      const res = await createGitHubPR(config, payload);

      if (!res.success || !res.prUrl) {
        throw new Error(res.error || 'Fehler beim Erstellen des Pull Requests.');
      }

      setCreatedPrUrl(res.prUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('games.tabletop.publish_dialog_title', 'Spiel als Pull Request einreichen')}</DialogTitle>
      <DialogContent dividers>
        {createdPrUrl ? (
          <Box textAlign="center" py={3}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 1.5 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>
              {t('games.tabletop.publish_success_title', 'Pull Request erfolgreich erstellt!')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('games.tabletop.publish_success_desc', 'Dein Spiel wurde als Branch eingereicht und steht nach dem Review allen Nutzern in der offiziellen Bibliothek zur Verfügung.')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              endIcon={<LaunchIcon />}
              component={Link}
              href={createdPrUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('games.tabletop.view_pr', 'Pull Request auf GitHub ansehen')}
            </Button>
          </Box>
        ) : (
          <Box>
            {!hasPat && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => navigate('/settings?tab=general&sub=feedback')}>
                    Einstellungen
                  </Button>
                }
              >
                Du benötigst einen GitHub Personal Access Token (PAT), um direkt aus der App einen PR zu erstellen.
              </Alert>
            )}

            {!validation.valid && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Vorbedingungen nicht erfüllt:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validation.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <PublishFormFields
              authorName={authorName}
              onAuthorChange={setAuthorName}
              notes={notes}
              onNotesChange={setNotes}
              licenseAgreed={licenseAgreed}
              onLicenseChange={setLicenseAgreed}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {createdPrUrl ? t('common.close', 'Schließen') : t('common.cancel', 'Abbrechen')}
        </Button>
        {!createdPrUrl && (
          <Button
            variant="contained"
            color="primary"
            onClick={handlePublish}
            disabled={publishing || !hasPat || !validation.valid || !licenseAgreed || !authorName.trim()}
            startIcon={publishing ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {publishing ? 'Sende PR...' : 'Pull Request erstellen'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
