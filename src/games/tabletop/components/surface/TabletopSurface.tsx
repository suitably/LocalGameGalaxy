import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { TabletopToolbar } from './TabletopToolbar';
import { RulesDialog } from './RulesDialog';
import { FlyingCardsLayer } from './FlyingCardsLayer';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import type { CardWidget, DeckWidget, TokenWidget, CounterWidget, DieWidget, TabletopWidget, SeatWidget } from '../../logic/types';
import { useTabletopEngine } from '../../hooks/useTabletopEngine';
import { useViewportCulling } from '../../hooks/useViewportCulling';
import { CardWidgetView } from '../widgets/CardWidgetView';
import { DeckWidgetView } from '../widgets/DeckWidgetView';
import { HolderWidgetView } from '../widgets/HolderWidgetView';
import { TokenWidgetView } from '../widgets/TokenWidgetView';
import { CounterWidgetView } from '../widgets/CounterWidgetView';
import { DieWidgetView } from '../widgets/DieWidgetView';
import { getSeatWidgets } from '../../logic/seatLogic';
import { filterBoardHolders, filterBoardWidgets } from '../../logic/boardFilter';
import { PlayerSeatSelector } from './PlayerSeatSelector';
import { PlayerOverviewHud } from './PlayerOverviewHud';
import { BoardDragOverlay } from './BoardDragOverlay';

interface TabletopSurfaceProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  isTvMode?: boolean;
}

