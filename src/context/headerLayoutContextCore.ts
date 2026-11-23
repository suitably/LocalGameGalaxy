import { createContext, useContext, type ReactNode } from 'react';
import type { MenuItem } from './headerMenuItems';

export type { MenuItem };

export interface HeaderLayoutContextType {
  headerHidden: boolean;
  setHeaderHidden: (hidden: boolean) => void;
  customHeaderTitle: ReactNode;
  setCustomHeaderTitle: (node: ReactNode) => void;
  customHeaderActions: ReactNode;
  setCustomHeaderActions: (node: ReactNode) => void;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  homeAction: (() => void) | null;
  setHomeAction: (action: (() => void) | null) => void;
  hideHome: boolean;
  setHideHome: (hide: boolean) => void;
}

export const HeaderLayoutContext = createContext<HeaderLayoutContextType | undefined>(undefined);

export const useHeaderLayout = (): HeaderLayoutContextType => {
  const context = useContext(HeaderLayoutContext);
  if (!context) {
    throw new Error('useHeaderLayout must be used within a HeaderLayoutProvider');
  }
  return context;
};
