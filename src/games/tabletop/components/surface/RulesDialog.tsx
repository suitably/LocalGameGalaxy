/**
 * Rules Dialog for Tabletop Games [ID: GAME-TABLETOP-RULES-DIALOG]
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
  ruleText?: string;
}

export const RulesDialog: React.FC<RulesDialogProps> = ({ open, onClose, ruleText }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('games.tabletop.rulesDialogTitle', 'Spielregeln')}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {ruleText ? (
          <Box
            sx={{
              color: 'text.primary',
              '& h1, & h2, & h3, & h4': {
                color: 'primary.light',
                mt: 2,
                mb: 1,
                fontWeight: 700,
              },
              '& h4:first-of-type': { mt: 0 },
              '& p': { mb: 1.5, lineHeight: 1.6 },
              '& ul, & ol': { pl: 3, mb: 1.5 },
              '& li': { mb: 0.5, lineHeight: 1.5 },
              '& strong': { color: 'text.primary' },
              '& table': { borderCollapse: 'collapse', width: '100%', mb: 2 },
              '& td, & th': { border: '1px solid', borderColor: 'divider', p: 1 },
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: ruleText }}
          />
        ) : (
          <Typography color="text.secondary">
            {t('games.tabletop.noRulesAvailable', 'Keine Regeln für dieses Spiel verfügbar.')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
