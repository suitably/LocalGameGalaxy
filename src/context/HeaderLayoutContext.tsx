import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export interface MenuItem {
    label: string;
    icon?: ReactNode;
    action: () => void;
    disabled?: boolean;
    showAlways?: boolean;
}

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
        setHeaderHiddenState(prev => (prev === hidden ? prev : hidden));
    }, []);

    const setCustomHeaderTitle = useCallback((node: ReactNode) => {
        setCustomHeaderTitleState(prev => (prev === node ? prev : node));
    }, []);

    const setCustomHeaderActions = useCallback((node: ReactNode) => {
        setCustomHeaderActionsState(prev => (prev === node ? prev : node));
    }, []);

    const setMenuItems = useCallback((newItems: MenuItem[]) => {
        setMenuItemsState(prev => {
            if (
                prev.length === newItems.length &&
                prev.every(
                    (item, i) =>
                        item.label === newItems[i]?.label &&
                        item.disabled === newItems[i]?.disabled &&
                        item.showAlways === newItems[i]?.showAlways
                )
            ) {
                return prev;
            }
            return newItems;
        });
    }, []);

    const setHomeAction = useCallback((action: (() => void) | null) => {
        setHomeActionState(() => action);
    }, []);

    const setHideHome = useCallback((hide: boolean) => {
        setHideHomeState(prev => (prev === hide ? prev : hide));
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
        ]
    );

    return (
        <HeaderLayoutContext.Provider value={value}>
            {children}
        </HeaderLayoutContext.Provider>
    );
};

export const useHeaderLayout = (): HeaderLayoutContextType => {
    const context = useContext(HeaderLayoutContext);
    if (!context) {
        throw new Error('useHeaderLayout must be used within a HeaderLayoutProvider');
    }
    return context;
};
