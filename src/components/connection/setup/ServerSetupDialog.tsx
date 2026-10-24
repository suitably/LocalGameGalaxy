import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { ServerSetupWizard } from '../ServerSetupWizard';

interface ServerSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ServerSetupDialog: React.FC<ServerSetupDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoFixHighIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('server.setup.dialog_title', 'Server einrichten & anpassen')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <ServerSetupWizard isDialog />
      </DialogContent>
    </Dialog>
  );
};
