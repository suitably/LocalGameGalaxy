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
} as const;

export const storage = {
    get(key: string, fallback = ''): string {
        try {
            return localStorage.getItem(key) ?? fallback;
        } catch {
            return fallback;
        }
    },
    
    set(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error(`[Storage] Write failed for key "${key}":`, e);
        }
    },
    
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`[Storage] Delete failed for key "${key}":`, e);
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
        return this.get(STORAGE_KEYS.HELPER_ACTIVE) === 'true';
    },
    
    setHelperActive(active: boolean): void {
        this.set(STORAGE_KEYS.HELPER_ACTIVE, active ? 'true' : 'false');
    }
};
