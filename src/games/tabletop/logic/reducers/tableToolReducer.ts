/**
 * Timer and spinner actions [ID: LOGIC-TABLETOP-TABLE-TOOL-REDUCER]
 */
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';
import type { SpinnerWidget, TabletopWidget, TimerWidget } from '../types';
import { resetTimer, spinTo, toggleTimer } from '../tableTools';

export type TableToolAction = Extract<
  TabletopAction,
  { type: 'TOGGLE_TIMER' | 'RESET_TIMER' | 'SPIN_SPINNER' }
>;

const withWidget = (state: TabletopGameState, widget: TabletopWidget): TabletopGameState => ({
  ...state,
  game: { ...state.game, widgets: { ...state.game.widgets, [widget.id]: widget } },
});

export function tableToolReducer(
  state: TabletopGameState,
  action: TableToolAction,
): TabletopGameState {
  switch (action.type) {
    case 'TOGGLE_TIMER':
    case 'RESET_TIMER': {
      const w = state.game.widgets[action.payload.timerId];
      if (!w || w.type !== 'timer') return state;
      const timer = w as TimerWidget;
      return withWidget(
        state,
        action.type === 'TOGGLE_TIMER' ? toggleTimer(timer, action.payload.now) : resetTimer(timer),
      );
    }
    case 'SPIN_SPINNER': {
      const w = state.game.widgets[action.payload.spinnerId];
      if (!w || w.type !== 'spinner') return state;
      const spinner = w as SpinnerWidget;
      // The host decides the result for everyone (see syncProtocol).
      const index =
        action.payload.index ?? Math.floor(Math.random() * Math.max(1, spinner.options.length));
      return withWidget(state, spinTo(spinner, index));
    }
  }
}
