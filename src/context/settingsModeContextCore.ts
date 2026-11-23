import { createContext, useContext } from 'react';

export interface SettingsModeContextType {
    isSettingsMode: boolean;
    setIsSettingsMode: (active: boolean) => void;
    setSettingsMode: (active: boolean) => void;
}

export const SettingsModeContext = createContext<SettingsModeContextType | undefined>(undefined);

export const useSettingsMode = (): SettingsModeContextType => {
    const context = useContext(SettingsModeContext);
    if (!context) {
        throw new Error('useSettingsMode must be used within a SettingsModeProvider');
    }
    return context;
};
