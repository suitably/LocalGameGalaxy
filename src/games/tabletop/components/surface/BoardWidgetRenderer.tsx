/**
 * Presenter component for individual tabletop board widgets [ID: GAME-TABLETOP-BOARD-WIDGET-RENDERER]
 *
 * Memoised (#684): the handlers take the widget, so the parent passes the same functions to every
 * widget and only changed widgets re-render during a drag.
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
import { useTouchLongPress } from '../../hooks/useTouchLongPress';
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
import { ObscuredPlaceholder } from './ObscuredPlaceholder';

const CONTENTS_SX = { display: 'contents' } as const;
const LIFTED_SX = { display: 'contents', '& > *': { opacity: 0 } } as const;

export type BoardContextMenuEvent = Pick<
  React.MouseEvent,
  'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation'
>;

interface BoardWidgetRendererProps {
  widget: TabletopWidget;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, widget: TabletopWidget) => void;
  /** Right click, native long press, or the touch long-press fallback (iOS sends no contextmenu). */
  onContextMenu: (e: BoardContextMenuEvent, widget: TabletopWidget) => void;
  dispatch: React.Dispatch<TabletopAction>;
  /** Inside a hidden zone the viewer may not see: render an inert placeholder only. */
  obscured?: boolean;
  /**
   * Lifted and drawn by the drag overlay: transparent, but still hit-testable, so a touch pointer
   * keeps its implicit capture on it (`visibility: hidden` lost it).
   */
  hidden?: boolean;
}

export const BoardWidgetRenderer = React.memo(function BoardWidgetRenderer({
  widget: w,
  isDragging,
  onPointerDown: onPointerDownWidget,
  onContextMenu: onContextMenuWidget,
  dispatch,
  obscured = false,
  hidden = false,
}: BoardWidgetRendererProps) {
  const onPointerDown = (e: React.PointerEvent) => onPointerDownWidget(e, w);
  const onContextMenu = (e: BoardContextMenuEvent) => onContextMenuWidget(e, w);
  const longPress = useTouchLongPress(({ clientX, clientY }) =>
    onContextMenu({ clientX, clientY, preventDefault: () => {}, stopPropagation: () => {} }),
  );
  if (obscured) {
    return (
      <ObscuredPlaceholder
        sx={{
          position: 'absolute',
          left: w.x,
          top: w.y,
          width: w.width,
          height: w.height,
          zIndex: w.zIndex,
        }}
      />
    );
  }
  return (
    <Box
      data-widget-id={w.id}
      data-widget-wrapper
      data-dragging={isDragging || undefined}
      onContextMenu={onContextMenu}
      {...longPress}
      sx={hidden ? LIFTED_SX : CONTENTS_SX}
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
});
