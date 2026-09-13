import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ServerDirectoryBrowser } from './ServerDirectoryBrowser';
import { ServerDirectoryManager } from './ServerDirectoryManager';
import { ServerUsdbConfig } from './ServerUsdbConfig';
import { ServerPreferences } from './ServerPreferences';
import { storage } from '../../lib/storage';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultVal?: string | Record<string, unknown>) => {
            if (typeof defaultVal === 'string') return defaultVal;
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

// Mock melodiqFetch from ../../games/melodiq
const mockMelodiqFetch = vi.fn();
vi.mock('../../games/melodiq', () => ({
    melodiqFetch: (...args: unknown[]) => mockMelodiqFetch(...args),
}));

describe('Server Config Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        storage.setHelperActive(true);
        storage.setHelperToken('test-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('ServerDirectoryBrowser', () => {
        it('renders dialog when open is true', () => {
            mockMelodiqFetch.mockResolvedValueOnce({
                current: '/home/music',
                dirs: ['..', 'Pop', 'Rock']
            });

            const html = renderToString(
                <ServerDirectoryBrowser
                    open={true}
                    disablePortal={true}
                    onClose={() => {}}
                    onSelect={() => {}}
                    initialPath="/home/music"
                />
            );

            expect(html).toContain('Select Server Directory');
            expect(html).toContain('Select This Directory');
        });

        it('does not render dialog content when open is false', () => {
            const html = renderToString(
                <ServerDirectoryBrowser
                    open={false}
                    onClose={() => {}}
                    onSelect={() => {}}
                />
            );

            expect(html).not.toContain('Select This Directory');
        });
    });

    describe('Visibility based on storage.isHelperActive()', () => {
        it('renders ServerDirectoryManager when helper is active', () => {
            storage.setHelperActive(true);
            const html = renderToString(<ServerDirectoryManager />);
            expect(html).toContain('Library Directories');
            expect(html).toContain('Download Directory');
        });

        it('renders null for ServerDirectoryManager when helper is inactive', () => {
            storage.setHelperActive(false);
            const html = renderToString(<ServerDirectoryManager />);
            expect(html).toBe('');
        });

        it('renders ServerUsdbConfig when helper is active', () => {
            storage.setHelperActive(true);
            const html = renderToString(<ServerUsdbConfig />);
            expect(html).toContain('UltraStar DB Credentials');
        });

        it('renders missing credentials alert when autoFocusUsdb is true and not configured', () => {
            storage.setHelperActive(true);
            const html = renderToString(<ServerUsdbConfig autoFocusUsdb={true} />);
            expect(html).toContain('UltraStar DB Credentials');
            expect(html).toContain('USDB-Zugangsdaten erforderlich');
        });

        it('renders null for ServerUsdbConfig when helper is inactive', () => {
            storage.setHelperActive(false);
            const html = renderToString(<ServerUsdbConfig />);
            expect(html).toBe('');
        });

        it('renders ServerPreferences when helper is active', () => {
            storage.setHelperActive(true);
            const html = renderToString(<ServerPreferences />);
            expect(html).toContain('Server Preferences');
            expect(html).toContain('Video Download Mode');
        });

        it('renders null for ServerPreferences when helper is inactive', () => {
            storage.setHelperActive(false);
            const html = renderToString(<ServerPreferences />);
            expect(html).toBe('');
        });
    });
});
