import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { TabletopToolbar } from './TabletopToolbar';
import { RulesDialog } from './RulesDialog';
import { FlyingCardsLayer } from './FlyingCardsLayer';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import type { TabletopWidget, SeatWidget } from '../../logic/types';
import { useTabletopEngine } from '../../hooks/useTabletopEngine';
import { useViewportCulling } from '../../hooks/useViewportCulling';
import { useTabletopSelection } from '../../hooks/useTabletopSelection';
import { HolderWidgetView } from '../widgets/HolderWidgetView';
import { BoardWidgetRenderer } from './BoardWidgetRenderer';
import { SelectionHighlightLayer } from './SelectionHighlightLayer';
import { SelectionFloatingBar } from './SelectionFloatingBar';
import { HiddenZoneLayer } from './HiddenZoneLayer';
import { WidgetContextMenu, type WidgetContextMenuPosition } from './WidgetContextMenu';
import { createDefaultHiddenZone } from '../../logic/hiddenZoneLogic';
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
  const [contextMenuPos, setContextMenuPos] = useState<WidgetContextMenuPosition | null>(null);

  const selection = useTabletopSelection({ dispatch });
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
    handlePointerDownWidget, handleStartPan,
    zoomIn, zoomOut, hoveredTargetId,
  } = useTabletopEngine({
    tableWidth: game.table.width,
    tableHeight: game.table.height,
    widgets: game.widgets,
    currentSeatIndex: activeSeat?.index,
    onMoveWidget: (id, x, y) => dispatch({ type: 'MOVE_WIDGET', payload: { id, x, y } }),
    onSnapToHolder: (widgetId, holderId) => dispatch({ type: 'SNAP_TO_HOLDER', payload: { widgetId, holderId } }),
    onDoubleClickWidget: (cardId) => dispatch({ type: 'FLIP_CARD', payload: { cardId } }),
    onDrawCardAt: (deckId, x, y, cardId) => dispatch({ type: 'DRAW_CARD', payload: { deckId, position: { x, y }, cardId } }),
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

  const onPointerDownBoardWidget = (e: React.PointerEvent, w: TabletopWidget) => {
    if (selection.handleWidgetClick(w.id, e.shiftKey)) {
      return;
    }
    handlePointerDownWidget(e, w);
  };

  const handleAddHiddenZone = () => {
    const zoneId = `hz_${Date.now()}`;
    const zone = createDefaultHiddenZone(zoneId, game.table.width, game.table.height, {
      ownerSeat: activeSeat?.index,
      color: activeSeat?.color,
    });
    dispatch({ type: 'ADD_HIDDEN_ZONE', payload: { zone } });
  };

  return (
    <Box
      ref={containerRef}
      onPointerDown={handleStartPan}
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
          <HolderWidgetView key={w.id} widget={w} isHovered={w.id === hoveredTargetId} />
        ))}

        {boardWidgets.map((w: TabletopWidget) => (
          <BoardWidgetRenderer
            key={w.id}
            widget={w}
            isDragging={isDraggingActive && activeDragId === w.id}
            onPointerDown={(e) => onPointerDownBoardWidget(e, w)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenuPos({ mouseX: e.clientX, mouseY: e.clientY, widgetId: w.id });
            }}
            dispatch={dispatch}
          />
        ))}

        <SelectionHighlightLayer selectedWidgetIds={selection.selectedWidgetIds} widgets={game.widgets} />

        <HiddenZoneLayer
          hiddenZones={game.hiddenZones}
          currentSeatIndex={activeSeat?.index}
          onToggleReveal={(id) => dispatch({ type: 'TOGGLE_ZONE_REVEAL', payload: { id } })}
          onRemoveZone={(id) => dispatch({ type: 'REMOVE_HIDDEN_ZONE', payload: { id } })}
        />

        <FlyingCardsLayer
          flyingCards={flyingCards}
          widgets={game.widgets}
          tableWidth={game.table.width}
          tableHeight={game.table.height}
          onFinishAnimation={(id) => dispatch({ type: 'FINISH_ANIMATION', payload: { animationId: id } })}
        />
      </Box>

      <SelectionFloatingBar
        selectedCount={selection.selectedWidgetIds.length}
        onScaleUp={() => selection.scaleSelected(1.25)}
        onScaleDown={() => selection.scaleSelected(0.8)}
        onResetScale={selection.resetScaleSelected}
        onClearSelection={selection.clearSelection}
      />

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
          isSelectionMode={selection.isSelectionMode}
          onToggleSelectionMode={selection.toggleSelectionMode}
          onAddHiddenZone={handleAddHiddenZone}
        />
      )}

      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} ruleText={game.ruleText} />

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

      <WidgetContextMenu
        position={contextMenuPos}
        widget={contextMenuPos ? game.widgets[contextMenuPos.widgetId] : undefined}
        isSelected={contextMenuPos ? selection.selectedWidgetIds.includes(contextMenuPos.widgetId) : false}
        onClose={() => setContextMenuPos(null)}
        onToggleSelect={(id) => selection.handleWidgetClick(id, true)}
        onToggleShowAlways={(id, cur) => dispatch({ type: 'SET_WIDGET_SHOW_ALWAYS', payload: { widgetId: id, showAlways: !cur } })}
        onScaleWidget={(id, factor) => dispatch({ type: 'SCALE_WIDGETS', payload: { widgetIds: [id], factor } })}
        onResetWidgetScale={(id) => dispatch({ type: 'RESET_WIDGET_SCALE', payload: { widgetIds: [id] } })}
      />
    </Box>
  );
};
