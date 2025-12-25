import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface TitleContextType {
    pageTitle: string | null;
    setPageTitle: (title: string | null) => void;
}

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export const TitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pageTitle, setPageTitle] = useState<string | null>(null);

    return (
        <TitleContext.Provider value={{ pageTitle, setPageTitle }}>
            {children}
        </TitleContext.Provider>
    );
};

export const useTitle = () => {
    const context = useContext(TitleContext);
    if (!context) {
        throw new Error('useTitle must be used within a TitleProvider');
    }
    return context;
};

// Hook to set page title on mount and clear on unmount
export const usePageTitle = (title: string) => {
    const { setPageTitle } = useTitle();

    React.useEffect(() => {
        setPageTitle(title);
        return () => setPageTitle(null);
    }, [title, setPageTitle]);
};
