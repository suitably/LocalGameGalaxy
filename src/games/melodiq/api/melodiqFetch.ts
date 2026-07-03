export const melodiqFetchDirect = async (path: string, options: RequestInit = {}): Promise<any> => {
    const baseUrl = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
    const token = localStorage.getItem('melodiq_helper_token') || '';
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

export const melodiqFetch = async (path: string, options: RequestInit = {}): Promise<any> => {
    const isClient = new URLSearchParams(window.location.search).get('role') === 'client';

    if (isClient) {
        return new Promise((resolve, reject) => {
            const reqId = crypto.randomUUID();
            
            const handleResponse = (e: Event) => {
                const customEvent = e as CustomEvent;
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                
                if (customEvent.detail.status >= 200 && customEvent.detail.status < 300) {
                    resolve(customEvent.detail.data);
                } else {
                    reject(new Error(customEvent.detail.error || 'API Request Failed'));
                }
            };
            
            window.addEventListener(`melodiq_api_response_${reqId}`, handleResponse);
            
            window.dispatchEvent(new CustomEvent('melodiq_client_send_data', {
                detail: { type: 'api_request', reqId, path, options }
            }));
            
            // Timeout after 30 seconds
            setTimeout(() => {
                window.removeEventListener(`melodiq_api_response_${reqId}`, handleResponse);
                reject(new Error('API Request Timeout'));
            }, 30000);
        });
    }

    return melodiqFetchDirect(path, options);
};
