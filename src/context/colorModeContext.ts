import { createContext, useContext } from 'react';
import { DEFAULT_COLOR_MODE, type ColorModePreference } from '../lib/colorMode';

export interface ColorModeContextValue {
  /** The user's setting (DESIGN.md §9). */
  preference: ColorModePreference;
  setPreference: (preference: ColorModePreference) => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  preference: DEFAULT_COLOR_MODE,
  setPreference: () => {},
});

export const useColorModePreference = (): ColorModeContextValue => useContext(ColorModeContext);
