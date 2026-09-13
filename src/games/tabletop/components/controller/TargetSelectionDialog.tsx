import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import { useTranslation } from 'react-i18next';
import type { HolderWidget } from '../../logic/types';

interface TargetSelectionDialogProps {
  open: boolean;
  targets: HolderWidget[];
  onSelectTarget: (holderId: string) => void;
  onClose: () => void;
}

export const TargetSelectionDialog: React.FC<TargetSelectionDialogProps> = ({
  open,
  targets,
  onSelectTarget,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('games.tabletop.choose_target', 'Ablageziel wählen')}</DialogTitle>
      <DialogContent dividers sx={{ p: 1 }}>
        <List disablePadding>
          {targets.map((target) => (
            <ListItemButton
              key={target.id}
              onClick={() => {
                onSelectTarget(target.id);
                onClose();
              }}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon>
                <LayersIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={target.label || 'Ablagestapel'}
                secondary={`${target.childIds?.length || 0} Karten`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
      </DialogActions>
    </Dialog>
  );
};
