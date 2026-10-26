/**
 * Centralized Storage Service [ID: LIB-STORAGE]
 * Provides unified, type-safe access to localStorage and app preference configurations.
 */

import * as companion from './companion/companionSettings';
import * as signaling from './webrtc/signalingSettings';
import * as push from './push/pushSettings';

export const STORAGE_KEYS = {
  // This device's stable id (player seats, src/lib/deviceIdentity.ts)
  DEVICE_ID: 'lgg_device_id',

  // Companion helper configuration
  HELPER_URL: 'melodiq_helper_url',
  HELPER_TOKEN: 'melodiq_helper_token',
  HELPER_ACTIVE: 'melodiq_enable_helper',
  /** Docker compose generator choices in Settings → Server. */
  COMPOSE_GENERATOR: 'galaxy_compose_generator',
  SIGNALING_URL: 'galaxy_signaling_url',
  WEBRTC_STUN_CUSTOM_URLS: 'galaxy_stun_custom_urls',
  WEBRTC_STUN_PREFERENCES: 'galaxy_stun_preferences',

  // Client connection states
  CLIENT_PROFILE: 'melodiq_client_profile',
  PROFILES: 'melodiq_profiles',
  ACTIVE_SESSION: 'melodiq_active_session',
  CURRENT_SONG_PARTICIPANTS: 'melodiq_current_song_participants',
  MELODIQ_TRACKER_URLS: 'melodiq_tracker_urls',
  MELODIQ_DISABLED_TRACKER_URLS: 'melodiq_disabled_tracker_urls',
  MELODIQ_TRACKER_PREFERENCES: 'melodiq_tracker_preferences',
  MELODIQ_CARD_SIZE: 'melodiq_card_size',
  MELODIQ_MIC_SLOTS: 'melodiq_mic_slots',
  MELODIQ_MIC_NAMES: 'melodiq_mic_names',
  MELODIQ_MIC_ORIGINAL_NAMES: 'melodiq_mic_original_names',
  MELODIQ_CLIENT_ROLES: 'melodiq_client_roles',
  MELODIQ_SAVED_TIME: 'melodiq_saved_time',
  MELODIQ_PARTY_ID: 'melodiq_party_id',
  MELODIQ_HOST_BASE_URL: 'melodiq_host_base_url',
  EXCALIDRAW_DRAWING: 'excalidraw',
  DARTS_GAME_STATE: 'darts_game_state',

  // Queue & play state
  NOW_PLAYING: 'melodiq_now_playing',
  QUEUE: 'melodiq_queue',
  SONG_HISTORY: 'melodiq_song_history',

  // Melodiq Legacy Profile Migration
  MELODIQ_P1_NAME: 'melodiq_p1_name',
  MELODIQ_P2_NAME: 'melodiq_p2_name',
  MELODIQ_P1_HUE: 'melodiq_p1_hue',
  MELODIQ_P2_HUE: 'melodiq_p2_hue',
  MELODIQ_P1_DEVICE: 'melodiq_p1_device',
  MELODIQ_P2_DEVICE: 'melodiq_p2_device',

  // Melodiq Playlists & Session
  MELODIQ_ENABLE_PLAYLIST_SYNC: 'melodiq_enable_playlist_sync',
  MELODIQ_META_CACHE: 'melodiq_meta_cache',
  MELODIQ_RTC_CONNECTED: 'melodiq_rtc_connected',

  // Melodiq Settings
  MELODIQ_SHOW_OVERLAY: 'melodiq_show_overlay',
  MELODIQ_SHOW_SLIDER: 'melodiq_show_slider',
  MELODIQ_SHOW_NOTE_LABELS: 'melodiq_show_note_labels',
  MELODIQ_SHOW_VIDEO_ERRORS: 'melodiq_show_video_errors',
  MELODIQ_CUSTOM_LAYOUTS: 'melodiq_custom_layouts',
  MELODIQ_CUSTOM_TARGET_COLUMNS: 'melodiq_custom_target_columns',
  MELODIQ_SONG_VOLUME: 'melodiq_song_volume',
  MELODIQ_MASTER_VOLUME: 'melodiq_master_volume',
  MELODIQ_VOCALS_VOLUME: 'melodiq_vocals_volume',
  MELODIQ_GOLDEN_NOTE_MULTIPLIER: 'melodiq_golden_note_multiplier',
  MELODIQ_DEFAULT_SONG_CLICK_ACTION: 'melodiq_default_song_click_action',
  MELODIQ_DEFAULT_VIEW_MODE: 'melodiq_default_view_mode',
  MELODIQ_AUTOPLAY_NO_PLAYERS: 'melodiq_autoplay_no_players',
  MELODIQ_AUTOPLAY_WITH_PLAYERS: 'melodiq_autoplay_with_players',
  MELODIQ_HIDE_BACKGROUND_VIDEO: 'melodiq_hide_background_video',
  MELODIQ_FALLBACK_BACKGROUND_URL: 'melodiq_fallback_background_url',
  MELODIQ_LYRICS_SCALE: 'melodiq_lyrics_scale',
  MELODIQ_ENABLE_LYRICS_ZOOM: 'melodiq_enable_lyrics_zoom',
  MELODIQ_LYRICS_LINES: 'melodiq_lyrics_lines',
  MELODIQ_LYRICS_POSITION: 'melodiq_lyrics_position',
  MELODIQ_AUDIO_PLAYBACK_MODE: 'melodiq_audio_playback_mode',
  MELODIQ_SHOW_SCOREBOARD_QR_CODE: 'melodiq_show_scoreboard_qr_code',
  MELODIQ_MIC_LATENCY: 'melodiq_mic_latency',

  // Melodiq Notes preferences
  MELODIQ_NOTES_SOUND_CONFIG: 'melodiq_notes_sound_config',
  MELODIQ_NOTES_VIEW_MODE: 'melodiq_notes_view_mode',
  MELODIQ_NOTES_SHEET_RENDER_MODE: 'melodiq_notes_sheet_render_mode',
  MELODIQ_NOTES_SEEK_LEAD_IN: 'melodiq_notes_seek_lead_in',
  /** This device's input latency as a pult (ms, calibrated against the stage). */
  MELODIQ_NOTES_INPUT_LATENCY: 'melodiq_notes_input_latency',

  // Werewolf game state
  WEREWOLF_STATE: 'werewolf-game-state',
  WEREWOLF_SETUP_PLAYERS: 'werewolf-setup-players',
  WEREWOLF_CUSTOM_ROLES: 'werewolf-custom-roles',
  WEREWOLF_SETTINGS: 'werewolf-setup-settings',
  WEREWOLF_TTS_ENABLED: 'werewolf_narrator_tts_enabled',

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
  /** This device's Web Push subscription with the site's own sender (`lib/push/siteWebPush.ts`). */
  PUSH_SITE_SUBSCRIPTION: 'galaxy_push_site_subscription',
  NOTIFICATION_METHOD: 'galaxy_notification_method',
  NTFY_SERVER_URL: 'galaxy_ntfy_server_url',
  NTFY_TOPIC: 'galaxy_ntfy_topic',

  // Sudoku
  SUDOKU_STATE: 'galaxy_sudoku_state',
  SUDOKU_STATS: 'galaxy_sudoku_stats',

  // Wordle
  WORDLE_STATS: 'galaxy_wordle_stats',
  /** Wordle setting "Only dictionary words" (JSON boolean, default true). */
  WORDLE_DICTIONARY_ONLY: 'galaxy_wordle_dictionary_only',

  // Cards
  CARDS_LOBBY_PLAYERS: 'cards_lobby_players',

  // Knister & Qwixx
  KNISTER_CURRENT_GAME: 'knister_current_game',
  KNISTER_SHOW_DICE: 'knister_show_dice',
  QWIXX_MY_SHEET: 'qwixx_my_sheet',
  QWIXX_SHOW_DICE: 'qwixx_show_dice',

  // Gartic Phone & Universal Party
  GARTIC_STATE_PREFIX: 'galaxy_gartic_state_',
  GARTIC_HOST_PREFIX: 'gartic_host_',
  PARTY_MY_PLAYER_ID: 'party_my_player_id',
  /** Player name shared by the party lobby and party games (historical key name). */
  PARTY_PLAYER_NAME: 'guessart_player_name',
  HOST_ROOM_CODE: 'galaxy_host_room_code',

  // Connection & WebApp
  SHARE_WEBAPP_URL: 'nexumia_share_webapp_url',

  // App & Environment
  PWA_BANNER_DISMISSED: 'pwa-banner-dismissed',
  LANGUAGE: 'lgg_language',
  LANGUAGE_LEGACY: 'language',
  /** Colour mode setting: `system` | `dark` | `light` (src/lib/colorMode.ts, DESIGN.md §9). */
  COLOR_MODE: 'lgg_color_mode',
  EXCALIDRAW_LIBRARY: 'guessart_excalidraw_library',
} as const;

