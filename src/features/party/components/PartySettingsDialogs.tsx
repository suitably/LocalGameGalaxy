import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface EditPlayerNameDialogProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

interface SingleFieldDialogProps extends EditPlayerNameDialogProps {
  title: string;
  description: string;
  label: string;
  maxLength: number;
  transform?: (value: string) => string;
}

/** Shared frame: title, hint, one text field and cancel/save actions. */
const SingleFieldDialog: React.FC<SingleFieldDialogProps> = ({
  open,
  onClose,
  value,
  onChange,
  onSave,
  title,
  description,
  label,
  maxLength,
  transform,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <TextField
          autoFocus
          label={label}
          value={value}
          onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
          fullWidth
          inputProps={{ maxLength }}
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

export const EditPlayerNameDialog: React.FC<EditPlayerNameDialogProps> = (props) => {
  const { t } = useTranslation();

  return (
    <SingleFieldDialog
      {...props}
      title={t('party.editNameTitle', 'Deinen Namen ändern')}
      description={t(
        'party.editNameDesc',
        'Passe deinen Spielernamen für die Party-Lobby und alle Minispiele an.',
      )}
      label={t('party.nameInputLabel', 'Dein Name')}
      maxLength={20}
    />
  );
};

export type EditRoomCodeDialogProps = EditPlayerNameDialogProps;

export const EditRoomCodeDialog: React.FC<EditRoomCodeDialogProps> = (props) => {
  const { t } = useTranslation();

  return (
    <SingleFieldDialog
      {...props}
      title={t('party.customRoomTitle', 'Raum-Code anpassen')}
      description={t(
        'party.customRoomDesc',
        'Verwende einen leicht merkbaren Code (z.B. SPIELABEND oder ALEX), damit deine Freunde immer denselben Link nutzen können.',
      )}
      label={t('party.roomCodeLabel', 'Raum-Code')}
      maxLength={16}
      transform={(v) => v.toUpperCase()}
    />
  );
};
