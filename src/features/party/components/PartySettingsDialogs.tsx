import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface EditPlayerNameDialogProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export const EditPlayerNameDialog: React.FC<EditPlayerNameDialogProps> = ({
  open,
  onClose,
  value,
  onChange,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('party.editNameTitle', 'Deinen Namen ändern')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('party.editNameDesc', 'Passe deinen Spielernamen für die Party-Lobby und alle Minispiele an.')}
        </Typography>
        <TextField
          autoFocus
          label={t('party.nameInputLabel', 'Dein Name')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          inputProps={{ maxLength: 20 }}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
        <Button onClick={onSave} variant="contained" disabled={!value.trim()}>
          {t('common.save', 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export interface EditRoomCodeDialogProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export const EditRoomCodeDialog: React.FC<EditRoomCodeDialogProps> = ({
  open,
  onClose,
  value,
  onChange,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('party.customRoomTitle', 'Raum-Code anpassen')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('party.customRoomDesc', 'Verwende einen leicht merkbaren Code (z.B. SPIELABEND oder ALEX), damit deine Freunde immer denselben Link nutzen können.')}
        </Typography>
        <TextField
          autoFocus
          label={t('party.roomCodeLabel', 'Raum-Code')}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          fullWidth
          inputProps={{ maxLength: 16 }}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
        <Button onClick={onSave} variant="contained" disabled={!value.trim()}>
          {t('common.save', 'Speichern')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
