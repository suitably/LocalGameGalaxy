/**
 * Widget scale, show-always and hidden zones [ID: LOGIC-TABLETOP-VIEW-REDUCER]
 */
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';
import { setZoneRectWithContents } from '../hiddenZoneLogic';

export type ViewAction = Extract<
  TabletopAction,
  {
    type:
      | 'SCALE_WIDGETS'
      | 'RESET_WIDGET_SCALE'
      | 'SET_WIDGET_SHOW_ALWAYS'
      | 'ADD_HIDDEN_ZONE'
      | 'UPDATE_HIDDEN_ZONE'
      | 'SET_HIDDEN_ZONE_RECT'
      | 'REMOVE_HIDDEN_ZONE'
      | 'TOGGLE_ZONE_REVEAL';
  }
>;

export function viewReducer(state: TabletopGameState, action: ViewAction): TabletopGameState {
  switch (action.type) {
    case 'SCALE_WIDGETS': {
      const { widgetIds, factor } = action.payload;
      if (!widgetIds || widgetIds.length === 0 || factor <= 0) return state;
      const widgets = { ...state.game.widgets };
      for (const id of widgetIds) {
        const w = widgets[id];
        if (!w || w.pinned) continue;
        const defaultW = w.defaultWidth ?? w.width;
        const defaultH = w.defaultHeight ?? w.height;
        const newW = Math.max(24, Math.min(1200, Math.round(w.width * factor)));
        const newH = Math.max(24, Math.min(1200, Math.round(w.height * factor)));
        const dx = Math.round((newW - w.width) / 2);
        const dy = Math.round((newH - w.height) / 2);
        widgets[id] = {
          ...w,
          width: newW,
          height: newH,
          x: w.x - dx,
          y: w.y - dy,
          defaultWidth: defaultW,
          defaultHeight: defaultH,
        };
      }
      return { ...state, game: { ...state.game, widgets } };
    }

    case 'RESET_WIDGET_SCALE': {
      const { widgetIds } = action.payload;
      if (!widgetIds || widgetIds.length === 0) return state;
      const widgets = { ...state.game.widgets };
      for (const id of widgetIds) {
        const w = widgets[id];
        if (!w || w.pinned) continue;
        if (w.defaultWidth && w.defaultHeight) {
          const dx = Math.round((w.defaultWidth - w.width) / 2);
          const dy = Math.round((w.defaultHeight - w.height) / 2);
          widgets[id] = {
            ...w,
            width: w.defaultWidth,
            height: w.defaultHeight,
            x: w.x - dx,
            y: w.y - dy,
          };
        }
      }
      return { ...state, game: { ...state.game, widgets } };
    }

    case 'SET_WIDGET_SHOW_ALWAYS': {
      const { widgetId, showAlways } = action.payload;
      const w = state.game.widgets[widgetId];
      if (!w) return state;
      return {
        ...state,
        game: {
          ...state.game,
          widgets: {
            ...state.game.widgets,
            [widgetId]: { ...w, showAlways },
          },
        },
      };
    }

    case 'ADD_HIDDEN_ZONE': {
      const { zone } = action.payload;
      const hiddenZones = { ...(state.game.hiddenZones || {}), [zone.id]: zone };
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    case 'UPDATE_HIDDEN_ZONE': {
      const { id, changes } = action.payload;
      const existing = state.game.hiddenZones?.[id];
      if (!existing) return state;
      const hiddenZones = {
        ...(state.game.hiddenZones || {}),
        [id]: { ...existing, ...changes },
      };
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    case 'SET_HIDDEN_ZONE_RECT': {
      const game = setZoneRectWithContents(state.game, action.payload.id, action.payload.rect);
      return game === state.game ? state : { ...state, game };
    }

    case 'REMOVE_HIDDEN_ZONE': {
      const { id } = action.payload;
      if (!state.game.hiddenZones || !state.game.hiddenZones[id]) return state;
      const hiddenZones = { ...state.game.hiddenZones };
      delete hiddenZones[id];
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }

    case 'TOGGLE_ZONE_REVEAL': {
      const { id } = action.payload;
      const existing = state.game.hiddenZones?.[id];
      if (!existing) return state;
      const hiddenZones = {
        ...(state.game.hiddenZones || {}),
        [id]: { ...existing, revealed: !existing.revealed },
      };
      return {
        ...state,
        game: {
          ...state.game,
          hiddenZones,
        },
      };
    }
  }
}
