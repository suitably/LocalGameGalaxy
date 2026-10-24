import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PlaylistNameDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

/** Single text-field dialog used to create or rename a playlist. */
export const PlaylistNameDialog: React.FC<PlaylistNameDialogProps> = ({
  open,
  title,
  confirmLabel,
  name,
  onNameChange,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t('melodiq.playlist_name')}
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === 'Enter') onConfirm();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={onConfirm} variant="contained" disabled={!name.trim()}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
