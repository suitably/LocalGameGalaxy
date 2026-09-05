import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AbcRoundedIcon from '@mui/icons-material/AbcRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useTranslation } from 'react-i18next';
import { CategoryEditorTab } from './CategoryEditorTab';
import { WordEditorTab } from './WordEditorTab';
import { PublishCatalogueTab } from './PublishCatalogueTab';
import {
  getMasterCatalogue,
  resetMasterCatalogue,
  saveMasterCatalogue,
} from '../../logic/catalogueManager';
import type { CategoryItem, WordItem } from '../../logic/types';

interface CatalogueEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onCatalogueUpdated?: () => void;
}

export const CatalogueEditorDialog: React.FC<CatalogueEditorDialogProps> = ({
  open,
  onClose,
  onCatalogueUpdated,
}) => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [words, setWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const master = await getMasterCatalogue();
      setCategories(master.categories);
      setWords(master.words);
    } catch (err) {
      console.error('Failed to load master catalogue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleCategoriesChange = async (newCats: CategoryItem[], newWords: WordItem[]) => {
    setCategories(newCats);
    setWords(newWords);
    await saveMasterCatalogue(newCats, newWords);
    onCatalogueUpdated?.();
  };

  const handleWordsChange = async (newWords: WordItem[]) => {
    setWords(newWords);
    await saveMasterCatalogue(categories, newWords);
    onCatalogueUpdated?.();
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        t(
          'guessart.confirmResetCatalogue',
          'Wirklich auf den Standard-Katalog zurücksetzen? Eigene Änderungen gehen verloren.',
        ),
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const restored = await resetMasterCatalogue();
      setCategories(restored.categories);
      setWords(restored.words);
      onCatalogueUpdated?.();
    } catch (err) {
      console.error('Failed to reset catalogue', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <MenuBookRoundedIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {t('guessart.catalogueEditorTitle', 'Wortkatalog-Editor')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('guessart.catalogueEditorSubtitle', 'Kategorien & Wörter lokal anpassen oder per GitHub PR veröffentlichen')}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={t('guessart.resetToDefaults', 'Auf Standard zurücksetzen')}>
            <Button
              size="small"
              color="error"
              variant="text"
              startIcon={<RestartAltRoundedIcon />}
              onClick={handleReset}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 600, minWidth: { xs: 'auto', sm: 'auto' } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {t('guessart.resetToDefaults', 'Auf Standard zurücksetzen')}
              </Box>
            </Button>
          </Tooltip>

          <IconButton onClick={onClose} size="small" aria-label={t('common.close', 'Schließen')}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: { xs: 0.5, sm: 2 } }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minWidth: { xs: 48, sm: 120 },
              px: { xs: 1, sm: 2 },
              py: 0.8,
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '0.78rem', sm: '0.875rem' },
            },
          }}
        >
          <Tab
            icon={<CategoryRoundedIcon fontSize="small" />}
            iconPosition="start"
            label={
              <Box component="span" display="flex" alignItems="center" gap={0.5}>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('guessart.catalogueCategories', 'Kategorien')}
                </Box>
                <Box component="span">({categories.length})</Box>
              </Box>
            }
          />
          <Tab
            icon={<AbcRoundedIcon fontSize="small" />}
            iconPosition="start"
            label={
              <Box component="span" display="flex" alignItems="center" gap={0.5}>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('guessart.catalogueWords', 'Wörter')}
                </Box>
                <Box component="span">({words.length})</Box>
              </Box>
            }
          />
          <Tab
            icon={<GitHubIcon fontSize="small" />}
            iconPosition="start"
            label={
              <Box component="span">
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  {t('guessart.publishPrTab', 'Veröffentlichen (Git PR)')}
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  PR
                </Box>
              </Box>
            }
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : tabIndex === 0 ? (
          <CategoryEditorTab
            categories={categories}
            words={words}
            onChange={handleCategoriesChange}
          />
        ) : tabIndex === 1 ? (
          <WordEditorTab
            categories={categories}
            words={words}
            onChange={handleWordsChange}
          />
        ) : (
          <PublishCatalogueTab
            categories={categories}
            words={words}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
