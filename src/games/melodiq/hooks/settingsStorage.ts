import { storage, STORAGE_KEYS } from '../../../lib/storage';

export interface SettingsState {
  showDebugOverlay: boolean;
  showDevSlider: boolean;
  showNoteLabels: boolean;
  showVideoErrors: boolean;
  customLayouts: Record<number, string>;
  cardSize: string;
  customTarget: number;
  songVolume: number;
  masterVolume: number;
  vocalsVolume: number;
  helperUrl: string;
  enableHelper: boolean;
  goldenNoteMultiplier: number;
  defaultSongClickAction: 'play_now' | 'play_next' | 'add_end';
  defaultViewMode: 'list' | 'grid';
  autoplayNoPlayersDelay: number;
  autoplayWithPlayersDelay: number;
  hideBackgroundVideo: boolean;
  fallbackBackgroundUrl: string;
  lyricsScale: number;
  enableLyricsZoom: boolean;
  lyricsLines: number;
  lyricsPosition: 'bottom' | 'center';
  audioPlaybackMode: 'separated' | 'original';
  showScoreboardQrCode: boolean;
  micLatency: number;
}

/** Default/Factory settings */
export const DEFAULT_SETTINGS: SettingsState = {
  showDebugOverlay: false,
  showDevSlider: false,
  showNoteLabels: true,
  showVideoErrors: false,
  customLayouts: { 1: '1', 2: '1.1', 3: '1.2', 4: '2.2' },
  cardSize: 'small',
  customTarget: 6,
  songVolume: 0.7,
  masterVolume: 1.0,
  vocalsVolume: 1.0,
  helperUrl: 'http://localhost:3000',
  enableHelper: false,
  goldenNoteMultiplier: 2.0,
  defaultSongClickAction: 'add_end',
  defaultViewMode: 'list',
  autoplayNoPlayersDelay: 10,
  autoplayWithPlayersDelay: 0,
  hideBackgroundVideo: false,
  fallbackBackgroundUrl: '',
  lyricsScale: 1.0,
  enableLyricsZoom: false,
  lyricsLines: 2,
  lyricsPosition: 'bottom',
  audioPlaybackMode: 'separated',
  showScoreboardQrCode: true,
  micLatency: 0,
};

export const loadSettings = (): SettingsState => ({
  showDebugOverlay: storage.get(STORAGE_KEYS.MELODIQ_SHOW_OVERLAY) === 'true',
  showDevSlider: storage.get(STORAGE_KEYS.MELODIQ_SHOW_SLIDER) === 'true',
  showNoteLabels: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_SHOW_NOTE_LABELS);
    return stored === '' ? true : stored === 'true';
  })(),
  showVideoErrors: storage.get(STORAGE_KEYS.MELODIQ_SHOW_VIDEO_ERRORS) === 'true',
  customLayouts: storage.getJson<Record<number, string>>(STORAGE_KEYS.MELODIQ_CUSTOM_LAYOUTS, {
    1: '1',
    2: '1.1',
    3: '1.2',
    4: '2.2',
  }),
  cardSize: storage.get(STORAGE_KEYS.MELODIQ_CARD_SIZE) || 'small',
  customTarget: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_CUSTOM_TARGET_COLUMNS);
    return stored ? parseInt(stored) : 6;
  })(),
  songVolume: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_SONG_VOLUME);
    return stored ? parseFloat(stored) : 0.7;
  })(),
  masterVolume: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_MASTER_VOLUME);
    return stored ? parseFloat(stored) : 1.0;
  })(),
  vocalsVolume: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_VOCALS_VOLUME);
    return stored ? parseFloat(stored) : 1.0;
  })(),
  helperUrl: storage.get(STORAGE_KEYS.HELPER_URL) || 'http://localhost:3000',
  enableHelper: storage.get(STORAGE_KEYS.HELPER_ACTIVE) === 'true',
  goldenNoteMultiplier: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_GOLDEN_NOTE_MULTIPLIER);
    return stored ? parseFloat(stored) : 2.0;
  })(),
  defaultSongClickAction:
    (storage.get(STORAGE_KEYS.MELODIQ_DEFAULT_SONG_CLICK_ACTION) as any) || 'add_end',
  defaultViewMode: (storage.get(STORAGE_KEYS.MELODIQ_DEFAULT_VIEW_MODE) as any) || 'list',
  autoplayNoPlayersDelay: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_AUTOPLAY_NO_PLAYERS);
    return stored ? parseInt(stored) : 10;
  })(),
  autoplayWithPlayersDelay: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_AUTOPLAY_WITH_PLAYERS);
    return stored ? parseInt(stored) : 0;
  })(),
  hideBackgroundVideo: storage.get(STORAGE_KEYS.MELODIQ_HIDE_BACKGROUND_VIDEO) === 'true',
  fallbackBackgroundUrl: storage.get(STORAGE_KEYS.MELODIQ_FALLBACK_BACKGROUND_URL) || '',
  lyricsScale: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_LYRICS_SCALE);
    return stored ? parseFloat(stored) : 1.0;
  })(),
  enableLyricsZoom: storage.get(STORAGE_KEYS.MELODIQ_ENABLE_LYRICS_ZOOM) === 'true',
  lyricsLines: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_LYRICS_LINES);
    return stored ? parseInt(stored) : 2;
  })(),
  lyricsPosition: (storage.get(STORAGE_KEYS.MELODIQ_LYRICS_POSITION) as any) || 'bottom',
  audioPlaybackMode: (storage.get(STORAGE_KEYS.MELODIQ_AUDIO_PLAYBACK_MODE) as any) || 'separated',
  showScoreboardQrCode: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_SHOW_SCOREBOARD_QR_CODE);
    return stored === '' ? true : stored === 'true';
  })(),
  micLatency: (() => {
    const stored = storage.get(STORAGE_KEYS.MELODIQ_MIC_LATENCY);
    return stored ? parseInt(stored) : 0;
  })(),
});

