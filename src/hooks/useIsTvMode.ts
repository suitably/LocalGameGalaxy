import { createContext, useContext } from 'react';

/**
 * True inside a TV view (#554). `TvThemeProvider` sets it; the routes and roles that pick a TV
 * view (Melodiq `/games/melodiq/tv`, tabletop `role=tv`) stay the inputs that render it.
 */
export const TvModeContext = createContext(false);

/** Whether the calling component renders on the TV (big screen, ~3 m away). */
export const useIsTvMode = () => useContext(TvModeContext);
