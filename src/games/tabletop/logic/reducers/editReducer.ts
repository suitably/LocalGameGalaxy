/**
 * Editor actions: patch, add and delete widgets, change the table [ID: LOGIC-TABLETOP-EDIT-REDUCER]
 */
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';
import { addWidgets, deleteWidgets, patchWidgets, updateTable } from '../widgetEdits';

export type EditAction = Extract<
  TabletopAction,
  { type: 'PATCH_WIDGETS' | 'ADD_WIDGET' | 'ADD_WIDGETS' | 'DELETE_WIDGETS' | 'UPDATE_TABLE' }
>;

export function editReducer(state: TabletopGameState, action: EditAction): TabletopGameState {
  const game = (() => {
    switch (action.type) {
      case 'PATCH_WIDGETS':
        return patchWidgets(state.game, action.payload.patches);
      case 'ADD_WIDGET':
        return addWidgets(state.game, [action.payload.widget]);
      case 'ADD_WIDGETS':
        return addWidgets(state.game, action.payload.widgets);
      case 'DELETE_WIDGETS':
        return deleteWidgets(state.game, action.payload.ids);
      case 'UPDATE_TABLE':
        return updateTable(state.game, action.payload.changes);
    }
  })();
  return game === state.game ? state : { ...state, game };
}
