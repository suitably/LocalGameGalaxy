import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export interface SettingsModeContextType {
    isSettingsMode: boolean;
    setIsSettingsMode: (active: boolean) => void;
    setSettingsMode: (active: boolean) => void;
}

export const SettingsModeContext = createContext<SettingsModeContextType | undefined>(undefined);

export const SettingsModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSettingsMode, setIsSettingsModeState] = useState<boolean>(false);

    const setIsSettingsMode = useCallback((active: boolean) => {
        setIsSettingsModeState(prev => (prev === active ? prev : active));
    }, []);

    const value = useMemo<SettingsModeContextType>(
        () => ({
            isSettingsMode,
            setIsSettingsMode,
            setSettingsMode: setIsSettingsMode,
        }),
        [isSettingsMode, setIsSettingsMode]
    );

    return (
        <SettingsModeContext.Provider value={value}>
            {children}
        </SettingsModeContext.Provider>
    );
};

export const useSettingsMode = (): SettingsModeContextType => {
    const context = useContext(SettingsModeContext);
    if (!context) {
        throw new Error('useSettingsMode must be used within a SettingsModeProvider');
    }
    return context;
};
