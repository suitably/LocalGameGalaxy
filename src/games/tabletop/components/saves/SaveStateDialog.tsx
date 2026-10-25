/**
 * Save the running table under a name and resume saved tables (#538) [ID: COMP-TABLETOP-SAVE-DIALOG]
 *
 * Saving on this device is always possible; on the companion server it needs the API key
 * permission `allowTabletopSaves`, the default template `allowTabletopTemplates`.
 */
import React, { useMemo, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { checkSaveName, suggestUniqueName } from '../../logic/saveNames';
import type { SaveTarget, TableSaves } from '../../hooks/useTableSaves';
import { SaveStateForm } from './SaveStateForm';
import { SaveStateList } from './SaveStateList';

type Pending =
  { kind: 'load' | 'delete'; target: SaveTarget; id: string } | { kind: 'template' } | null;

interface Props {
  open: boolean;
  onClose: () => void;
  gameName: string;
  saves: TableSaves;
}

export const SaveStateDialog: React.FC<Props> = ({ open, onClose, gameName, saves }) => {
  const { t } = useTranslation();
  const [chosenTarget, setTarget] = useState<SaveTarget>('local');
  /** null until the player types: then the name follows the free suggestion. */
  const [typedName, setTypedName] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const serverAllowed = saves.serverAvailable && saves.permissions.saveStates;
  const target: SaveTarget = serverAllowed ? chosenTarget : 'local';
  const name =
    typedName ??
    suggestUniqueName(
      gameName,
      saves.localSaves.map((s) => s.name),
    );

  const entries = useMemo(
    () =>
      target === 'local' ? saves.localSaves.map((s) => ({ ...s, mine: true })) : saves.serverSaves,
    [target, saves.localSaves, saves.serverSaves],
  );
  const check = checkSaveName(name, entries);

  const handleSave = async () => {
    if (check.kind === 'empty' || check.kind === 'taken') return;
    const ok = await saves.save(target, name, check.kind === 'own' ? check.id : undefined);
    if (ok) onClose();
  };

  const confirm = async () => {
    const action = pending;
    setPending(null);
    if (!action) return;
    if (action.kind === 'template') await saves.saveTemplate();
    else if (action.kind === 'delete') await saves.remove(action.target, action.id);
    else if (await saves.load(action.target, action.id)) onClose();
  };

  const serverHint = !saves.serverAvailable
    ? null
    : saves.serverError
      ? t('games.tabletop.saves.serverUnavailable', { error: saves.serverError })
      : !saves.permissions.saveStates
        ? t('games.tabletop.saves.noServerPermission')
        : null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>{t('games.tabletop.saves.title')}</DialogTitle>
        <DialogContent>
          <SaveStateForm
            name={name}
            onNameChange={setTypedName}
            target={target}
            onTargetChange={setTarget}
            serverAllowed={serverAllowed}
            serverHint={serverHint}
            check={check}
          />
          {saves.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {saves.error}
            </Alert>
          )}
          <SaveStateList
            title={t('games.tabletop.saves.localList')}
            saves={saves.localSaves.map((s) => ({ ...s, mine: true }))}
            busy={saves.busy}
            onLoad={(id) => setPending({ kind: 'load', target: 'local', id })}
            onDelete={(id) => setPending({ kind: 'delete', target: 'local', id })}
          />
          {saves.serverAvailable && !saves.serverError && (
            <SaveStateList
              title={t('games.tabletop.saves.serverList')}
              saves={saves.serverSaves}
              busy={saves.busy}
              filterByOwner
              onLoad={(id) => setPending({ kind: 'load', target: 'server', id })}
              onDelete={(id) => setPending({ kind: 'delete', target: 'server', id })}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap' }}>
          {saves.serverAvailable && saves.permissions.saveTemplates && (
            <Button
              color="warning"
              disabled={saves.busy}
              onClick={() => setPending({ kind: 'template' })}
              sx={{ mr: 'auto' }}
            >
              {t('games.tabletop.saves.saveTemplate')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saves.busy || check.kind === 'empty' || check.kind === 'taken'}
          >
            {check.kind === 'own'
              ? t('games.tabletop.saves.overwrite')
              : t('games.tabletop.saves.save')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={pending !== null}
        title={pending ? t(`games.tabletop.saves.confirm_${pending.kind}_title`) : undefined}
        message={pending ? t(`games.tabletop.saves.confirm_${pending.kind}`) : ''}
        confirmColor={pending?.kind === 'load' ? 'primary' : 'warning'}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </>
  );
};
