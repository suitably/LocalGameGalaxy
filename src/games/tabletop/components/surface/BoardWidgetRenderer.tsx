/**
 * Presenter component for individual tabletop board widgets [ID: GAME-TABLETOP-BOARD-WIDGET-RENDERER]
 */
import React from 'react';
import { Box } from '@mui/material';
import type {
  BagWidget,
  ButtonWidget,
  LabelWidget,
  SpinnerWidget,
  TimerWidget,
  TabletopWidget,
  CardWidget,
  DeckWidget,
  TokenWidget,
  CounterWidget,
  DieWidget,
} from '../../logic/types';
import type { TabletopAction } from '../../logic/tabletopReducer';
import { CardWidgetView } from '../widgets/CardWidgetView';
import { DeckWidgetView } from '../widgets/DeckWidgetView';
import { TokenWidgetView } from '../widgets/TokenWidgetView';
import { CounterWidgetView } from '../widgets/CounterWidgetView';
import { DieWidgetView } from '../widgets/DieWidgetView';
import { BagWidgetView } from '../widgets/BagWidgetView';
import { LabelWidgetView } from '../widgets/LabelWidgetView';
import { TimerWidgetView } from '../widgets/TimerWidgetView';
import { SpinnerWidgetView } from '../widgets/SpinnerWidgetView';
import { ButtonWidgetView } from '../widgets/ButtonWidgetView';

interface BoardWidgetRendererProps {
  widget: TabletopWidget;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  dispatch: React.Dispatch<TabletopAction>;
  /** Inside a hidden zone the viewer may not see: render an inert placeholder only. */
  obscured?: boolean;
}

export const BoardWidgetRenderer: React.FC<BoardWidgetRendererProps> = ({
  widget: w,
  isDragging,
  onPointerDown,
  onContextMenu,
  dispatch,
  obscured = false,
}) => {
  if (obscured) {
    return (
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: w.x,
          top: w.y,
          width: w.width,
          height: w.height,
          zIndex: w.zIndex,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          opacity: 0.95,
          userSelect: 'none',
        }}
      />
    );
  }
  return (
    <Box
      data-widget-id={w.id}
      data-widget-wrapper
      onContextMenu={onContextMenu}
      sx={{ display: 'contents' }}
    >
      {(() => {
        switch (w.type) {
          case 'card':
            return (
              <CardWidgetView
                widget={w as CardWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onDoubleClick={() => dispatch({ type: 'FLIP_CARD', payload: { cardId: w.id } })}
              />
            );
          case 'deck':
            return (
              <DeckWidgetView
                widget={w as DeckWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onDraw={() => dispatch({ type: 'DRAW_CARD', payload: { deckId: w.id } })}
                onShuffle={() => dispatch({ type: 'SHUFFLE_DECK', payload: { deckId: w.id } })}
              />
            );
          case 'token':
            return (
              <TokenWidgetView
                widget={w as TokenWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onDoubleClick={() => dispatch({ type: 'NEXT_STATE', payload: { widgetId: w.id } })}
              />
            );
          case 'counter':
            return (
              <CounterWidgetView
                widget={w as CounterWidget}
                onIncrement={() =>
                  dispatch({
                    type: 'UPDATE_COUNTER',
                    payload: { counterId: w.id, delta: w.step || 1 },
                  })
                }
                onDecrement={() =>
                  dispatch({
                    type: 'UPDATE_COUNTER',
                    payload: { counterId: w.id, delta: -(w.step || 1) },
                  })
                }
              />
            );
          case 'die':
            return (
              <DieWidgetView
                widget={w as DieWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onRoll={() => dispatch({ type: 'ROLL_DIE', payload: { dieId: w.id } })}
              />
            );
          case 'bag':
            return (
              <BagWidgetView
                widget={w as BagWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onDraw={() => dispatch({ type: 'DRAW_FROM_BAG', payload: { bagId: w.id } })}
              />
            );
          case 'label':
            return (
              <LabelWidgetView
                widget={w as LabelWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
              />
            );
          case 'timer':
            return (
              <TimerWidgetView
                widget={w as TimerWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onToggle={() =>
                  dispatch({ type: 'TOGGLE_TIMER', payload: { timerId: w.id, now: Date.now() } })
                }
                onReset={() => dispatch({ type: 'RESET_TIMER', payload: { timerId: w.id } })}
              />
            );
          case 'spinner':
            return (
              <SpinnerWidgetView
                widget={w as SpinnerWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onSpin={() => dispatch({ type: 'SPIN_SPINNER', payload: { spinnerId: w.id } })}
              />
            );
          case 'button':
            return (
              <ButtonWidgetView
                widget={w as ButtonWidget}
                isDragging={isDragging}
                onPointerDown={onPointerDown}
                onRun={() =>
                  dispatch({ type: 'RUN_ROUTINE', payload: { buttonId: w.id, now: Date.now() } })
                }
              />
            );
          default:
            return null;
        }
      })()}
    </Box>
  );
};
