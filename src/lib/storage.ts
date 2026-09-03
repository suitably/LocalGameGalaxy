/**
 * Centralized Storage Service [ID: LIB-STORAGE]
 * Provides unified, type-safe access to localStorage and app preference configurations.
 */

export const STORAGE_KEYS = {
    // Companion helper configuration
    HELPER_URL: 'melodiq_helper_url',
    HELPER_TOKEN: 'melodiq_helper_token',
    HELPER_ACTIVE: 'melodiq_enable_helper',
    
    // Client connection states
    CLIENT_PROFILE: 'melodiq_client_profile',
    PROFILES: 'melodiq_profiles',
    ACTIVE_SESSION: 'melodiq_active_session',
    CURRENT_SONG_PARTICIPANTS: 'melodiq_current_song_participants',
    
    // Queue & play state
    NOW_PLAYING: 'melodiq_now_playing',
    QUEUE: 'melodiq_queue',
    SONG_HISTORY: 'melodiq_song_history',
    
    // Werewolf game state
    WEREWOLF_STATE: 'werewolf-game-state',
    WEREWOLF_SETUP_PLAYERS: 'werewolf-setup-players',
    WEREWOLF_CUSTOM_ROLES: 'werewolf-custom-roles',
    
    // Imposter game settings
    IMPOSTER_SETTINGS: 'imposter-setup-settings',
    IMPOSTER_SETUP_PLAYERS: 'imposter-setup-players',
    IMPOSTER_SEEN_INFO: 'imposter-has-seen-info',
    
    // GitHub direct integration
    GITHUB_TOKEN: 'nexumia_github_token',
    GITHUB_OWNER: 'nexumia_github_owner',
    GITHUB_REPO: 'nexumia_github_repo',

    // Push notification relay for async games (GuessArt, etc.)
    PUSH_RELAY_URL: 'galaxy_push_relay_url',
} as const;

const memoryFallback = new Map<string, string>();

export const storage = {
    get(key: string, fallback = ''): string {
        try {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(key) ?? fallback;
            }
            return memoryFallback.get(key) ?? fallback;
        } catch {
            return memoryFallback.get(key) ?? fallback;
        }
    },
    
    set(key: string, value: string): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
            memoryFallback.set(key, value);
        } catch (e) {
            memoryFallback.set(key, value);
        }
    },
    
    remove(key: string): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
            memoryFallback.delete(key);
        } catch (e) {
            memoryFallback.delete(key);
        }
    },
    
    clear(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.clear();
            }
            memoryFallback.clear();
        } catch (e) {
            memoryFallback.clear();
        }
    },
    
    getJson<T>(key: string, fallback: T): T {
        const val = this.get(key);
        if (!val) return fallback;
        try {
            return JSON.parse(val) as T;
        } catch {
            return fallback;
        }
    },
    
    setJson<T>(key: string, value: T): void {
        this.set(key, JSON.stringify(value));
    },

    // Companion Helper Config Accessors
    getHelperUrl(): string {
        return this.get(STORAGE_KEYS.HELPER_URL, 'http://localhost:3000');
    },
    
    setHelperUrl(url: string): void {
        this.set(STORAGE_KEYS.HELPER_URL, url);
    },
    
    getHelperToken(): string {
        return this.get(STORAGE_KEYS.HELPER_TOKEN, '');
    },
    
    setHelperToken(token: string): void {
        this.set(STORAGE_KEYS.HELPER_TOKEN, token);
    },
    
    isHelperActive(): boolean {
        const val = this.get(STORAGE_KEYS.HELPER_ACTIVE);
        return val !== 'false';
    },
    
    setHelperActive(active: boolean): void {
        this.set(STORAGE_KEYS.HELPER_ACTIVE, active ? 'true' : 'false');
    },

    // Push Relay Config Accessors (for async games like GuessArt)
    getPushRelayUrl(): string {
        return this.get(STORAGE_KEYS.PUSH_RELAY_URL, '');
    },

    setPushRelayUrl(url: string): void {
        this.set(STORAGE_KEYS.PUSH_RELAY_URL, url.trim().replace(/\/$/, ''));
    },
};