export const persistSettings = (s: SettingsState) => {
  storage.set(STORAGE_KEYS.MELODIQ_SHOW_OVERLAY, String(s.showDebugOverlay));
  storage.set(STORAGE_KEYS.MELODIQ_SHOW_SLIDER, String(s.showDevSlider));
  storage.set(STORAGE_KEYS.MELODIQ_SHOW_NOTE_LABELS, String(s.showNoteLabels));
  storage.set(STORAGE_KEYS.MELODIQ_SHOW_VIDEO_ERRORS, String(s.showVideoErrors));
  storage.setJson(STORAGE_KEYS.MELODIQ_CUSTOM_LAYOUTS, s.customLayouts);
  storage.set(STORAGE_KEYS.MELODIQ_CARD_SIZE, s.cardSize);
  storage.set(STORAGE_KEYS.MELODIQ_CUSTOM_TARGET_COLUMNS, String(s.customTarget));
  storage.set(STORAGE_KEYS.MELODIQ_SONG_VOLUME, String(s.songVolume));
  storage.set(STORAGE_KEYS.MELODIQ_MASTER_VOLUME, String(s.masterVolume));
  storage.set(STORAGE_KEYS.MELODIQ_VOCALS_VOLUME, String(s.vocalsVolume));
  storage.set(STORAGE_KEYS.HELPER_URL, s.helperUrl);
  storage.set(STORAGE_KEYS.HELPER_ACTIVE, String(s.enableHelper));
  storage.set(STORAGE_KEYS.MELODIQ_GOLDEN_NOTE_MULTIPLIER, String(s.goldenNoteMultiplier));
  storage.set(STORAGE_KEYS.MELODIQ_DEFAULT_SONG_CLICK_ACTION, s.defaultSongClickAction);
  storage.set(STORAGE_KEYS.MELODIQ_DEFAULT_VIEW_MODE, s.defaultViewMode);
  storage.set(STORAGE_KEYS.MELODIQ_AUTOPLAY_NO_PLAYERS, String(s.autoplayNoPlayersDelay));
  storage.set(STORAGE_KEYS.MELODIQ_AUTOPLAY_WITH_PLAYERS, String(s.autoplayWithPlayersDelay));
  storage.set(STORAGE_KEYS.MELODIQ_HIDE_BACKGROUND_VIDEO, String(s.hideBackgroundVideo));
  storage.set(STORAGE_KEYS.MELODIQ_FALLBACK_BACKGROUND_URL, s.fallbackBackgroundUrl);
  storage.set(STORAGE_KEYS.MELODIQ_LYRICS_SCALE, String(s.lyricsScale));
  storage.set(STORAGE_KEYS.MELODIQ_ENABLE_LYRICS_ZOOM, String(s.enableLyricsZoom));
  storage.set(STORAGE_KEYS.MELODIQ_LYRICS_LINES, String(s.lyricsLines));
  storage.set(STORAGE_KEYS.MELODIQ_LYRICS_POSITION, s.lyricsPosition);
  storage.set(STORAGE_KEYS.MELODIQ_AUDIO_PLAYBACK_MODE, s.audioPlaybackMode);
  storage.set(STORAGE_KEYS.MELODIQ_SHOW_SCOREBOARD_QR_CODE, String(s.showScoreboardQrCode));
  storage.set(STORAGE_KEYS.MELODIQ_MIC_LATENCY, String(s.micLatency));
};

