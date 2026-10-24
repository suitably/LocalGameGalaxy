/**
 * Restart the running game from its definition, after confirmation [ID: COMP-TABLETOP-RESTART]
 */
import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';

interface RestartGameButtonProps {
  onRestart: () => void;
}

export const RestartGameButton: React.FC<RestartGameButtonProps> = ({ onRestart }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title={t('games.tabletop.restart')}>
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            bgcolor: 'background.paper',
            opacity: 0.85,
          }}
          aria-label={t('games.tabletop.restart')}
        >
          <RestartAltIcon />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={open}
        title={t('games.tabletop.restart')}
        message={t('games.tabletop.restart_confirm')}
        confirmColor="warning"
        onConfirm={() => {
          setOpen(false);
          onRestart();
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};