export const STORAGE_PREFIXES = {
  PARTY_STATE: 'galaxy_party_state_',
  PARTY_HOST_ID: 'party_host_id_',
  GAME_RELAY: 'galaxy_game_relay_',
  WEBRTC_PARTY_ID: '_party_id',
  WEBRTC_TRACKER_URLS: '_tracker_urls',
  WEBRTC_TRACKER_PREF: '_tracker_preferences',
  WEBRTC_ACTIVE_PEERS: '_active_peer_ids',
  HOST_BASE_URL: '_host_base_url',
  ENABLE_HELPER: '_enable_helper',
} as const;

const memoryFallback = new Map<string, string>();

function parseJsonOr<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

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
    return parseJsonOr(this.get(key), fallback);
  },

  setJson<T>(key: string, value: T): void {
    this.set(key, JSON.stringify(value));
  },

  get session() {
    return sessionStorageSafe;
  },

  findKeysWithPrefix(prefix: string): string[] {
    const matching: string[] = [];
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            matching.push(key);
          }
        }
        return matching;
      }
    } catch {
      // fallback below
    }
    for (const key of memoryFallback.keys()) {
      if (key.startsWith(prefix)) {
        matching.push(key);
      }
    }
    return matching;
  },

  // Feature settings moved to their owners (#419); thin delegates kept for existing call sites.
  /** @deprecated Use `getHelperUrl` from `lib/companion/companionSettings`. */
  getHelperUrl: () => companion.getHelperUrl(),
  /** @deprecated Use `setHelperUrl` from `lib/companion/companionSettings`. */
  setHelperUrl: (url: string) => companion.setHelperUrl(url),
  /** @deprecated Use `getHelperToken` from `lib/companion/companionSettings`. */
  getHelperToken: () => companion.getHelperToken(),
  /** @deprecated Use `setHelperToken` from `lib/companion/companionSettings`. */
  setHelperToken: (token: string) => companion.setHelperToken(token),
  /** @deprecated Use `isHelperActive` from `lib/companion/companionSettings`. */
  isHelperActive: () => companion.isHelperActive(),
  /** @deprecated Use `setHelperActive` from `lib/companion/companionSettings`. */
  setHelperActive: (active: boolean) => companion.setHelperActive(active),
  /** @deprecated Use `getSignalingUrl` from `lib/webrtc/signalingSettings`. */
  getSignalingUrl: () => signaling.getSignalingUrl(),
  /** @deprecated Use `setSignalingUrl` from `lib/webrtc/signalingSettings`. */
  setSignalingUrl: (url: string) => signaling.setSignalingUrl(url),
  /** @deprecated Use `getDisabledTrackerUrls` from `lib/webrtc/signalingSettings`. */
  getDisabledTrackerUrls: (gameId?: string) => signaling.getDisabledTrackerUrls(gameId),
  /** @deprecated Use `setDisabledTrackerUrls` from `lib/webrtc/signalingSettings`. */
  setDisabledTrackerUrls: (urls: string[], gameId?: string) =>
    signaling.setDisabledTrackerUrls(urls, gameId),
  /** @deprecated Use `getPushRelayUrl` from `lib/push/pushSettings`. */
  getPushRelayUrl: () => push.getPushRelayUrl(),
  /** @deprecated Use `setPushRelayUrl` from `lib/push/pushSettings`. */
  setPushRelayUrl: (url: string) => push.setPushRelayUrl(url),
  /** @deprecated Use `getNotificationMethod` from `lib/push/pushSettings`. */
  getNotificationMethod: () => push.getNotificationMethod(),
  /** @deprecated Use `setNotificationMethod` from `lib/push/pushSettings`. */
  setNotificationMethod: (method: push.NotificationMethod) => push.setNotificationMethod(method),
  /** @deprecated Use `getNtfyServerUrl` from `lib/push/pushSettings`. */
  getNtfyServerUrl: () => push.getNtfyServerUrl(),
  /** @deprecated Use `setNtfyServerUrl` from `lib/push/pushSettings`. */
  setNtfyServerUrl: (url: string) => push.setNtfyServerUrl(url),
  /** @deprecated Use `getUserNtfyTopic` from `lib/push/pushSettings`. */
  getUserNtfyTopic: () => push.getUserNtfyTopic(),
  /** @deprecated Use `setUserNtfyTopic` from `lib/push/pushSettings`. */
  setUserNtfyTopic: (topic: string) => push.setUserNtfyTopic(topic),
  /** @deprecated Use `regenerateUserNtfyTopic` from `lib/push/pushSettings`. */
  regenerateUserNtfyTopic: () => push.regenerateUserNtfyTopic(),
};

/** @deprecated Import from `lib/push/pushSettings`. */
export { generateUserNtfyTopic } from './push/pushSettings';

const sessionMemoryFallback = new Map<string, string>();

export const sessionStorageSafe = {
  get(key: string, fallback = ''): string {
    try {
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(key) ?? fallback;
      }
      return sessionMemoryFallback.get(key) ?? fallback;
    } catch {
      return sessionMemoryFallback.get(key) ?? fallback;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
      sessionMemoryFallback.set(key, value);
    } catch {
      sessionMemoryFallback.set(key, value);
    }
  },
  remove(key: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
      sessionMemoryFallback.delete(key);
    } catch {
      sessionMemoryFallback.delete(key);
    }
  },
  getJson: <T>(key: string, fallback: T): T => parseJsonOr(sessionStorageSafe.get(key), fallback),
  setJson: <T>(key: string, value: T): void => sessionStorageSafe.set(key, JSON.stringify(value)),
};
