import { useState, useEffect, useCallback } from 'react';
import { storage } from '../../../lib/storage';

export type DetectedOS = 'win' | 'mac' | 'linux';
export type ScanStatus = 'idle' | 'checking' | 'found' | 'not_found' | 'connected';

function generateSecureToken(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

function detectOS(): DetectedOS {
    if (typeof navigator === 'undefined') return 'linux';
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'win';
    if (ua.includes('Mac')) return 'mac';
    return 'linux';
}

export function useServerAutoDetect() {
    const [os] = useState<DetectedOS>(detectOS);
    const [token, setToken] = useState<string>(() => {
        const existing = storage.getHelperToken();
        if (existing && existing.length >= 8) {
            return existing;
        }
        const fresh = generateSecureToken();
        storage.setHelperToken(fresh);
        return fresh;
    });

    const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
    const [detectedUrl, setDetectedUrl] = useState<string>('http://localhost:3000');
    const [songCount, setSongCount] = useState<number | null>(null);

    const regenerateToken = useCallback(() => {
        const fresh = generateSecureToken();
        setToken(fresh);
        storage.setHelperToken(fresh);
        window.dispatchEvent(new Event('server_connection_updated'));
    }, []);

    const checkLocalhost = useCallback(async () => {
        setScanStatus('checking');
        const candidateUrls = ['http://localhost:3000', 'http://127.0.0.1:3000'];

        for (const candidate of candidateUrls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const res = await fetch(`${candidate}/api/status`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (res.ok || res.status === 401) {
                    let count = 0;
                    if (res.ok) {
                        try {
                            const data = await res.json();
                            count = data.count || 0;
                        } catch {
                            // JSON parse fallback
                        }
                    }
                    setDetectedUrl(candidate);
                    setSongCount(count);
                    setScanStatus('found');
                    return;
                }
            } catch {
                // Try next candidate
            }
        }

        setScanStatus('not_found');
    }, [token]);

    const autoConnect = useCallback(() => {
        const urlToUse = detectedUrl || 'http://localhost:3000';
        storage.setHelperUrl(urlToUse);
        storage.setHelperToken(token);
        storage.setHelperActive(true);

        setScanStatus('connected');
        window.dispatchEvent(new Event('server_connection_updated'));
        window.dispatchEvent(new Event('melodiq_settings_updated'));
    }, [detectedUrl, token]);

    const downloadConfigFile = useCallback(() => {
        const configData = {
            port: 3000,
            token: token,
            directories: ['./music'],
            allowedOrigins: ['*'],
        };
        const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // Also save to current storage
        storage.setHelperToken(token);
        storage.setHelperUrl('http://localhost:3000');
        storage.setHelperActive(true);
        window.dispatchEvent(new Event('server_connection_updated'));
    }, [token]);

    const downloadDockerCompose = useCallback((edition: 'standard' | 'ai' = 'standard', includeTunnel = false) => {
        const filename = edition === 'ai'
            ? (includeTunnel ? 'docker-compose.ai-tunnel.yml' : 'docker-compose.ai.yml')
            : (includeTunnel ? 'docker-compose.tunnel.yml' : 'docker-compose.yml');

        const image = edition === 'ai' ? 'nexumia/melodiq-server:ai' : 'nexumia/melodiq-server:latest';
        const volumes = edition === 'ai'
            ? '      - ./music:/app/music:ro\n      - ./models:/app/models:z'
            : '      - ./music:/app/music:ro';

        let composeYaml = `services:
  # Melodiq Companion Server (${edition === 'ai' ? 'AI Edition: Stems & Whisper' : 'Standard Lightweight ~200MB'})
  melodiq-server:
    image: ${image}
    container_name: melodiq-server
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
${volumes}
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SECURITY_TOKEN=${token}
      - MUSIC_DIR=/app/music
      - ALLOWED_ORIGINS=*
`;

        if (includeTunnel) {
            composeYaml += `
  # Cloudflare Quick Tunnel (Public HTTPS without router port-forwarding)
  melodiq-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: melodiq-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate --url http://melodiq-server:3000
    depends_on:
      - melodiq-server
`;
        }

        const blob = new Blob([composeYaml], { type: 'text/yaml' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }, [token]);

    useEffect(() => {
        // Run initial check
        checkLocalhost();
    }, [checkLocalhost]);

    return {
        os,
        token,
        regenerateToken,
        scanStatus,
        detectedUrl,
        songCount,
        checkLocalhost,
        autoConnect,
        downloadConfigFile,
        downloadDockerCompose,
    };
}
