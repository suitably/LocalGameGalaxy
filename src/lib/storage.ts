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
    MELODIQ_TRACKER_URLS: 'melodiq_tracker_urls',
    MELODIQ_CARD_SIZE: 'melodiq_card_size',
    MELODIQ_MIC_SLOTS: 'melodiq_mic_slots',
    MELODIQ_MIC_NAMES: 'melodiq_mic_names',
    MELODIQ_MIC_ORIGINAL_NAMES: 'melodiq_mic_original_names',
    MELODIQ_CLIENT_ROLES: 'melodiq_client_roles',
    MELODIQ_SAVED_TIME: 'melodiq_saved_time',
    MELODIQ_PARTY_ID: 'melodiq_party_id',
    MELODIQ_HOST_BASE_URL: 'melodiq_host_base_url',
    EXCALIDRAW_DRAWING: 'excalidraw',
    
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
    NOTIFICATION_METHOD: 'galaxy_notification_method',
    NTFY_SERVER_URL: 'galaxy_ntfy_server_url',
    NTFY_TOPIC: 'galaxy_ntfy_topic',

    // Sudoku
    SUDOKU_STATE: 'galaxy_sudoku_state',
    SUDOKU_STATS: 'galaxy_sudoku_stats',

    // Wordle
    WORDLE_STATS: 'galaxy_wordle_stats',

    // Cards
    CARDS_LOBBY_PLAYERS: 'cards_lobby_players',

    // Knister & Qwixx
    KNISTER_CURRENT_GAME: 'knister_current_game',
    KNISTER_SHOW_DICE: 'knister_show_dice',
    QWIXX_MY_SHEET: 'qwixx_my_sheet',
    QWIXX_SHOW_DICE: 'qwixx_show_dice',
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

    getNotificationMethod(): 'auto' | 'webpush' | 'ntfy' | 'both' {
        const val = this.get(STORAGE_KEYS.NOTIFICATION_METHOD, 'auto');
        if (val === 'webpush' || val === 'ntfy' || val === 'both') {
            return val;
        }
        return 'auto';
    },

    setNotificationMethod(method: 'auto' | 'webpush' | 'ntfy' | 'both'): void {
        this.set(STORAGE_KEYS.NOTIFICATION_METHOD, method);
    },

    getNtfyServerUrl(): string {
        return this.get(STORAGE_KEYS.NTFY_SERVER_URL, 'https://ntfy.sh');
    },

    setNtfyServerUrl(url: string): void {
        const clean = url.trim().replace(/\/$/, '');
        this.set(STORAGE_KEYS.NTFY_SERVER_URL, clean || 'https://ntfy.sh');
    },

    getUserNtfyTopic(): string {
        let topic = this.get(STORAGE_KEYS.NTFY_TOPIC);
        if (!topic) {
            topic = generateUserNtfyTopic();
            this.set(STORAGE_KEYS.NTFY_TOPIC, topic);
        }
        return topic;
    },

    setUserNtfyTopic(topic: string): void {
        const clean = topic.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        this.set(STORAGE_KEYS.NTFY_TOPIC, clean || generateUserNtfyTopic());
    },

    regenerateUserNtfyTopic(): string {
        const topic = generateUserNtfyTopic();
        this.set(STORAGE_KEYS.NTFY_TOPIC, topic);
        return topic;
    },
};

export function generateUserNtfyTopic(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `lgg-user-${hex}`;
    }
    const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return `lgg-user-${rand.slice(0, 16)}`;
}
