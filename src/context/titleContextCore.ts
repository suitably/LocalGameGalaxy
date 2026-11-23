import { createContext, useContext, useEffect } from 'react';

export interface TitleContextType {
    title: string | null;
    setTitle: (title: string | null) => void;
    pageTitle: string | null;
    setPageTitle: (title: string | null) => void;
}

export const TitleContext = createContext<TitleContextType | undefined>(undefined);

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
