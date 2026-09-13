import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { useTranslation } from 'react-i18next';
import { fetchManifest, type CatalogManifestItem } from '../../logic/gameInstaller';
import type { TabletopGameSummary } from '../../logic/types';

interface TemplatesCatalogTabProps {
  installedGames: TabletopGameSummary[];
  onInstallTemplate: (filePath: string) => Promise<unknown>;
}

export const TemplatesCatalogTab: React.FC<TemplatesCatalogTabProps> = ({
  installedGames,
  onInstallTemplate,
}) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<CatalogManifestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const installedSet = useMemo(() => new Set(installedGames.map((g) => g.id)), [installedGames]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchManifest()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInstall = async (item: CatalogManifestItem) => {
    setInstallingId(item.id);
    setError(null);
    try {
      await onInstallTemplate(item.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstallingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.author.toLowerCase().includes(q),
    );
  }, [templates, search]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <TextField
        fullWidth
        size="small"
        placeholder={t('games.tabletop.catalog_search', 'Vorlagen durchsuchen...')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          {t('games.tabletop.catalog_empty', 'Keine Vorlagen gefunden.')}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {filtered.map((item) => {
            const isInstalled = installedSet.has(item.id);
            const isBusy = installingId === item.id;

            return (
              <Card key={item.id} variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={0.5}>
                    <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">v{item.version}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {item.description}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.8}>
                    <Chip
                      size="small"
                      label={`${item.minPlayers}${item.maxPlayers > item.minPlayers ? `-${item.maxPlayers}` : ''} Spieler`}
                      variant="outlined"
                    />
                    {item.supportedModes.includes('party_multi_device') && (
                      <Chip size="small" icon={<GroupsIcon />} label="Party" variant="outlined" />
                    )}
                    {item.supportedModes.includes('local_pass_and_play') && (
                      <Chip size="small" icon={<PhoneIphoneIcon />} label="Lokal" variant="outlined" />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 1.5, pt: 0, justifyContent: 'flex-end' }}>
                  {isInstalled ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<DownloadDoneIcon />}
                      disabled
                    >
                      {t('games.tabletop.already_installed', 'Bereits installiert')}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : <AddCircleOutlineIcon />}
                      onClick={() => handleInstall(item)}
                      disabled={isBusy}
                    >
                      {t('games.tabletop.install', 'Installieren')}
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
