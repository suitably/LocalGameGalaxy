import React, { useState, useCallback, useMemo, type ReactNode } from 'react';
import { SettingsModeContext, type SettingsModeContextType } from './settingsModeContextCore';

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
