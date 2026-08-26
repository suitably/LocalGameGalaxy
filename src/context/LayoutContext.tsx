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
    menuItems: MenuItem[];
    setMenuItems: (items: MenuItem[]) => void;
    homeAction: (() => void) | null;
    setHomeAction: (action: (() => void) | null) => void;
    setHeader: (title: string | null, items?: MenuItem[], homeAction?: (() => void) | null) => void;
    customHeaderActions: ReactNode;
    setCustomHeaderActions: (node: ReactNode) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitleState] = useState<string | null>(null);
    const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
    const [homeAction, setHomeActionState] = useState<(() => void) | null>(null);
    const [customHeaderActions, setCustomHeaderActionsState] = useState<ReactNode>(null);

    const setHeader = useCallback((newTitle: string | null, newItems: MenuItem[] = [], newHomeAction: (() => void) | null = null) => {
        setTitleState(newTitle);
        setMenuItemsState(newItems);
        setHomeActionState(() => newHomeAction); // Use functional update to avoid invoking the action
    }, []);

    const setTitle = useCallback((newTitle: string | null) => {
        setTitleState(newTitle);
    }, []);

    const setMenuItems = useCallback((newItems: MenuItem[]) => {
        setMenuItemsState(newItems);
    }, []);

    const setHomeAction = useCallback((action: (() => void) | null) => {
        setHomeActionState(() => action);
    }, []);

    const setCustomHeaderActions = useCallback((node: ReactNode) => {
        setCustomHeaderActionsState(node);
    }, []);

    const value = useMemo(() => ({
        title, setTitle, menuItems, setMenuItems, homeAction, setHomeAction, setHeader,
        customHeaderActions, setCustomHeaderActions
    }), [title, setTitle, menuItems, setMenuItems, homeAction, setHomeAction, setHeader, customHeaderActions, setCustomHeaderActions]);

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
