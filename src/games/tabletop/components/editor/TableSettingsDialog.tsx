/**
 * Table size and background [ID: COMP-TABLETOP-TABLE-SETTINGS]
 */
import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopTableConfig } from '../../logic/types';
import { ImageUploadButton } from './ImageUploadButton';

interface TableSettingsDialogProps {
  open: boolean;
  table: TabletopTableConfig;
  onChange: (changes: Partial<TabletopTableConfig>) => void;
  onClose: () => void;
}

export const TableSettingsDialog: React.FC<TableSettingsDialogProps> = ({
  open,
  table,
  onChange,
  onClose,
}) => {
  const { t } = useTranslation();
  const size = (key: 'width' | 'height') => (
    <TextField
      size="small"
      type="number"
      label={t(`games.tabletop.editor.table_${key}`)}
      value={table[key]}
      onChange={(e) => {
        const n = Math.round(Number(e.target.value));
        if (n >= 100 && n <= 10000) onChange({ [key]: n });
      }}
      inputProps={{ min: 100, max: 10000 }}
      sx={{ flex: 1 }}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('games.tabletop.editor.table')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1}>
            {size('width')}
            {size('height')}
          </Stack>
          <TextField
            size="small"
            type="color"
            label={t('games.tabletop.editor.background_color')}
            value={table.backgroundColor || '#1e3d2f'}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
          />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TextField
              size="small"
              fullWidth
              label={t('games.tabletop.editor.background_image')}
              value={table.backgroundImageUrl || ''}
              onChange={(e) => onChange({ backgroundImageUrl: e.target.value || undefined })}
            />
            <ImageUploadButton onImage={(url) => onChange({ backgroundImageUrl: url })} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('games.tabletop.editor.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
