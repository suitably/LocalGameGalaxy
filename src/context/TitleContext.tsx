import React, { useState, useCallback, useMemo, type ReactNode } from 'react';
import { TitleContext, type TitleContextType } from './titleContextCore';

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
