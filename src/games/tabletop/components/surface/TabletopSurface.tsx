import React, { useRef, useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { TabletopToolbar } from './TabletopToolbar';
import { RulesDialog } from './RulesDialog';
import { FlyingCardsLayer } from './FlyingCardsLayer';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import type { TabletopWidget } from '../../logic/types';
import { useTabletopEngine } from '../../hooks/useTabletopEngine';
import { useViewportCulling } from '../../hooks/useViewportCulling';
import { useTabletopSelection } from '../../hooks/useTabletopSelection';
import { useObscuredWidgetIds } from '../../hooks/useObscuredWidgetIds';
import { useSeatView } from '../../hooks/useSeatView';
import { HolderWidgetView } from '../widgets/HolderWidgetView';
import { BoardWidgetRenderer } from './BoardWidgetRenderer';
import { SelectionHighlightLayer } from './SelectionHighlightLayer';
import { SelectionFloatingBar } from './SelectionFloatingBar';
import { HiddenZoneLayer } from './HiddenZoneLayer';
import type { WidgetContextMenuPosition } from './WidgetContextMenu';
import { SurfaceContextMenu } from './SurfaceContextMenu';
import { useTableKeyShortcuts } from '../../hooks/useTableKeyShortcuts';
import { useAddHiddenZone } from '../../hooks/useAddHiddenZone';
import { getSeatWidgets } from '../../logic/seatLogic';
import { filterBoardHolders, filterBoardWidgets } from '../../logic/boardFilter';
import { SurfaceSeatControls } from './SurfaceSeatControls';
import { useFitToScreen } from '../../hooks/useFitToScreen';
import { BoardDragOverlay } from './BoardDragOverlay';

interface TabletopSurfaceProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  isTvMode?: boolean;
  /** Pass and play: seats change only through the handover cover. */
  hideSeatSelector?: boolean;
  editMode?: boolean;
  /** Spectator device: the table can be viewed, panned and zoomed but never changed. */
  readOnly?: boolean;
}