export const TabletopSurface: React.FC<TabletopSurfaceProps> = ({ state, dispatch, isTvMode = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const { game, flyingCards } = state;
  const seats = useMemo(() => getSeatWidgets(game.widgets), [game.widgets]);
  const activeSeat = useMemo(() => {
    if (state.currentSeatId && state.game.widgets[state.currentSeatId]) {
      return state.game.widgets[state.currentSeatId] as SeatWidget;
    }
    return seats[0];
  }, [seats, state.currentSeatId, state.game.widgets]);

  const {
    transform, setTransform, activeDragId, isDraggingActive, dragPointer, grabOffset,
    handlePointerDownWidget, handlePointerMove, handlePointerUp, handleStartPan,
    zoomIn, zoomOut,
  } = useTabletopEngine({
    tableWidth: game.table.width,
    tableHeight: game.table.height,
    widgets: game.widgets,
    currentSeatIndex: activeSeat?.index,
    onMoveWidget: (id, x, y) => dispatch({ type: 'MOVE_WIDGET', payload: { id, x, y } }),
    onSnapToHolder: (widgetId, holderId) => dispatch({ type: 'SNAP_TO_HOLDER', payload: { widgetId, holderId } }),
    onDoubleClickWidget: (cardId) => dispatch({ type: 'FLIP_CARD', payload: { cardId } }),
    onDrawCardAt: (deckId, x, y) => dispatch({ type: 'DRAW_CARD', payload: { deckId, position: { x, y } } }),
  });

  const visibleIds = useViewportCulling(game.widgets, transform, containerSize.width, containerSize.height);

  const boardHolders = useMemo(
    () => filterBoardHolders(game.widgets, visibleIds, isTvMode),
    [game.widgets, visibleIds, isTvMode]
  );

  const boardWidgets = useMemo(
    () => filterBoardWidgets(game.widgets, visibleIds, isTvMode),
    [game.widgets, visibleIds, isTvMode]
  );

  const fitToScreen = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      setContainerSize({ width: clientWidth, height: clientHeight });
      const scaleX = clientWidth / game.table.width;
      const scaleY = clientHeight / game.table.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.95;
      const offsetX = (clientWidth - game.table.width * fitScale) / 2;
      const offsetY = (clientHeight - game.table.height * fitScale) / 2;
      setTransform({ x: Math.round(offsetX), y: Math.round(offsetY), scale: fitScale });
    }
  }, [game.table.width, game.table.height, setTransform]);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  return (
    <Box
      ref={containerRef}
      onPointerDown={handleStartPan}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#121212',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <Box
        id="tabletop-board-canvas"
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: game.table.width,
          height: game.table.height,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          bgcolor: game.table.backgroundColor || '#1e3d2f',
          backgroundImage: game.table.backgroundImageUrl ? `url(${game.table.backgroundImageUrl})` : undefined,
          backgroundSize: 'cover',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          borderRadius: 4,
          transition: isTvMode ? 'transform 0.3s ease' : 'none',
        }}
      >
        {boardHolders.map((w) => (
          <HolderWidgetView key={w.id} widget={w} />
        ))}

        {boardWidgets.map((w: TabletopWidget) => {
          const isDragging = isDraggingActive && activeDragId === w.id;
          switch (w.type) {
            case 'card':
              return (
                <CardWidgetView
                  key={w.id}
                  widget={w as CardWidget}
                  isDragging={isDragging}
                  onPointerDown={(e) => handlePointerDownWidget(e, w)}
                  onDoubleClick={() => dispatch({ type: 'FLIP_CARD', payload: { cardId: w.id } })}
                />
              );
            case 'deck':
              return (
                <DeckWidgetView
                  key={w.id}
                  widget={w as DeckWidget}
                  isDragging={isDragging}
                  onPointerDown={(e) => handlePointerDownWidget(e, w)}
                  onDraw={() => dispatch({ type: 'DRAW_CARD', payload: { deckId: w.id } })}
                  onShuffle={() => dispatch({ type: 'SHUFFLE_DECK', payload: { deckId: w.id } })}
                />
              );
            case 'token':
              return (
                <TokenWidgetView
                  key={w.id}
                  widget={w as TokenWidget}
                  isDragging={isDragging}
                  onPointerDown={(e) => handlePointerDownWidget(e, w)}
                />
              );
            case 'counter':
              return (
                <CounterWidgetView
                  key={w.id}
                  widget={w as CounterWidget}
                  onIncrement={() => dispatch({ type: 'UPDATE_COUNTER', payload: { counterId: w.id, delta: w.step || 1 } })}
                  onDecrement={() => dispatch({ type: 'UPDATE_COUNTER', payload: { counterId: w.id, delta: -(w.step || 1) } })}
                />
              );
            case 'die':
              return (
                <DieWidgetView
                  key={w.id}
                  widget={w as DieWidget}
                  isDragging={isDragging}
                  onPointerDown={(e) => handlePointerDownWidget(e, w)}
                  onRoll={() => dispatch({ type: 'ROLL_DIE', payload: { dieId: w.id } })}
                />
              );
            default:
              return null;
          }
        })}

        <FlyingCardsLayer
          flyingCards={flyingCards}
          widgets={game.widgets}
          tableWidth={game.table.width}
          tableHeight={game.table.height}
          onFinishAnimation={(id) => dispatch({ type: 'FINISH_ANIMATION', payload: { animationId: id } })}
        />
      </Box>

      {!isTvMode && seats.length > 0 && (
        <PlayerSeatSelector
          seats={seats}
          currentSeatId={state.currentSeatId}
          onSelectSeat={(seatId) => dispatch({ type: 'SELECT_SEAT', payload: { seatId } })}
          onToggleHud={() => setHudOpen(true)}
        />
      )}

      {!isTvMode && (
        <TabletopToolbar
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={fitToScreen}
          onOpenRules={() => setRulesOpen(true)}
          hasRules={Boolean(game.ruleText)}
        />
      )}

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        ruleText={game.ruleText}
      />

      {seats.length > 0 && (
        <PlayerOverviewHud
          open={hudOpen}
          onClose={() => setHudOpen(false)}
          seats={seats}
          widgets={game.widgets}
          currentSeatId={state.currentSeatId}
        />
      )}

      <BoardDragOverlay
        widget={activeDragId && isDraggingActive ? game.widgets[activeDragId] : null}
        pointerPos={dragPointer}
        grabOffset={grabOffset}
        scale={transform.scale}
      />
    </Box>
  );
};
