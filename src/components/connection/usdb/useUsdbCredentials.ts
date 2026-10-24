import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { storage } from '../../../lib/storage';
import { melodiqFetch } from '../../../games/melodiq';
import type { UsdbCredentialsResponse } from '../serverConfigTypes';

export interface UsdbFeedback {
  type: 'success' | 'error';
  text: string;
}

/** Loads, edits and saves the UltraStar DB credentials stored on the companion server. */
export function useUsdbCredentials(showMissingBanner: boolean) {
  const { t } = useTranslation();
  const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<UsdbFeedback | null>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const loadCredentials = useCallback(async () => {
    if (!storage.isHelperActive()) return;
    setLoading(true);
    try {
      const data = await melodiqFetch<UsdbCredentialsResponse>('/api/config/usdb-credentials');
      setUsername(data?.username || '');
      setHasPassword(Boolean(data?.hasPassword));
      setPassword('');
    } catch {
      // Ignore load failures silently on initial render
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const active = storage.isHelperActive();
      setIsServerActive(active);
      if (active) {
        loadCredentials();
      }
    };

    handleUpdate();
    window.addEventListener('server_connection_updated', handleUpdate);
    return () => window.removeEventListener('server_connection_updated', handleUpdate);
  }, [loadCredentials]);

  const saveAndTest = async () => {
    if (!username.trim()) return;
    setTesting(true);
    setFeedback(null);

    try {
      // If password is blank but server has existing password, send '********' to preserve it
      const pwdToSend = password.trim() ? password : hasPassword ? '********' : '';
      await melodiqFetch('/api/config/usdb-credentials', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password: pwdToSend }),
      });

      setHasPassword(true);
      setPassword('');
      setFeedback({
        type: 'success',
        text: t('server.usdb.success', 'USDB credentials successfully verified and saved!'),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setFeedback({
        type: 'error',
        text: t('server.usdb.error', { error: msg, defaultValue: `USDB login failed: ${msg}` }),
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = Boolean(username && hasPassword);

  useEffect(() => {
    if (showMissingBanner && !isConfigured) {
      const timer = setTimeout(() => {
        const targetRef = username ? passwordInputRef : usernameInputRef;
        if (targetRef.current) {
          targetRef.current.focus();
          targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showMissingBanner, isConfigured, username]);

  return {
    isServerActive,
    username,
    setUsername,
    password,
    setPassword,
    hasPassword,
    loading,
    testing,
    feedback,
    isConfigured,
    usernameInputRef,
    passwordInputRef,
    saveAndTest,
  };
}
