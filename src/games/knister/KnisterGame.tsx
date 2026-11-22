import React, { useCallback } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { initKnisterI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { GameLayout } from '../../components/Layout/GameLayout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useKnisterGameState } from './useKnisterGameState';
import { KnisterBoard } from './components/KnisterBoard';
import { KnisterToolbar } from './components/KnisterToolbar';
import { KnisterDiceRoller } from './components/KnisterDiceRoller';
import { KnisterNumberBar } from './components/KnisterNumberBar';
import { KnisterNumberPickerModal } from './components/KnisterNumberPickerModal';
import { KnisterCombinationsLegend } from './components/KnisterCombinationsLegend';
import { KnisterGameOverModal } from './components/KnisterGameOverModal';
import { usePassAndPlayTurns } from '../../modules/pass-and-play';
import { canUndoLocal } from './logic/knisterLocal';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initKnisterI18n();

export const KnisterGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.knister.title', 'Knister'));
  useWakeLock(true);

  const game = useKnisterGameState();
  const { state, dispatch } = game;
  // One device for everyone: after placing, the cover asks for the next player of this roll.
  const turns = usePassAndPlayTurns({
    players: state.players,
    activeIndex: state.activePlayerIndex,
    onSwitch: useCallback(
      (index: number) => dispatch({ type: 'SWITCH_PLAYER', index }),
      [dispatch],
    ),
    onSetPlayers: useCallback(
      (names: string[]) => dispatch({ type: 'SET_PLAYERS', names }),
      [dispatch],
    ),
  });

  return (
    <GameLayout maxWidth="md">
      <KnisterToolbar
        showDice={game.showDice}
        canUndo={canUndoLocal(state)}
        onToggleDice={game.toggleDice}
        onUndo={game.handleUndo}
        onOpenLegend={() => game.setLegendOpen(true)}
        onReset={() => game.setResetDialogOpen(true)}
        onPlayers={turns.openPlayers}
      />

      {state.players.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs
            value={state.activePlayerIndex}
            onChange={(_, val: number) => turns.switchTo(val)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {state.players.map((p, idx) => (
              <Tab
                key={p.id}
                label={`${idx + 1}. ${p.name}`}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {game.showDice && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <KnisterDiceRoller
            currentRoll={state.currentRoll}
            rollCount={state.rollCount}
            rollHistory={state.rollHistory}
            onRoll={game.handleRollDice}
            disabled={state.isGameOver}
          />
        </Box>
      )}

      {/* Number selection bar (2 to 12) for custom/physical dice */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 0.5, sm: 1.5 } }}>
        <KnisterNumberBar
          selectedNumber={game.selectedNumber}
          onSelectNumber={game.setSelectedNumber}
          disabled={state.isGameOver}
        />
      </Box>

      <KnisterBoard
        grid={game.activePlayer.grid}
        currentSum={state.currentRoll ? state.currentRoll.sum : null}
        selectedNumber={game.selectedNumber}
        targetPickerCell={game.pickerTargetCell}
        onCellClick={game.handleCellClick}
        onCellOpenPicker={game.hasActiveSum ? undefined : game.handleOpenPicker}
        disabled={state.isGameOver}
        playerSlot={state.activePlayerIndex}
      />

      <KnisterNumberPickerModal
        open={game.pickerTargetCell !== null}
        targetCell={game.pickerTargetCell}
        onSelectNumber={game.handlePickerSelectNumber}
        onClose={game.closePicker}
      />

      {turns.overlay}

      <KnisterCombinationsLegend open={game.legendOpen} onClose={() => game.setLegendOpen(false)} />

      <KnisterGameOverModal
        open={game.gameOverModalOpen}
        players={state.players}
        highScore={state.highScore}
        onNewGame={game.handleNewGame}
        onClose={game.closeGameOverModal}
      />

      <ConfirmDialog
        open={game.resetDialogOpen}
        title={t('games.knister.new_game', 'Neues Spiel')}
        message={t(
          'games.knister.new_game_confirm',
          'Möchtest du wirklich eine neue Runde starten? Der aktuelle Spielstand geht verloren.',
        )}
        confirmText={t('games.knister.new_game', 'Neustart')}
        confirmColor="warning"
        onConfirm={game.handleNewGame}
        onCancel={() => game.setResetDialogOpen(false)}
      />
    </GameLayout>
  );
};
