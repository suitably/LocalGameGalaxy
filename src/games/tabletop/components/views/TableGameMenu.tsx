/**
 * Game menu of the running table in the global header, plus its dialogs [ID: COMP-TABLETOP-GAME-MENU]
 *
 * The entries (back, back to the party lobby, rules, save/load, table settings, restart) live in
 * the app header (`useTabletopHeader`), like every other game; this component renders no button
 * of its own, only the dialogs the entries open. Restarting still asks first. Without
 * `onLoad`/`onRestart` (phones, spectators) only the rules are offered.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { useTableSaves } from '../../hooks/useTableSaves';
import { useTabletopHeader } from '../../hooks/useTabletopHeader';
import type { TableOrigin } from '../../logic/gameSource';
import type { TabletopGameDefinition } from '../../logic/types';
import { SaveStateDialog } from '../saves/SaveStateDialog';
import { RulesDialog } from '../surface/RulesDialog';

interface TableGameMenuProps {
  game: TabletopGameDefinition;
  /** Where the game comes from; device-only and starter games get local default templates. */
  origin: TableOrigin | null;
  /** Header back arrow; omitted keeps the header's default. */
  onBack?: () => void;
  /** Owner only (host or local play): load a saved table. */
  onLoad?: (game: TabletopGameDefinition) => void;
  /** Owner only. */
  onRestart?: () => void;
  /** TV host in a party: back to the lobby for everyone. */
  onBackToLobby?: () => void;
  /** Owner only: opens the table settings of the editor. */
  onOpenTableSettings?: () => void;
  /** Host: opens the "Show on TV" dialog. */
  onShowOnTv?: () => void;
  /** Table-only host: switch to playing a seat on this device. */
  onPlayAlong?: () => void;
  /** Host with a seat: back to the table-only view. */
  onShowTableOnly?: () => void;
}

const noop = () => {};

export const TableGameMenu: React.FC<TableGameMenuProps> = ({
  game,
  origin,
  onBack,
  onLoad,
  onRestart,
  onBackToLobby,
  onOpenTableSettings,
  onShowOnTv,
  onPlayAlong,
  onShowTableOnly,
}) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<'saves' | 'restart' | 'rules' | null>(null);
  const owner = Boolean(onLoad && onRestart);
  const saves = useTableSaves(game, origin, onLoad ?? noop, dialog === 'saves');

  useTabletopHeader({
    onBack,
    onBackToLobby,
    onOpenRules: game.ruleText ? () => setDialog('rules') : undefined,
    onOpenSaves: owner ? () => setDialog('saves') : undefined,
    onOpenTableSettings,
    onShowOnTv,
    onPlayAlong,
    onShowTableOnly,
    onRestart: owner ? () => setDialog('restart') : undefined,
  });

  return (
    <>
      {/* mounted only while open, so each opening starts fresh */}
      {dialog === 'saves' && (
        <SaveStateDialog open onClose={() => setDialog(null)} gameName={game.name} saves={saves} />
      )}
      <RulesDialog
        open={dialog === 'rules'}
        onClose={() => setDialog(null)}
        ruleText={game.ruleText}
      />
      {owner && (
        <ConfirmDialog
          open={dialog === 'restart'}
          title={t('games.tabletop.restart')}
          message={t('games.tabletop.restart_confirm')}
          confirmColor="warning"
          onConfirm={() => {
            setDialog(null);
            onRestart?.();
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
};