export const TabletopSurface: React.FC<TabletopSurfaceProps> = ({
  state,
  dispatch: seatDispatch,
  isTvMode = false,
  hideSeatSelector = false,
  editMode = false,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<WidgetContextMenuPosition | null>(null);

  const { game, flyingCards } = state;
  const seats = useMemo(() => getSeatWidgets(game.widgets), [game.widgets]);
  // Spectators are read-only: only the seat picker (a local view choice) keeps the real dispatch.
  const { activeSeat, isSpectator, handHolder, dispatch } = useSeatView(state, {
    readOnly,
    dispatch: seatDispatch,
  });
  const selection = useTabletopSelection({ dispatch });

  const {
    transform,
    setTransform,
    activeDragId,
    isDraggingActive,
    dragPointer,
    grabOffset,
    handlePointerDownWidget,
    handleStartPan,
    zoomIn,
    zoomOut,
    hoveredTargetId,
    isPressingSource,
  } = useTabletopEngine({
    tableWidth: game.table.width,
    tableHeight: game.table.height,
    widgets: game.widgets,
    currentSeatIndex: activeSeat?.index,
    handHolderId: handHolder?.id,
    canDraw: !isSpectator,
    onMoveWidget: (id, x, y) => dispatch({ type: 'MOVE_WIDGET', payload: { id, x, y } }),
    onSnapToHolder: (widgetId, holderId) =>
      dispatch({ type: 'SNAP_TO_HOLDER', payload: { widgetId, holderId } }),
    onDoubleClickWidget: (cardId) => dispatch({ type: 'FLIP_CARD', payload: { cardId } }),
    onDrawCardAt: (deckId, x, y, cardId, faceUp) =>
      dispatch({ type: 'DRAW_CARD', payload: { deckId, position: { x, y }, cardId, faceUp } }),
    onDrawFromBag: (bagId, position, spawnedId) =>
      dispatch({ type: 'DRAW_FROM_BAG', payload: { bagId, position, spawnedId } }),
    onShake: dispatch,
    onLongPressRelease: (widgetId, mouseX, mouseY) =>
      setContextMenuPos({ mouseX, mouseY, widgetId }),
  });
  const trackHover = useTableKeyShortcuts(game.widgets, activeDragId, dispatch);

  const visibleIds = useViewportCulling(
    game.widgets,
    transform,
    containerSize.width,
    containerSize.height,
  );

  const boardHolders = useMemo(
    () => filterBoardHolders(game.widgets, visibleIds, isTvMode),
    [game.widgets, visibleIds, isTvMode],
  );

  const boardWidgets = useMemo(
    () => filterBoardWidgets(game.widgets, visibleIds, isTvMode),
    [game.widgets, visibleIds, isTvMode],
  );

  const obscuredIds = useObscuredWidgetIds(game, activeSeat?.index);
  const fitToScreen = useFitToScreen(containerRef, game.table, setTransform, setContainerSize);

  const onPointerDownBoardWidget = (e: React.PointerEvent, w: TabletopWidget) => {
    if (isSpectator) return; // bubbles up to the board pan
    if (!selection.handleWidgetClick(w.id, e.shiftKey)) handlePointerDownWidget(e, w);
  };

  const handleAddHiddenZone = useAddHiddenZone(game.table, activeSeat, dispatch);

  return (
    <Box
      ref={containerRef}
      onPointerDown={handleStartPan}
      onPointerOver={trackHover}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
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
          backgroundImage: game.table.backgroundImageUrl
            ? `url(${game.table.backgroundImageUrl})`
            : undefined,
          backgroundSize: 'cover',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          borderRadius: 5,
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
              if (isSpectator) return;
              // Touch long press on a deck/bag picks it up; its menu opens on release.
              if (isPressingSource()) return;
              setContextMenuPos({ mouseX: e.clientX, mouseY: e.clientY, widgetId: w.id });
            }}
            dispatch={dispatch}
            obscured={obscuredIds.has(w.id)}
          />
        ))}
        <SelectionHighlightLayer
          selectedWidgetIds={selection.selectedWidgetIds}
          widgets={game.widgets}
        />
        <HiddenZoneLayer
          hiddenZones={game.hiddenZones}
          currentSeatIndex={activeSeat?.index}
          table={game.table}
          editMode={editMode}
          dispatch={dispatch}
        />
        <FlyingCardsLayer
          flyingCards={flyingCards}
          widgets={game.widgets}
          tableWidth={game.table.width}
          tableHeight={game.table.height}
          onFinishAnimation={(id) =>
            dispatch({ type: 'FINISH_ANIMATION', payload: { animationId: id } })
          }
        />
      </Box>

      <SelectionFloatingBar
        selectedCount={selection.selectedWidgetIds.length}
        onScaleUp={() => selection.scaleSelected(1.25)}
        onScaleDown={() => selection.scaleSelected(0.8)}
        onResetScale={selection.resetScaleSelected}
        onClearSelection={selection.clearSelection}
      />

      <SurfaceSeatControls
        seats={seats}
        widgets={game.widgets}
        currentSeatId={state.currentSeatId}
        dispatch={seatDispatch}
        hideSelector={isTvMode || hideSeatSelector}
      />

      {!isTvMode && (
        <TabletopToolbar
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={fitToScreen}
          onOpenRules={() => setRulesOpen(true)}
          hasRules={Boolean(game.ruleText)}
          isSelectionMode={selection.isSelectionMode}
          onToggleSelectionMode={isSpectator ? undefined : selection.toggleSelectionMode}
          onAddHiddenZone={isSpectator ? undefined : handleAddHiddenZone}
        />
      )}

      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} ruleText={game.ruleText} />

      <BoardDragOverlay
        widget={activeDragId && isDraggingActive ? game.widgets[activeDragId] : null}
        pointerPos={dragPointer}
        grabOffset={grabOffset}
        scale={transform.scale}
      />

      <SurfaceContextMenu
        position={contextMenuPos}
        widgets={game.widgets}
        selectedIds={selection.selectedWidgetIds}
        onToggleSelect={(id) => selection.handleWidgetClick(id, true)}
        onClose={() => setContextMenuPos(null)}
        dispatch={dispatch}
      />
    </Box>
  );
};
