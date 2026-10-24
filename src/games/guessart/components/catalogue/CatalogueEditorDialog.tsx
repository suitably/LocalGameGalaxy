import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { useTranslation } from 'react-i18next';
import { CategoryEditorTab } from './CategoryEditorTab';
import { WordEditorTab } from './WordEditorTab';
import { PublishCatalogueTab } from './PublishCatalogueTab';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { CatalogueEditorTabs } from './CatalogueEditorTabs';
import { useCatalogueEditor } from './useCatalogueEditor';

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
  const editor = useCatalogueEditor(open, onCatalogueUpdated);
  const { categories, words, loading, tabIndex } = editor;

  return (
    <>
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
                {t(
                  'guessart.catalogueEditorSubtitle',
                  'Kategorien & Wörter lokal anpassen oder per GitHub PR veröffentlichen',
                )}
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
                onClick={() => editor.setConfirmResetOpen(true)}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: { xs: 'auto', sm: 'auto' },
                }}
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

        <CatalogueEditorTabs
          value={tabIndex}
          categoryCount={categories.length}
          wordCount={words.length}
          onChange={editor.setTabIndex}
        />

        <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : tabIndex === 0 ? (
            <CategoryEditorTab
              categories={categories}
              words={words}
              onChange={editor.handleCategoriesChange}
            />
          ) : tabIndex === 1 ? (
            <WordEditorTab
              categories={categories}
              words={words}
              onChange={editor.handleWordsChange}
            />
          ) : (
            <PublishCatalogueTab categories={categories} words={words} onClose={onClose} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={editor.confirmResetOpen}
        title={t('guessart.resetToDefaults', 'Auf Standard zurücksetzen')}
        message={t(
          'guessart.confirmResetCatalogue',
          'Wirklich auf den Standard-Katalog zurücksetzen? Eigene Änderungen gehen verloren.',
        )}
        confirmColor="error"
        onConfirm={editor.handleConfirmReset}
        onCancel={() => editor.setConfirmResetOpen(false)}
      />
    </>
  );
};
