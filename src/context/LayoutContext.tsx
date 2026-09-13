import React, { useContext, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { TitleContext, TitleProvider, useTitle, usePageTitle, type TitleContextType } from './TitleContext';
import {
    HeaderLayoutContext,
    HeaderLayoutProvider,
    useHeaderLayout,
    type HeaderLayoutContextType,
    type MenuItem,
} from './HeaderLayoutContext';
import {
    SettingsModeContext,
    SettingsModeProvider,
    useSettingsMode,
    type SettingsModeContextType,
} from './SettingsModeContext';

export type { MenuItem, HeaderLayoutContextType, SettingsModeContextType, TitleContextType };
export { useHeaderLayout, HeaderLayoutProvider, useSettingsMode, SettingsModeProvider, useTitle, usePageTitle, TitleProvider };

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
        hideHome?: boolean
    ) => void;
    customHeaderActions: ReactNode;
    setCustomHeaderActions: (node: ReactNode) => void;
    isSettingsMode: boolean;
    setIsSettingsMode: (active: boolean) => void;
}

const OptionalSettingsModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const existing = useContext(SettingsModeContext);
    if (existing) {
        return <>{children}</>;
    }
    return <SettingsModeProvider>{children}</SettingsModeProvider>;
};

const OptionalTitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const existing = useContext(TitleContext);
    if (existing) {
        return <>{children}</>;
    }
    return <TitleProvider>{children}</TitleProvider>;
};

const OptionalHeaderLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const existing = useContext(HeaderLayoutContext);
    if (existing) {
        return <>{children}</>;
    }
    return <HeaderLayoutProvider>{children}</HeaderLayoutProvider>;
};

/**
 * Composite provider wrapping SettingsModeProvider, TitleProvider, and HeaderLayoutProvider.
 */
export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <OptionalSettingsModeProvider>
            <OptionalTitleProvider>
                <OptionalHeaderLayoutProvider>
                    {children}
                </OptionalHeaderLayoutProvider>
            </OptionalTitleProvider>
        </OptionalSettingsModeProvider>
    );
};

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
            newHideHome: boolean = false
        ) => {
            setTitle(newTitle);
            setMenuItems(newItems);
            setHomeAction(newHomeAction);
            setCustomHeaderTitle(newCustomHeaderTitle);
            setIsSettingsMode(newIsSettingsMode);
            setHideHome(newHideHome);
        },
        [setTitle, setMenuItems, setHomeAction, setCustomHeaderTitle, setIsSettingsMode, setHideHome]
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
        ]
    );
};

export const useLayoutContext = useLayout;

// Hook for components to register their header configuration
export const useHeader = (title: string, items: MenuItem[] = []) => {
    const { setHeader } = useLayout();
    const itemLabels = JSON.stringify(items.map(i => i.label));

    useEffect(() => {
        setHeader(title, items);
        return () => {
            setHeader(null, []);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, setHeader, itemLabels]);
};
