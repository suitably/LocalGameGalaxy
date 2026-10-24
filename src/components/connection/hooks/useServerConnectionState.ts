import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import { storage } from '../../../lib/storage';

export type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error';

/** State, persistence and connection test for the companion server settings card. */
export function useServerConnectionState() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const state = (location.state as Record<string, unknown>) || {};
  const sectionParam =
    searchParams.get('section') || (typeof state.section === 'string' ? state.section : '');
  const setupParam =
    searchParams.get('setup') || (typeof state.setup === 'string' ? state.setup : '');

  const [url, setUrl] = useState(() => storage.getHelperUrl());
  const [token, setToken] = useState(() => storage.getHelperToken());
  const [enabled, setEnabled] = useState(() => storage.isHelperActive());
  const [showToken, setShowToken] = useState(false);
  const wantsSetup = sectionParam === 'setup' || setupParam === '1';
  const [setupDialogOpen, setSetupDialogOpen] = useState(wantsSetup);
  const [prevWantsSetup, setPrevWantsSetup] = useState(wantsSetup);
  // Re-open the dialog when navigation asks for it (adjusted during render, no effect needed).
  if (wantsSetup !== prevWantsSetup) {
    setPrevWantsSetup(wantsSetup);
    if (wantsSetup) setSetupDialogOpen(true);
  }

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    storage.setHelperUrl(url);
    storage.setHelperToken(token);
    storage.setHelperActive(enabled);

    // Notify listeners (Melodiq settings, Admin Panel, etc.)
    window.dispatchEvent(new Event('melodiq_settings_updated'));
    window.dispatchEvent(new Event('server_connection_updated'));
  }, [url, token, enabled]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    try {
      if (val.includes('token=')) {
        const parseUrl = val.startsWith('http') ? val : `http://${val}`;
        const urlObj = new URL(parseUrl);
        const extractedToken = urlObj.searchParams.get('token');

        if (extractedToken) {
          setToken(extractedToken);
          urlObj.searchParams.delete('token');

          val = val.startsWith('http')
            ? urlObj.toString()
            : urlObj.toString().replace(/^http:\/\//, '');
          val = val.replace(/\?$/, '').replace(/\/$/, '');
        }
      }
    } catch {
      // Ignore parse errors while typing
    }
    setUrl(val);
  };

  const checkConnection = async () => {
    if (!enabled) return;
    setStatus('checking');
    setStatusMsg(t('server.connecting', 'Connecting...'));

    try {
      const cleanUrl = url.replace(/\/$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${cleanUrl}/api/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setStatusMsg(
          t('server.connected', {
            count: data.count || 0,
            defaultValue: `Connected! Found ${data.count || 0} songs.`,
          }),
        );
        window.dispatchEvent(new Event('server_connection_updated'));
      } else {
        setStatus('error');
        if (res.status === 401) {
          setStatusMsg(t('server.error_unauthorized', 'Unauthorized: Invalid or missing token.'));
        } else {
          setStatusMsg(t('server.error_generic', `Server returned status ${res.status}.`));
        }
      }
    } catch (err: unknown) {
      setStatus('error');
      const isAbortError = err instanceof Error && err.name === 'AbortError';
      if (isAbortError) {
        setStatusMsg(t('server.error_timeout', 'Connection timed out (5s).'));
      } else {
        setStatusMsg(t('server.error_failed', 'Connection failed. Check URL or CORS.'));
      }
    }
  };

  const copyConnectionUrl = () => {
    const cleanWeb = window.location.origin;
    const cleanServer = url.replace(/\/$/, '');
    const connectionLink = `${cleanWeb}/?serverUrl=${encodeURIComponent(cleanServer)}&token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(connectionLink);
  };

  return {
    url,
    token,
    setToken,
    enabled,
    setEnabled,
    showToken,
    setShowToken,
    setupDialogOpen,
    setSetupDialogOpen,
    status,
    statusMsg,
    handleUrlChange,
    checkConnection,
    copyConnectionUrl,
  };
}
