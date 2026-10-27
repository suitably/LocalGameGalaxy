/**
 * Hand Dock Strip for Tabletop Local Mode [ID: GAME-TABLETOP-HAND-DOCK]
 *
 * Shows the viewer's hand as an overlapping fan (tap: zoom, drag: play) and the personal
 * supply. Spectators get a note instead of a hand.
 */
import React, { useState, useMemo } from 'react';
import { alpha, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import type { CardWidget } from '../../logic/types';
import { groupHandCards } from '../../logic/handLayout';
import { handSlots } from '../../logic/handFan';
import { getPlayerSupplyPieces } from '../../logic/seatLogic';
import { useDockDragDrop } from '../../hooks/useDockDragDrop';
import { useSeatView } from '../../hooks/useSeatView';
import { useObscuredWidgetIds } from '../../hooks/useObscuredWidgetIds';
import { DockDragOverlay } from './DockDragOverlay';
import { SupplyPieceItem } from './SupplyPieceItem';
import { HandFan } from './HandFan';
import { HandDockHeader } from './HandDockHeader';
import { CardZoomDialog, type CardZoomTarget } from './CardZoomDialog';

interface HandDockStripProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
}

export const HandDockStrip: React.FC<HandDockStripProps> = ({ state, dispatch }) => {
  const { t } = useTranslation();
  const [dockTab, setDockTab] = useState<'cards' | 'supplies'>('cards');
  const [zoom, setZoom] = useState<CardZoomTarget>(null);
  const { widgets, table } = state.game;

  const { draggingItem, pointerPos, grabOffset, boardScale, startCardDrag, startPieceDrag } =
    useDockDragDrop({ tableWidth: table.width, tableHeight: table.height, dispatch });

  const { activeSeat, isSpectator, handHolder } = useSeatView(state);
  const obscuredIds = useObscuredWidgetIds(state.game, activeSeat?.index);
  const draggedId = draggingItem?.type === 'card' ? draggingItem.card.id : draggingItem?.piece.id;

  const supplyPieces = useMemo(() => {
    if (!activeSeat) return {};
    return getPlayerSupplyPieces(widgets, activeSeat.index || 1);
  }, [activeSeat, widgets]);

  const totalSupplyCount = Object.values(supplyPieces).reduce((acc, p) => acc + p.length, 0);
  const hasSupplyPieces = totalSupplyCount > 0;

  const handCards = useMemo(() => {
    if (!handHolder) return [];
    return handHolder.childIds
      .map((id) => widgets[id])
      .filter((w): w is CardWidget => Boolean(w && w.type === 'card'));
  }, [handHolder, widgets]);

  const slots = useMemo(() => handSlots(groupHandCards(handCards)), [handCards]);

  if (!isSpectator && !handHolder && !hasSupplyPieces) return null;
  const showSupplies = dockTab === 'supplies' && hasSupplyPieces;
  const returnToDeck = (cardId: string, deckId: string) =>
    dispatch({ type: 'RETURN_CARD_TO_DECK', payload: { cardId, deckId } });
  const playToTable = (cardId: string) => {
    const card = widgets[cardId];
    const x = Math.round(table.width / 2 - (card?.width || 80) / 2);
    const y = Math.round(table.height / 2 - (card?.height || 120) / 2);
    dispatch({ type: 'PLAY_CARD_FROM_HAND', payload: { cardId, position: { x, y } } });
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: 156,
        flexShrink: 0,
        bgcolor: 'background.default',
        borderTop: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 1,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <DockDragOverlay
        item={draggingItem}
        pointerPos={pointerPos}
        grabOffset={grabOffset}
        scale={boardScale}
        obscured={draggedId !== undefined && obscuredIds.has(draggedId)}
      />

      <HandDockHeader
        isSpectator={isSpectator}
        handCount={handCards.length}
        supplyCount={hasSupplyPieces ? totalSupplyCount : 0}
        showSupplies={showSupplies}
        onSelectTab={setDockTab}
        onZoomHand={handCards.length > 0 ? () => setZoom({ kind: 'hand' }) : undefined}
      />

      {isSpectator ? (
        <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t('games.tabletop.spectatorHint', 'Du schaust zu und kannst keine Karten ziehen.')}
          </Typography>
        </Box>
      ) : showSupplies ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', flex: 1 }}>
          {Object.entries(supplyPieces).map(([groupName, pieces]) => (
            <SupplyPieceItem
              key={groupName}
              groupName={groupName}
              count={pieces.length}
              samplePiece={pieces[0]}
              onPointerDown={(e) => startPieceDrag(e, pieces[0], groupName)}
            />
          ))}
        </Box>
      ) : handCards.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            {t('games.tabletop.handEmpty', 'Keine Karten auf der Hand')}
          </Typography>
        </Box>
      ) : (
        <HandFan
          slots={slots}
          onReturnToDeck={returnToDeck}
          onCardPointerDown={(e, card) =>
            startCardDrag(e, card, () => setZoom({ kind: 'card', cardId: card.id }))
          }
        />
      )}

      <CardZoomDialog
        target={zoom}
        cards={handCards}
        onClose={() => setZoom(null)}
        onPlay={playToTable}
        onReturnToDeck={returnToDeck}
      />
    </Box>
  );
};
