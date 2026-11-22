import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initQwixxI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { getSheetDefinition } from './logic/sheetDefinitions';
import { GameLayout } from '../../components/Layout/GameLayout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { QwixxSheet } from './components/QwixxSheet';
import { QwixxDiceRoller } from './components/QwixxDiceRoller';
import { QwixxSheetSelector } from './components/QwixxSheetSelector';
import { QwixxSheetChips } from './components/QwixxSheetChips';
import { useQwixxState } from './useQwixxState';
import { useQwixxHeaderActions } from './useQwixxHeaderActions';
import { useQwixxLocalTable } from './useQwixxLocalTable';
import { QwixxTableBar, QwixxTableSwitch } from './components/QwixxTableBar';
import { LocalPlayersDialog } from '../../modules/pass-and-play';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initQwixxI18n();

export const QwixxGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.qwixx.title', 'Farbreihen'));
  useWakeLock(true);

  const game = useQwixxState();
  const { state } = game;
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [sheetSelectorOpen, setSheetSelectorOpen] = useState(false);
  const currentSheetDef = getSheetDefinition(state.mySheet.sheetType || 'classic');
  const { showDice, setShowDice } = game;
  // One device for everyone: a sheet per player, passed on with "<name> fertig".
  const table = useQwixxLocalTable(state.mySheet, game.loadSheet);
  const [playersOpen, setPlayersOpen] = useState(false);
  useQwixxHeaderActions({
    showDice,
    onToggleDice: useCallback(() => setShowDice(!showDice), [setShowDice, showDice]),
    onNewGame: useCallback(() => setResetDialogOpen(true), []),
    onPlayers: useCallback(() => setPlayersOpen(true), [setPlayersOpen]),
  });

  return (
    <GameLayout maxWidth="md">
      <QwixxTableBar table={table} />
      {game.showDice && (
        <QwixxDiceRoller
          dice={state.dice}
          isRolling={state.isRolling}
          onRoll={game.roll}
          onDieClick={game.clickDie}
          selectedDie={game.selectedDie}
          maxDieValue={state.mySheet.sheetType === 'longo' ? 8 : 6}
          removedDice={game.removedDice}
        />
      )}

      <QwixxSheet
        sheet={state.mySheet}
        onCrossNumber={game.crossNumber}
        onLockRow={game.lockRow}
        onUnlockRow={game.unlockRow}
        onAddMiss={game.addMiss}
        onRemoveMiss={game.removeMiss}
        highlightedNumbers={game.highlightedNumbers}
        sheetChips={
          <QwixxSheetChips
            sheetName={t(currentSheetDef.nameKey)}
            onOpenSheetSelector={() => setSheetSelectorOpen(true)}
            onPickRandomSheet={game.pickRandomSheet}
          />
        }
      />

      <QwixxTableSwitch table={table} />

      <ConfirmDialog
        open={resetDialogOpen}
        title={t('games.qwixx.new_game', 'Neues Spiel')}
        message={t('games.qwixx.reset_confirm', 'Möchtest du deinen Zettel wirklich zurücksetzen?')}
        confirmText={t('games.qwixx.reset_action', 'Zettel zurücksetzen')}
        confirmColor="error"
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => {
          if (!table.newGame()) game.resetGame();
          setResetDialogOpen(false);
        }}
      />

      <LocalPlayersDialog
        open={playersOpen}
        names={table.names}
        onApply={(names) => {
          setPlayersOpen(false);
          table.setPlayers(names);
        }}
        onClose={() => setPlayersOpen(false)}
      />

      <QwixxSheetSelector
        open={sheetSelectorOpen}
        currentSheetType={state.mySheet.sheetType}
        onSelectSheet={game.selectSheet}
        onClose={() => setSheetSelectorOpen(false)}
      />
    </GameLayout>
  );
};
