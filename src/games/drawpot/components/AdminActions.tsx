/**
 * Host actions with confirmation: close/reopen, reset, delete [ID: DRAWPOT-ADMIN-ACTIONS]
 */
import React, { useState } from 'react';
import { Button, Stack } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import type { DrawPotAdminView } from '../logic/api';

interface AdminActionsProps {
  pot: DrawPotAdminView;
  busy: boolean;
  onAction: (action: 'reset' | 'close' | 'reopen') => void;
  onDelete: () => void;
}

export const AdminActions: React.FC<AdminActionsProps> = ({ pot, busy, onAction, onDelete }) => {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {pot.closed ? (
          <Button
            variant="outlined"
            startIcon={<LockOpenRoundedIcon />}
            disabled={busy}
            onClick={() => onAction('reopen')}
          >
            {t('drawpot.admin.reopen')}
          </Button>
        ) : (
          <Button
            variant="outlined"
            startIcon={<LockRoundedIcon />}
            disabled={busy}
            onClick={() => onAction('close')}
          >
            {t('drawpot.admin.close')}
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<RestartAltRoundedIcon />}
          disabled={busy}
          onClick={() => setConfirm('reset')}
        >
          {t('drawpot.admin.reset')}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteRoundedIcon />}
          disabled={busy}
          onClick={() => setConfirm('delete')}
        >
          {t('drawpot.admin.delete')}
        </Button>
      </Stack>
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === 'delete' ? t('drawpot.admin.deleteTitle') : t('drawpot.admin.resetTitle')
        }
        message={
          confirm === 'delete' ? t('drawpot.admin.deleteMessage') : t('drawpot.admin.resetMessage')
        }
        confirmText={confirm === 'delete' ? t('drawpot.admin.delete') : t('drawpot.admin.reset')}
        confirmColor={confirm === 'delete' ? 'error' : 'warning'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'delete') onDelete();
          else onAction('reset');
          setConfirm(null);
        }}
      />
    </>
  );
};
