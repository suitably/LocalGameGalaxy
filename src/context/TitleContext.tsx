import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';

export interface TitleContextType {
    title: string | null;
    setTitle: (title: string | null) => void;
    pageTitle: string | null;
    setPageTitle: (title: string | null) => void;
}

export const TitleContext = createContext<TitleContextType | undefined>(undefined);

export const TitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitleState] = useState<string | null>(null);

    const setTitle = useCallback((newTitle: string | null) => {
        setTitleState(prev => (prev === newTitle ? prev : newTitle));
    }, []);

    const value = useMemo<TitleContextType>(
        () => ({
            title,
            setTitle,
            pageTitle: title,
            setPageTitle: setTitle,
        }),
        [title, setTitle]
    );

    return (
        <TitleContext.Provider value={value}>
            {children}
        </TitleContext.Provider>
    );
};

export const useTitle = (): TitleContextType => {
    const context = useContext(TitleContext);
    if (!context) {
        throw new Error('useTitle must be used within a TitleProvider');
    }
    return context;
};

// Hook to set page title on mount and clear on unmount
export const usePageTitle = (title: string) => {
    const { setTitle } = useTitle();

    useEffect(() => {
        setTitle(title);
        return () => setTitle(null);
    }, [title, setTitle]);
};
