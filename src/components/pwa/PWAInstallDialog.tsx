import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';

interface PWAInstallDialogProps {
  open: boolean;
  onClose: () => void;
}

export const PWAInstallDialog: React.FC<PWAInstallDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: { xs: 1, sm: 2 },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center', pb: 1 }}>
        {t('app.ios_install_title', 'Install on iOS (iPhone / iPad)')}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          {t(
            'app.install_pwa_desc',
            'Install LocalGameGalaxy on your smartphone for a full-screen experience without the browser search bar.'
          )}
        </Typography>

        <List disablePadding>
          <ListItem disableGutters sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              <IosShareIcon />
            </ListItemIcon>
            <ListItemText
              primary={t(
                'app.ios_install_step1',
                '1. Tap the Share button in Safari (at the bottom or top of your screen).'
              )}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>

          <ListItem disableGutters sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>
              <AddBoxOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary={t(
                'app.ios_install_step2',
                '2. Scroll down and tap "Add to Home Screen".'
              )}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>

          <ListItem disableGutters sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'success.main' }}>
              <CheckCircleOutlineIcon />
            </ListItemIcon>
            <ListItemText
              primary={t(
                'app.ios_install_step3',
                '3. Tap "Add" in the top right corner. The app will open in fullscreen mode without the address bar!'
              )}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ px: 4, borderRadius: 2 }}>
          {t('common.close', 'Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
