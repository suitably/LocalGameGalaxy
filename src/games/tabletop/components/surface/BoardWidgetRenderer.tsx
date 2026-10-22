/**
 * Presenter component for individual tabletop board widgets [ID: GAME-TABLETOP-BOARD-WIDGET-RENDERER]
 */
import React from 'react';
import { Box } from '@mui/material';
import type {
  BagWidget,
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

interface BoardWidgetRendererProps {
  widget: TabletopWidget;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  dispatch: React.Dispatch<TabletopAction>;
}

export const BoardWidgetRenderer: React.FC<BoardWidgetRendererProps> = ({
  widget: w,
  isDragging,
  onPointerDown,
  onContextMenu,
  dispatch,
}) => {
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
          default:
            return null;
        }
      })()}
    </Box>
  );
};