export const persistSingleSetting = <K extends keyof SettingsState>(
  key: K,
  value: SettingsState[K],
) => {
  switch (key) {
    case 'showDebugOverlay':
      storage.set(STORAGE_KEYS.MELODIQ_SHOW_OVERLAY, String(value));
      break;
    case 'showDevSlider':
      storage.set(STORAGE_KEYS.MELODIQ_SHOW_SLIDER, String(value));
      break;
    case 'showNoteLabels':
      storage.set(STORAGE_KEYS.MELODIQ_SHOW_NOTE_LABELS, String(value));
      break;
    case 'showVideoErrors':
      storage.set(STORAGE_KEYS.MELODIQ_SHOW_VIDEO_ERRORS, String(value));
      break;
    case 'customLayouts':
      storage.setJson(STORAGE_KEYS.MELODIQ_CUSTOM_LAYOUTS, value);
      break;
    case 'cardSize':
      storage.set(STORAGE_KEYS.MELODIQ_CARD_SIZE, String(value));
      break;
    case 'customTarget':
      storage.set(STORAGE_KEYS.MELODIQ_CUSTOM_TARGET_COLUMNS, String(value));
      break;
    case 'songVolume':
      storage.set(STORAGE_KEYS.MELODIQ_SONG_VOLUME, String(value));
      break;
    case 'masterVolume':
      storage.set(STORAGE_KEYS.MELODIQ_MASTER_VOLUME, String(value));
      break;
    case 'vocalsVolume':
      storage.set(STORAGE_KEYS.MELODIQ_VOCALS_VOLUME, String(value));
      break;
    case 'helperUrl':
      storage.set(STORAGE_KEYS.HELPER_URL, String(value));
      break;
    case 'enableHelper':
      storage.set(STORAGE_KEYS.HELPER_ACTIVE, String(value));
      break;
    case 'goldenNoteMultiplier':
      storage.set(STORAGE_KEYS.MELODIQ_GOLDEN_NOTE_MULTIPLIER, String(value));
      break;
    case 'defaultSongClickAction':
      storage.set(STORAGE_KEYS.MELODIQ_DEFAULT_SONG_CLICK_ACTION, String(value));
      break;
    case 'defaultViewMode':
      storage.set(STORAGE_KEYS.MELODIQ_DEFAULT_VIEW_MODE, String(value));
      break;
    case 'autoplayNoPlayersDelay':
      storage.set(STORAGE_KEYS.MELODIQ_AUTOPLAY_NO_PLAYERS, String(value));
      break;
    case 'autoplayWithPlayersDelay':
      storage.set(STORAGE_KEYS.MELODIQ_AUTOPLAY_WITH_PLAYERS, String(value));
      break;
    case 'hideBackgroundVideo':
      storage.set(STORAGE_KEYS.MELODIQ_HIDE_BACKGROUND_VIDEO, String(value));
      break;
    case 'fallbackBackgroundUrl':
      storage.set(STORAGE_KEYS.MELODIQ_FALLBACK_BACKGROUND_URL, String(value));
      break;
    case 'lyricsScale':
      storage.set(STORAGE_KEYS.MELODIQ_LYRICS_SCALE, String(value));
      break;
    case 'enableLyricsZoom':
      storage.set(STORAGE_KEYS.MELODIQ_ENABLE_LYRICS_ZOOM, String(value));
      break;
    case 'lyricsLines':
      storage.set(STORAGE_KEYS.MELODIQ_LYRICS_LINES, String(value));
      break;
    case 'lyricsPosition':
      storage.set(STORAGE_KEYS.MELODIQ_LYRICS_POSITION, String(value));
      break;
    case 'audioPlaybackMode':
      storage.set(STORAGE_KEYS.MELODIQ_AUDIO_PLAYBACK_MODE, String(value));
      break;
    case 'showScoreboardQrCode':
      storage.set(STORAGE_KEYS.MELODIQ_SHOW_SCOREBOARD_QR_CODE, String(value));
      break;
    case 'micLatency':
      storage.set(STORAGE_KEYS.MELODIQ_MIC_LATENCY, String(value));
      break;
  }
};
