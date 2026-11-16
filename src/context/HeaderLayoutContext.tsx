import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { commitMenuItems, type MenuItem } from './headerMenuItems';

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

export const HeaderLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [headerHidden, setHeaderHiddenState] = useState<boolean>(false);
  const [customHeaderTitle, setCustomHeaderTitleState] = useState<ReactNode>(null);
  const [customHeaderActions, setCustomHeaderActionsState] = useState<ReactNode>(null);
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
  const [homeAction, setHomeActionState] = useState<(() => void) | null>(null);
  const [hideHome, setHideHomeState] = useState<boolean>(false);

  const setHeaderHidden = useCallback((hidden: boolean) => {
    setHeaderHiddenState((prev) => (prev === hidden ? prev : hidden));
  }, []);

  const setCustomHeaderTitle = useCallback((node: ReactNode) => {
    setCustomHeaderTitleState((prev) => (prev === node ? prev : node));
  }, []);

  // Identity check only: a new element (with new handler props) always replaces the old one,
  // so these handlers cannot go stale. Set it from effects with stable deps.
  const setCustomHeaderActions = useCallback((node: ReactNode) => {
    setCustomHeaderActionsState((prev) => (prev === node ? prev : node));
  }, []);

  // Latest items as passed by the caller; the rendered items call their actions through it,
  // so a list that looks the same keeps its state (no render loop) but never a stale action.
  // See commitMenuItems for the full reasoning.
  const latestMenuItemsRef = useRef<MenuItem[]>([]);
  const setMenuItems = useCallback((newItems: MenuItem[]) => {
    setMenuItemsState(commitMenuItems(latestMenuItemsRef, newItems));
  }, []);

  // Always stores the new function (no comparison), so it cannot go stale. Callers set it
  // from effects with stable deps; an inline arrow set on every render would loop.
  const setHomeAction = useCallback((action: (() => void) | null) => {
    setHomeActionState(() => action);
  }, []);

  const setHideHome = useCallback((hide: boolean) => {
    setHideHomeState((prev) => (prev === hide ? prev : hide));
  }, []);

  const value = useMemo<HeaderLayoutContextType>(
    () => ({
      headerHidden,
      setHeaderHidden,
      customHeaderTitle,
      setCustomHeaderTitle,
      customHeaderActions,
      setCustomHeaderActions,
      menuItems,
      setMenuItems,
      homeAction,
      setHomeAction,
      hideHome,
      setHideHome,
    }),
    [
      headerHidden,
      setHeaderHidden,
      customHeaderTitle,
      setCustomHeaderTitle,
      customHeaderActions,
      setCustomHeaderActions,
      menuItems,
      setMenuItems,
      homeAction,
      setHomeAction,
      hideHome,
      setHideHome,
    ],
  );

  return <HeaderLayoutContext.Provider value={value}>{children}</HeaderLayoutContext.Provider>;
};

export const useHeaderLayout = (): HeaderLayoutContextType => {
  const context = useContext(HeaderLayoutContext);
  if (!context) {
    throw new Error('useHeaderLayout must be used within a HeaderLayoutProvider');
  }
  return context;
};
