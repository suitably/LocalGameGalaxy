import { storage } from '../../../lib/storage';

export const melodiqFetchDirect = async (path: string, options: RequestInit = {}): Promise<any> => {
    const baseUrl = storage.getHelperUrl();
    const token = storage.getHelperToken();
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${cleanBaseUrl}${path}`, {
        ...options,
        headers
    });
    
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = text;
    }
    
    if (!res.ok) {
        throw new Error(data?.error || data?.message || 'API Request Failed');
    }
    return data;
};

/**
 * Waits until the WebRTC connection is active (for client mode).
 * Resolves immediately if already connected, or waits up to `timeoutMs` for the
 * `melodiq_rtc_connected` event.
 */
const waitForConnection = (timeoutMs = 15000): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if already connected (use window var instead of sessionStorage to reset on reload)
        if ((window as any).__melodiq_rtc_connected) {
            return resolve();
        }
        
        const handler = () => {
            clearTimeout(timer);
            window.removeEventListener('melodiq_rtc_connected', handler);
            resolve();
        };
        
        const timer = setTimeout(() => {
            window.removeEventListener('melodiq_rtc_connected', handler);
            reject(new Error('WebRTC connection timeout'));
        }, timeoutMs);
        
        window.addEventListener('melodiq_rtc_connected', handler);
    });
};

export const melodiqFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
    const isClient = new URLSearchParams(window.location.search).get('role') === 'client';

    if (isClient) {
        // Wait until the WebRTC connection is established before sending the request
        await waitForConnection();

        return new Promise((resolve, reject) => {
            const reqId = crypto.randomUUID();
            let timer: ReturnType<typeof setTimeout> | undefined;
            
            const handleResponse = (e: Event) => {
                const customEvent = e as CustomEvent;
                if (timer) {
                    clearTimeout(timer);
                }
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                
                if (customEvent.detail.status >= 200 && customEvent.detail.status < 300) {
                    resolve(customEvent.detail.data);
                } else {
                    reject(new Error(customEvent.detail.error || 'API Request Failed'));
                }
            };
            
            window.addEventListener(`melodiq_api_response_${reqId}`, handleResponse);
            
            // Timeout after 45 seconds (chunked large responses need more time)
            timer = setTimeout(() => {
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                reject(new Error('API Request Timeout'));
            }, 45000);
            
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', {
                detail: { type: 'api_request', reqId, path, options }
            }));
        });
    }

    return melodiqFetchDirect(path, options);
};
