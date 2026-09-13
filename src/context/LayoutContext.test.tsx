import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { TitleProvider, useTitle } from './TitleContext';
import { HeaderLayoutProvider, useHeaderLayout } from './HeaderLayoutContext';
import { SettingsModeProvider, useSettingsMode } from './SettingsModeContext';
import { LayoutProvider, useLayout, useLayoutContext } from './LayoutContext';

describe('LayoutContext Split Contexts', () => {
    describe('TitleContext', () => {
        it('throws error when useTitle is used outside TitleProvider', () => {
            const Consumer = () => { useTitle(); return null; };
            expect(() => renderToString(<Consumer />)).toThrow('useTitle must be used within a TitleProvider');
        });

        it('provides initial title and pageTitle alias as null', () => {
            const Consumer = () => {
                const { title, pageTitle, setTitle, setPageTitle } = useTitle();
                return <div data-title={title ?? 'null'} data-page-title={pageTitle ?? 'null'} data-fn={String(typeof setTitle === 'function' && typeof setPageTitle === 'function')} />;
            };
            const html = renderToString(<TitleProvider><Consumer /></TitleProvider>);
            expect(html).toContain('data-title="null"');
            expect(html).toContain('data-page-title="null"');
            expect(html).toContain('data-fn="true"');
        });

        it('segregates title from header and settings mode state', () => {
            const Consumer = () => {
                const ctx = useTitle() as unknown as Record<string, unknown>;
                return <div data-isolated={String(ctx.headerHidden === undefined && ctx.isSettingsMode === undefined && ctx.menuItems === undefined)} />;
            };
            const html = renderToString(<TitleProvider><Consumer /></TitleProvider>);
            expect(html).toContain('data-isolated="true"');
        });
    });

    describe('HeaderLayoutContext', () => {
        it('throws error when useHeaderLayout is used outside HeaderLayoutProvider', () => {
            const Consumer = () => { useHeaderLayout(); return null; };
            expect(() => renderToString(<Consumer />)).toThrow('useHeaderLayout must be used within a HeaderLayoutProvider');
        });

        it('provides initial layout defaults', () => {
            const Consumer = () => {
                const { headerHidden, menuItems, homeAction, hideHome, setHeaderHidden, setMenuItems } = useHeaderLayout();
                return (
                    <div
                        data-header-hidden={String(headerHidden)}
                        data-menu-count={String(menuItems.length)}
                        data-home-action={String(homeAction !== null)}
                        data-hide-home={String(hideHome)}
                        data-fns={String(typeof setHeaderHidden === 'function' && typeof setMenuItems === 'function')}
                    />
                );
            };
            const html = renderToString(<HeaderLayoutProvider><Consumer /></HeaderLayoutProvider>);
            expect(html).toContain('data-header-hidden="false"');
            expect(html).toContain('data-menu-count="0"');
            expect(html).toContain('data-home-action="false"');
            expect(html).toContain('data-hide-home="false"');
            expect(html).toContain('data-fns="true"');
        });

        it('segregates header layout from title and settings mode state', () => {
            const Consumer = () => {
                const ctx = useHeaderLayout() as unknown as Record<string, unknown>;
                return <div data-isolated={String(ctx.title === undefined && ctx.pageTitle === undefined && ctx.isSettingsMode === undefined)} />;
            };
            const html = renderToString(<HeaderLayoutProvider><Consumer /></HeaderLayoutProvider>);
            expect(html).toContain('data-isolated="true"');
        });
    });

    describe('SettingsModeContext', () => {
        it('throws error when useSettingsMode is used outside SettingsModeProvider', () => {
            const Consumer = () => { useSettingsMode(); return null; };
            expect(() => renderToString(<Consumer />)).toThrow('useSettingsMode must be used within a SettingsModeProvider');
        });

        it('provides initial settings mode default as false', () => {
            const Consumer = () => {
                const { isSettingsMode, setIsSettingsMode, setSettingsMode } = useSettingsMode();
                return <div data-settings-mode={String(isSettingsMode)} data-fns={String(typeof setIsSettingsMode === 'function' && typeof setSettingsMode === 'function')} />;
            };
            const html = renderToString(<SettingsModeProvider><Consumer /></SettingsModeProvider>);
            expect(html).toContain('data-settings-mode="false"');
            expect(html).toContain('data-fns="true"');
        });

        it('segregates settings mode from title and header state', () => {
            const Consumer = () => {
                const ctx = useSettingsMode() as unknown as Record<string, unknown>;
                return <div data-isolated={String(ctx.title === undefined && ctx.headerHidden === undefined)} />;
            };
            const html = renderToString(<SettingsModeProvider><Consumer /></SettingsModeProvider>);
            expect(html).toContain('data-isolated="true"');
        });
    });

    describe('LayoutContext composite facade', () => {
        it('provides all sub-context properties via useLayout facade', () => {
            const Consumer = () => {
                const { title, headerHidden, isSettingsMode, menuItems, setHeader, setTitle, setHeaderHidden, setIsSettingsMode } = useLayout();
                return (
                    <div
                        data-title={title ?? 'null'}
                        data-header-hidden={String(headerHidden)}
                        data-settings-mode={String(isSettingsMode)}
                        data-menu-count={String(menuItems.length)}
                        data-fns={String(typeof setHeader === 'function' && typeof setTitle === 'function' && typeof setHeaderHidden === 'function' && typeof setIsSettingsMode === 'function')}
                    />
                );
            };
            const html = renderToString(<LayoutProvider><Consumer /></LayoutProvider>);
            expect(html).toContain('data-title="null"');
            expect(html).toContain('data-header-hidden="false"');
            expect(html).toContain('data-settings-mode="false"');
            expect(html).toContain('data-menu-count="0"');
            expect(html).toContain('data-fns="true"');
        });

        it('useLayoutContext is an alias for useLayout', () => {
            expect(useLayoutContext).toBe(useLayout);
        });

        it('does not re-create inner TitleProvider if already mounted in parent', () => {
            const Consumer = () => {
                const titleContext = useTitle();
                const layoutContext = useLayout();
                return <div data-match={String(titleContext.title === layoutContext.title)} />;
            };
            const html = renderToString(
                <TitleProvider>
                    <LayoutProvider>
                        <Consumer />
                    </LayoutProvider>
                </TitleProvider>
            );
            expect(html).toContain('data-match="true"');
        });
    });
});
