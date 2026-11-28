import { createContext, useContext } from 'react';

/**
 * Whether the page around a component is the one on screen [ID: CTX-ROUTE-ACTIVE]
 *
 * A game with `keepAlive` (`GameDefinition`) stays mounted, hidden, while the user is elsewhere
 * in the app (`KeepAliveGames`). It keeps playing, but must leave the shared header, global
 * hotkeys and similar app-wide state to the page on screen while this is false.
 */
export const RouteActiveContext = createContext(true);

export const useRouteActive = (): boolean => useContext(RouteActiveContext);
