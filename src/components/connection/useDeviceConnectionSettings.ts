import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { buildDeviceConnectionUrl } from './connectionUrl';
import { storage, STORAGE_PREFIXES } from '../../lib/storage';

export interface UseDeviceConnectionSettingsOptions {
    gameId: string;
    clientPath: string;
    partyId: string;
    activeTrackerUrls?: string[];
    helperStorageKey?: string;
    helperTokenKey?: string;
}

export interface UseDeviceConnectionSettingsReturn {
    baseUrl: string;
    setBaseUrl: React.Dispatch<React.SetStateAction<string>>;
    connectionUrl: string;
    qrCodeDataUrl: string;
    handleScanSuccess: (rawText: string) => void;
}

/**
 * Applies helper configuration from a scanned URL to storage and returns the target client path.
 */
export function applyScannedHelperConfig(
    rawText: string,
    gameId: string,
    helperStorageKey?: string,
    helperTokenKey?: string
): string | null {
    try {
        const scannedUrl = new URL(rawText);
        const scannedParams = scannedUrl.searchParams;

        // Apply helper config from scanned URL directly to storage
        const urlHelper = scannedParams.get('helperUrl');
        const urlToken = scannedParams.get('token') || scannedParams.get('apiKey');

        if (urlHelper && helperStorageKey) {
            storage.set(helperStorageKey, urlHelper);
            storage.set(`${gameId}${STORAGE_PREFIXES.ENABLE_HELPER}`, 'true');
        }
        if (urlToken && helperTokenKey) {
            storage.set(helperTokenKey, urlToken);
        }

        // Tell listeners to reload with the new config
        if (urlHelper || urlToken) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event(`${gameId}_settings_updated`));
            }
        }

        return scannedUrl.pathname + scannedUrl.search + scannedUrl.hash;
    } catch {
        console.error('[QRScanner] Invalid URL scanned:', rawText);
        return null;
    }
}

/**
 * Hook to manage device connection settings, QR code generation, and helper configuration persistence.
 */
export function useDeviceConnectionSettings({
    gameId,
    clientPath,
    partyId,
    activeTrackerUrls = [],
    helperStorageKey,
    helperTokenKey,
}: UseDeviceConnectionSettingsOptions): UseDeviceConnectionSettingsReturn {
    const navigate = useNavigate();

    const [baseUrl, setBaseUrl] = useState<string>(() => {
        const defaultOrigin = typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'http://localhost';
        return storage.get(`${gameId}${STORAGE_PREFIXES.HOST_BASE_URL}`, defaultOrigin);
    });

    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // Persist custom base URL on change
    useEffect(() => {
        storage.set(`${gameId}${STORAGE_PREFIXES.HOST_BASE_URL}`, baseUrl);
    }, [baseUrl, gameId]);

    const connectionUrl = useMemo(() => {
        return buildDeviceConnectionUrl({
            baseUrl,
            clientPath,
            partyId,
            trackerUrls: activeTrackerUrls
        });
    }, [baseUrl, clientPath, partyId, activeTrackerUrls]);

    // Generate QR Code data URL when connectionUrl changes
    useEffect(() => {
        if (!connectionUrl) return;
        let isMounted = true;

        QRCode.toDataURL(connectionUrl, { width: 300, margin: 2 })
            .then((url: string) => {
                if (isMounted) {
                    setQrCodeDataUrl(url);
                }
            })
            .catch((err: Error) => {
                console.error('Failed to generate QR code:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [connectionUrl]);

    /**
     * Called when a QR code is successfully scanned.
     * Extracts helper URL/token, persists them to storage, and navigates.
     */
    const handleScanSuccess = useCallback((rawText: string) => {
        const target = applyScannedHelperConfig(rawText, gameId, helperStorageKey, helperTokenKey);
        if (target) {
            navigate(target);
        }
    }, [gameId, helperStorageKey, helperTokenKey, navigate]);

    return {
        baseUrl,
        setBaseUrl,
        connectionUrl,
        qrCodeDataUrl,
        handleScanSuccess,
    };
}
