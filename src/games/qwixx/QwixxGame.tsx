import React, { useState } from 'react';
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { initQwixxI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { getSheetDefinition } from './logic/sheetDefinitions';
import { GameLayout } from '../../components/Layout/GameLayout';
import { QwixxSheet } from './components/QwixxSheet';
import { QwixxDiceRoller } from './components/QwixxDiceRoller';
import { QwixxSheetSelector } from './components/QwixxSheetSelector';
import { QwixxToolbar } from './components/QwixxToolbar';
import { useQwixxState } from './useQwixxState';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initQwixxI18n();

export const QwixxGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.qwixx.title', 'Qwixx'));
  useWakeLock(true);

  const game = useQwixxState();
  const { state } = game;
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [sheetSelectorOpen, setSheetSelectorOpen] = useState(false);
  const currentSheetDef = getSheetDefinition(state.mySheet.sheetType || 'classic');

  return (
    <GameLayout maxWidth="md">
      <QwixxToolbar
        sheetName={t(currentSheetDef.nameKey)}
        showDice={game.showDice}
        onOpenSheetSelector={() => setSheetSelectorOpen(true)}
        onPickRandomSheet={game.pickRandomSheet}
        onToggleDice={() => game.setShowDice(!game.showDice)}
        onNewGame={() => setResetDialogOpen(true)}
      />

      {game.showDice && (
        <QwixxDiceRoller
          dice={state.dice}
          isRolling={state.isRolling}
          onRoll={game.roll}
          onDieClick={game.clickDie}
          selectedDie={game.selectedDie}
          maxDieValue={state.mySheet.sheetType === 'longo' ? 8 : 6}
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
      />

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>{t('games.qwixx.new_game', 'Neues Spiel')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('games.qwixx.reset_confirm', 'Möchtest du deinen Zettel wirklich zurücksetzen?')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} color="inherit">
            {t('common.cancel', 'Abbrechen')}
          </Button>
          <Button
            onClick={() => {
              game.resetGame();
              setResetDialogOpen(false);
            }}
            color="error"
            variant="contained"
          >
            {t('games.qwixx.new_game', 'Zurücksetzen')}
          </Button>
        </DialogActions>
      </Dialog>

      <QwixxSheetSelector
        open={sheetSelectorOpen}
        currentSheetType={state.mySheet.sheetType}
        onSelectSheet={game.selectSheet}
        onClose={() => setSheetSelectorOpen(false)}
      />
    </GameLayout>
  );
};
