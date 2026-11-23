import React, { useContext, type ReactNode } from 'react';
import { TitleProvider } from './TitleContext';
import { TitleContext } from './titleContextCore';
import { HeaderLayoutProvider } from './HeaderLayoutContext';
import { HeaderLayoutContext } from './headerLayoutContextCore';
import { SettingsModeProvider } from './SettingsModeContext';
import { SettingsModeContext } from './settingsModeContextCore';

const OptionalSettingsModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const existing = useContext(SettingsModeContext);
    if (existing) {
        return <>{children}</>;
    }
    return <SettingsModeProvider>{children}</SettingsModeProvider>;
};

const OptionalTitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const existing = useContext(TitleContext);
    if (existing) {
        return <>{children}</>;
    }
    return <TitleProvider>{children}</TitleProvider>;
};

const OptionalHeaderLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const existing = useContext(HeaderLayoutContext);
    if (existing) {
        return <>{children}</>;
    }
    return <HeaderLayoutProvider>{children}</HeaderLayoutProvider>;
};

/**
 * Composite provider wrapping SettingsModeProvider, TitleProvider, and HeaderLayoutProvider.
 */
export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <OptionalSettingsModeProvider>
            <OptionalTitleProvider>
                <OptionalHeaderLayoutProvider>
                    {children}
                </OptionalHeaderLayoutProvider>
            </OptionalTitleProvider>
        </OptionalSettingsModeProvider>
    );
};
