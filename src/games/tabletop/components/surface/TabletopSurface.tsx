import React, { useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Paper, Tooltip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import type { TabletopGameState, TabletopAction } from '../../logic/tabletopReducer';
import type { CardWidget, DeckWidget, HolderWidget, TokenWidget, CounterWidget, DieWidget, TabletopWidget } from '../../logic/types';
import { useTabletopEngine } from '../../hooks/useTabletopEngine';
import { CardWidgetView } from '../widgets/CardWidgetView';
import { DeckWidgetView } from '../widgets/DeckWidgetView';
import { HolderWidgetView } from '../widgets/HolderWidgetView';
import { TokenWidgetView } from '../widgets/TokenWidgetView';
import { CounterWidgetView } from '../widgets/CounterWidgetView';
import { DieWidgetView } from '../widgets/DieWidgetView';
import { PlayingCardFace } from '../widgets/PlayingCardFace';

interface TabletopSurfaceProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  isTvMode?: boolean;
}

export const TabletopSurface: React.FC<TabletopSurfaceProps> = ({
  state,
  dispatch,
  isTvMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { game, flyingCards } = state;

  const {
    transform,
    setTransform,
    activeDragId,
    handlePointerDownWidget,
    handlePointerMove,
    handlePointerUp,
    handleStartPan,
    zoomIn,
    zoomOut,
  } = useTabletopEngine({
    tableWidth: game.table.width,
    tableHeight: game.table.height,
    widgets: game.widgets,
    onMoveWidget: (id, x, y) => dispatch({ type: 'MOVE_WIDGET', payload: { id, x, y } }),
    onSnapToHolder: (widgetId, holderId) => dispatch({ type: 'SNAP_TO_HOLDER', payload: { widgetId, holderId } }),
  });

  // Center and auto-fit to screen in both Local and TV mode
  const fitToScreen = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;
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
      {/* Pan/Zoom Table Canvas */}
      <Box
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
        {/* Render Holders first (background layer) */}
        {Object.values(game.widgets)
          .filter((w) => w.type === 'holder')
          .map((w) => (
            <HolderWidgetView key={w.id} widget={w as HolderWidget} />
          ))}

        {/* Render other widgets */}
        {Object.values(game.widgets)
          .filter((w) => w.type !== 'holder')
          .map((w: TabletopWidget) => {
            const isDragging = activeDragId === w.id;
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

        {/* Flying cards animation layer (Flick to TV) */}
        {flyingCards.map((f) => {
          const card = game.widgets[f.cardId] as CardWidget | undefined;
          const holder = game.widgets[f.targetHolderId];
          const targetX = holder ? holder.x + holder.width / 2 - 40 : game.table.width / 2;
          const targetY = holder ? holder.y + holder.height / 2 - 60 : game.table.height / 2;

          return (
            <Box
              key={f.id}
              onAnimationEnd={() => dispatch({ type: 'FINISH_ANIMATION', payload: { animationId: f.id } })}
              sx={{
                position: 'absolute',
                left: targetX,
                top: targetY,
                width: 80,
                height: 120,
                borderRadius: 2,
                boxShadow: 10,
                zIndex: 999,
                animation: 'flickFlyIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                '@keyframes flickFlyIn': {
                  '0%': { transform: 'translateY(800px) scale(0.5) rotate(15deg)', opacity: 0 },
                  '100%': { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
                },
                border: '1.5px solid rgba(0,0,0,0.2)',
                overflow: 'hidden',
                bgcolor: '#fff',
              }}
            >
              {card && (
                <PlayingCardFace
                  frontContent={card.frontContent}
                  backContent={card.backContent}
                  isFaceUp={true}
                  label={card.label}
                  width={80}
                  height={120}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Floating Zoom & TV Controls Toolbar */}
      {!isTvMode && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            borderRadius: 3,
            bgcolor: 'background.paper',
            p: 0.5,
            display: 'flex',
            gap: 0.5,
          }}
        >
          <Tooltip title="Vergrößern">
            <IconButton size="small" onClick={zoomIn}><ZoomInIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Verkleinern">
            <IconButton size="small" onClick={zoomOut}><ZoomOutIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Ansicht zurücksetzen">
            <IconButton size="small" onClick={fitToScreen}><RestartAltIcon /></IconButton>
          </Tooltip>
        </Paper>
      )}
    </Box>
  );
};
