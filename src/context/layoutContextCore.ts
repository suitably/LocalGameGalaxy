import { useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { useTitle } from './titleContextCore';
import { useHeaderLayout, type MenuItem } from './headerLayoutContextCore';
import { useSettingsMode } from './settingsModeContextCore';

export type { MenuItem };

export interface LayoutContextType {
  title: string | null;
  setTitle: (title: string | null) => void;
  customHeaderTitle: ReactNode;
  setCustomHeaderTitle: (node: ReactNode) => void;
  headerHidden: boolean;
  setHeaderHidden: (hidden: boolean) => void;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  homeAction: (() => void) | null;
  setHomeAction: (action: (() => void) | null) => void;
  hideHome: boolean;
  setHideHome: (hide: boolean) => void;
  setHeader: (
    title: string | null,
    items?: MenuItem[],
    homeAction?: (() => void) | null,
    customHeaderTitle?: ReactNode,
    isSettingsMode?: boolean,
    hideHome?: boolean,
  ) => void;
  customHeaderActions: ReactNode;
  setCustomHeaderActions: (node: ReactNode) => void;
  isSettingsMode: boolean;
  setIsSettingsMode: (active: boolean) => void;
}

/**
 * Backward-compatible facade hook combining Title, HeaderLayout, and SettingsMode contexts.
 * @deprecated Prefer focused hooks: `useTitle()` for title, `useHeaderLayout()` for header layout/actions, `useSettingsMode()` for settings mode.
 */
export const useLayout = (): LayoutContextType => {
  const { title, setTitle } = useTitle();
  const {
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
  } = useHeaderLayout();
  const { isSettingsMode, setIsSettingsMode } = useSettingsMode();

  const setHeader = useCallback(
    (
      newTitle: string | null,
      newItems: MenuItem[] = [],
      newHomeAction: (() => void) | null = null,
      newCustomHeaderTitle: ReactNode = null,
      newIsSettingsMode: boolean = false,
      newHideHome: boolean = false,
    ) => {
      setTitle(newTitle);
      setMenuItems(newItems);
      setHomeAction(newHomeAction);
      setCustomHeaderTitle(newCustomHeaderTitle);
      setIsSettingsMode(newIsSettingsMode);
      setHideHome(newHideHome);
    },
    [setTitle, setMenuItems, setHomeAction, setCustomHeaderTitle, setIsSettingsMode, setHideHome],
  );

  return useMemo<LayoutContextType>(
    () => ({
      title,
      setTitle,
      customHeaderTitle,
      setCustomHeaderTitle,
      headerHidden,
      setHeaderHidden,
      menuItems,
      setMenuItems,
      homeAction,
      setHomeAction,
      hideHome,
      setHideHome,
      setHeader,
      customHeaderActions,
      setCustomHeaderActions,
      isSettingsMode,
      setIsSettingsMode,
    }),
    [
      title,
      setTitle,
      customHeaderTitle,
      setCustomHeaderTitle,
      headerHidden,
      setHeaderHidden,
      menuItems,
      setMenuItems,
      homeAction,
      setHomeAction,
      hideHome,
      setHideHome,
      setHeader,
      customHeaderActions,
      setCustomHeaderActions,
      isSettingsMode,
      setIsSettingsMode,
    ],
  );
};

// Hook for components to register their header configuration
export const useHeader = (title: string, items: MenuItem[] = []) => {
  const { setHeader } = useLayout();

  useEffect(() => {
    setHeader(title, items);
    return () => {
      setHeader(null, []);
    };
  }, [title, setHeader, items]);
};
