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
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={onSave} variant="contained" disabled={!value.trim()}>
          {t('common.save')}
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
      title={t('party.editNameTitle')}
      description={t('party.editNameDesc')}
      label={t('party.nameInputLabel')}
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
      title={t('party.customRoomTitle')}
      description={t('party.customRoomDesc')}
      label={t('party.roomCodeLabel')}
      maxLength={16}
      transform={(v) => v.toUpperCase()}
    />
  );
};
