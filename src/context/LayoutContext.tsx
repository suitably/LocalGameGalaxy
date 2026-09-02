import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

export interface MenuItem {
    label: string;
    icon?: ReactNode;
    action: () => void;
    disabled?: boolean;
    showAlways?: boolean;
}

interface LayoutContextType {
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
    setHeader: (title: string | null, items?: MenuItem[], homeAction?: (() => void) | null, customHeaderTitle?: ReactNode) => void;
    customHeaderActions: ReactNode;
    setCustomHeaderActions: (node: ReactNode) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitleState] = useState<string | null>(null);
    const [customHeaderTitle, setCustomHeaderTitleState] = useState<ReactNode>(null);
    const [headerHidden, setHeaderHiddenState] = useState<boolean>(false);
    const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
    const [homeAction, setHomeActionState] = useState<(() => void) | null>(null);
    const [customHeaderActions, setCustomHeaderActionsState] = useState<ReactNode>(null);

    const setHeader = useCallback((newTitle: string | null, newItems: MenuItem[] = [], newHomeAction: (() => void) | null = null, newCustomHeaderTitle: ReactNode = null) => {
        setTitleState(prev => prev === newTitle ? prev : newTitle);
        setMenuItemsState(prev => {
            if (prev.length === newItems.length && prev.every((item, i) => item.label === newItems[i]?.label && item.disabled === newItems[i]?.disabled)) {
                return prev;
            }
            return newItems;
        });
        setHomeActionState(() => newHomeAction);
        setCustomHeaderTitleState(prev => prev === newCustomHeaderTitle ? prev : newCustomHeaderTitle);
    }, []);

    const setTitle = useCallback((newTitle: string | null) => {
        setTitleState(prev => prev === newTitle ? prev : newTitle);
    }, []);

    const setCustomHeaderTitle = useCallback((node: ReactNode) => {
        setCustomHeaderTitleState(prev => prev === node ? prev : node);
    }, []);

    const setHeaderHidden = useCallback((hidden: boolean) => {
        setHeaderHiddenState(prev => prev === hidden ? prev : hidden);
    }, []);

    const setMenuItems = useCallback((newItems: MenuItem[]) => {
        setMenuItemsState(prev => {
            if (prev.length === newItems.length && prev.every((item, i) => item.label === newItems[i]?.label && item.disabled === newItems[i]?.disabled)) {
                return prev;
            }
            return newItems;
        });
    }, []);

    const setHomeAction = useCallback((action: (() => void) | null) => {
        setHomeActionState(() => action);
    }, []);

    const setCustomHeaderActions = useCallback((node: ReactNode) => {
        setCustomHeaderActionsState(prev => prev === node ? prev : node);
    }, []);

    const value = useMemo(() => ({
        title, setTitle, customHeaderTitle, setCustomHeaderTitle, headerHidden, setHeaderHidden, menuItems, setMenuItems, homeAction, setHomeAction, setHeader,
        customHeaderActions, setCustomHeaderActions
    }), [title, setTitle, customHeaderTitle, setCustomHeaderTitle, headerHidden, setHeaderHidden, menuItems, setMenuItems, homeAction, setHomeAction, setHeader, customHeaderActions, setCustomHeaderActions]);

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};

// Hook for components to register their header configuration
export const useHeader = (title: string, items: MenuItem[] = []) => {
    const { setHeader } = useLayout();
    // Stable dependency: serialize item labels to avoid spreading dynamic arrays
    const itemLabels = JSON.stringify(items.map(i => i.label));

    useEffect(() => {
        setHeader(title, items);
        return () => {
            // Reset header on unmount to prevent stale state
            setHeader(null, []);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, setHeader, itemLabels]);
};
