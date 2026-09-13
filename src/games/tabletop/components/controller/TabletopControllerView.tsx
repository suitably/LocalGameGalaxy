import React, { useState } from 'react';
import { Box, Paper, Typography, ToggleButtonGroup, ToggleButton, Chip } from '@mui/material';
import PanToolIcon from '@mui/icons-material/PanTool';
import MapIcon from '@mui/icons-material/Map';
import { useTranslation } from 'react-i18next';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import { useDynamicControllerState } from '../../hooks/useDynamicControllerState';
import { CardHandDock } from './CardHandDock';
import { ControllerActionToolbar } from './ControllerActionToolbar';
import { TargetSelectionDialog } from './TargetSelectionDialog';
import { TabletopSurface } from '../surface/TabletopSurface';

interface TabletopControllerViewProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  mySeat: number | null;
  onFlickCardToTable?: (cardId: string, targetHolderId: string) => void;
}

export const TabletopControllerView: React.FC<TabletopControllerViewProps> = ({
  state,
  dispatch,
  mySeat,
  onFlickCardToTable,
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'hand' | 'board'>('hand');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingFlickCardId, setPendingFlickCardId] = useState<string | null>(null);

  const {
    myHandCards,
    publicDecks,
    dropTargets,
    publicDice,
    myCounters,
    topDiscardCard,
  } = useDynamicControllerState(state.game, mySeat);

  const handleCardFlick = (cardId: string) => {
    if (dropTargets.length === 0) {
      dispatch({ type: 'MOVE_WIDGET', payload: { id: cardId, x: 700, y: 400 } });
    } else if (dropTargets.length === 1) {
      triggerPlay(cardId, dropTargets[0].id);
    } else {
      setPendingFlickCardId(cardId);
    }
  };

  const triggerPlay = (cardId: string, targetHolderId: string) => {
    if (onFlickCardToTable) {
      onFlickCardToTable(cardId, targetHolderId);
    } else {
      dispatch({ type: 'ANIMATE_CARD_TO_TABLE', payload: { cardId, targetHolderId } });
    }
    setSelectedCardId(null);
    setPendingFlickCardId(null);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#121212',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Status & Mode Switcher */}
      <Paper
        elevation={2}
        sx={{
          p: 1,
          px: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            size="small"
            color="primary"
            label={mySeat !== null ? `Spieler ${mySeat + 1}` : 'Zuschauer'}
          />
          {topDiscardCard && (
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Tisch: {topDiscardCard.frontContent.value}
            </Typography>
          )}
        </Box>

        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, next) => next && setViewMode(next)}
        >
          <ToggleButton value="hand"><PanToolIcon sx={{ mr: 0.5, fontSize: 18 }} /> {t('games.tabletop.view_hand', 'Hand')}</ToggleButton>
          <ToggleButton value="board"><MapIcon sx={{ mr: 0.5, fontSize: 18 }} /> {t('games.tabletop.view_board', 'Tisch')}</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Main View Area */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {viewMode === 'board' ? (
          <TabletopSurface state={state} dispatch={dispatch} />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2,
              textAlign: 'center',
            }}
          >
            {topDiscardCard ? (
              <Box
                sx={{
                  width: 140,
                  height: 190,
                  borderRadius: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  boxShadow: 6,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  mb: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                  {t('games.tabletop.current_table_card', 'Aktuelle Karte auf dem Tisch')}
                </Typography>
                <Typography variant="h4" fontWeight={900} color="primary.main" sx={{ mt: 0.5 }}>
                  {topDiscardCard.frontContent.value}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t('games.tabletop.flick_hint', 'Wische eine Karte nach oben, um sie auf den TV zu werfen!')}
              </Typography>
            )}

            <ControllerActionToolbar
              decks={publicDecks}
              dice={publicDice}
              counters={myCounters}
              onDrawCard={(deckId) => {
                const targetId = myHandCards[0]?.id ? dropTargets[0]?.id : undefined;
                dispatch({ type: 'DRAW_CARD', payload: { deckId, targetHolderId: targetId } });
              }}
              onRollDice={(dieIds) => {
                for (const dieId of dieIds) dispatch({ type: 'ROLL_DIE', payload: { dieId } });
              }}
              onUpdateCounter={(counterId, delta) => dispatch({ type: 'UPDATE_COUNTER', payload: { counterId, delta } })}
            />
          </Box>
        )}
      </Box>

      {/* Fixed Bottom Hand Dock */}
      <CardHandDock
        cards={myHandCards}
        selectedCardId={selectedCardId}
        onSelectCard={(id) => setSelectedCardId((prev) => (prev === id ? null : id))}
        onFlickCard={handleCardFlick}
        onPlaySelected={() => selectedCardId && handleCardFlick(selectedCardId)}
      />

      <TargetSelectionDialog
        open={Boolean(pendingFlickCardId)}
        targets={dropTargets}
        onSelectTarget={(targetId) => pendingFlickCardId && triggerPlay(pendingFlickCardId, targetId)}
        onClose={() => setPendingFlickCardId(null)}
      />
    </Box>
  );
};
