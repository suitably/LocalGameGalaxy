import { useEffect } from 'react';
import { storage } from '../lib/storage';

/**
 * useServerUrlAutoConnect [ID: HOOK-SERVER-AUTO-CONNECT]
 *
 * Automatically inspects the URL query parameters on app initialization.
 * If `serverUrl` (or legacy `helperUrl` / `server`) and `token` (or `apiKey`) are present,
 * they are automatically saved into local storage, server connection is activated,
 * and the sensitive parameters are cleanly removed from the address bar.
 */
export function useServerUrlAutoConnect() {
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            let updated = false;

            const serverUrl = params.get('serverUrl') || params.get('helperUrl') || params.get('server');
            const token = params.get('token') || params.get('apiKey');

            if (serverUrl) {
                const cleanUrl = serverUrl.trim().replace(/\/$/, '');
                storage.setHelperUrl(cleanUrl);
                storage.setHelperActive(true);
                params.delete('serverUrl');
                params.delete('helperUrl');
                params.delete('server');
                updated = true;
            }

            if (token) {
                const cleanToken = token.trim();
                storage.setHelperToken(cleanToken);
                params.delete('token');
                params.delete('apiKey');
                updated = true;
            }

            if (updated) {
                // Clean URL in browser history without reloading
                const remainingQuery = params.toString() ? `?${params.toString()}` : '';
                const cleanUrl = `${window.location.pathname}${remainingQuery}${window.location.hash}`;
                window.history.replaceState({}, '', cleanUrl);

                // Dispatch events to notify active views and components
                window.dispatchEvent(new Event('server_connection_updated'));
                window.dispatchEvent(new Event('melodiq_settings_updated'));
            }
        } catch (e) {
            console.error('[AutoConnect] Failed to parse connection parameters from URL:', e);
        }
    }, []);
}
