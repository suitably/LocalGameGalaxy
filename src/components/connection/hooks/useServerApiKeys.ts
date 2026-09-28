import { useState, useCallback, useRef, useEffect } from 'react';
import { storage } from '../../../lib/storage';

export interface ApiKey {
    id: string;
    name: string;
    token: string;
    allowManagement: boolean;
    allowSongDeletion: boolean;
    createdAt: string;
}

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'forbidden' | 'error';

export function useServerApiKeys() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
    const [error, setError] = useState('');

    const lastCheckedRef = useRef<{ url: string; token: string } | null>(null);

    const fetchApiKeys = useCallback(async (force = false) => {
        const helperUrl = storage.getHelperUrl();
        const helperToken = storage.getHelperToken();

        if (!storage.isHelperActive() || !helperToken) {
            setLoadStatus('idle');
            return;
        }

        if (!force && lastCheckedRef.current?.url === helperUrl && lastCheckedRef.current?.token === helperToken) {
            return;
        }

        lastCheckedRef.current = { url: helperUrl, token: helperToken };
        setLoadStatus('loading');
        setError('');

        try {
            const cleanUrl = helperUrl.replace(/\/$/, '');
            const res = await fetch(`${cleanUrl}/api/config/apikeys`, {
                headers: { Authorization: `Bearer ${helperToken}` },
            });

            if (res.status === 403 || res.status === 401) {
                setLoadStatus('forbidden');
                return;
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            setApiKeys(Array.isArray(data) ? data : []);
            setLoadStatus('loaded');
        } catch (e: unknown) {
            setLoadStatus('error');
            const message = e instanceof Error ? e.message : 'Unknown connection error';
            setError(message);
        }
    }, []);

    const createKey = async (name: string, allowManagement: boolean, allowSongDeletion: boolean) => {
        const helperUrl = storage.getHelperUrl();
        const helperToken = storage.getHelperToken();
        if (!helperUrl || !helperToken) throw new Error('Missing URL or token');

        const cleanUrl = helperUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/api/config/apikeys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${helperToken}`,
            },
            body: JSON.stringify({
                name: name.trim(),
                allowManagement,
                allowSongDeletion,
            }),
        });

        if (!res.ok) throw new Error('Failed to create API key');
        await fetchApiKeys(true);
    };

    const updateKey = async (id: string, allowManagement: boolean, allowSongDeletion: boolean) => {
        const helperUrl = storage.getHelperUrl();
        const helperToken = storage.getHelperToken();
        if (!helperUrl || !helperToken) throw new Error('Missing URL or token');

        const cleanUrl = helperUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/api/config/apikeys/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${helperToken}`,
            },
            body: JSON.stringify({
                allowManagement,
                allowSongDeletion,
            }),
        });

        if (!res.ok) throw new Error('Failed to update API key permissions');
        await fetchApiKeys(true);
    };

    const deleteKey = async (id: string) => {
        const helperUrl = storage.getHelperUrl();
        const helperToken = storage.getHelperToken();
        if (!helperUrl || !helperToken) throw new Error('Missing URL or token');

        const cleanUrl = helperUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/api/config/apikeys/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${helperToken}` },
        });

        if (!res.ok) throw new Error('Failed to delete API key');
        await fetchApiKeys(true);
    };

    useEffect(() => {
        fetchApiKeys();
        const handleUpdate = () => fetchApiKeys(true);
        window.addEventListener('server_connection_updated', handleUpdate);
        return () => window.removeEventListener('server_connection_updated', handleUpdate);
    }, [fetchApiKeys]);

    return {
        apiKeys,
        loadStatus,
        error,
        setError,
        fetchApiKeys,
        createKey,
        updateKey,
        deleteKey
    };
}
