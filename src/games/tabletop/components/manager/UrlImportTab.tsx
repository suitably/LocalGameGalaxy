import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from 'react-i18next';
import type { TabletopGameDefinition } from '../../logic/types';

interface UrlImportTabProps {
  onImportFromUrl: (url: string) => Promise<TabletopGameDefinition>;
}

export const UrlImportTab: React.FC<UrlImportTabProps> = ({ onImportFromUrl }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  const handleImport = async (targetUrl?: string) => {
    const importUrl = (targetUrl || url).trim();
    if (!importUrl) return;

    setLoading(true);
    setError(null);
    setSuccessName(null);
    try {
      const def = await onImportFromUrl(importUrl);
      setSuccessName(def.name);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (presetUrl: string) => {
    setUrl(presetUrl);
    handleImport(presetUrl);
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary">
        {t(
          'games.tabletop.url_import_helper',
          'Direkte URL zu einer Tabletop JSON oder PlayingCards.io .pcio-Datei eingeben.',
        )}
      </Typography>

      <Box display="flex" gap={1.5} alignItems="flex-start" flexWrap="wrap">
        <TextField
          fullWidth
          size="small"
          label={t('games.tabletop.url_import_label', 'Web-URL zu .pcio oder .json')}
          placeholder={t('games.tabletop.url_import_placeholder', 'https://.../spiel.json oder .pcio')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          slotProps={{
            input: {
              startAdornment: <LinkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
          onClick={() => handleImport()}
          disabled={loading || !url.trim()}
          sx={{ minWidth: 200, mt: 0.5 }}
        >
          {t('games.tabletop.url_import_action', 'Herunterladen & Installieren')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successName && (
        <Alert severity="success" onClose={() => setSuccessName(null)}>
          {t('games.tabletop.url_import_success', '"{{name}}" erfolgreich installiert!', { name: successName })}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          {t('games.tabletop.url_examples', 'Beispiel-Vorlagen aus dem Web:')}
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          <Chip
            size="small"
            clickable
            label="🃏 Standard Kartendeck (JSON)"
            onClick={() => handlePreset('/games/tabletop/standard-cards.json')}
          />
          <Chip
            size="small"
            clickable
            label="🎲 Liar's Dice (JSON)"
            onClick={() => handlePreset('/games/tabletop/liars-dice.json')}
          />
          <Chip
            size="small"
            clickable
            label="🏁 Checkers (JSON)"
            onClick={() => handlePreset('/games/tabletop/checkers.json')}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {t(
            'games.tabletop.community_sources',
            'PlayingCards.io Raum exportieren oder Web-Links einfügen.',
          )}
        </Typography>
      </Paper>
    </Stack>
  );
};
