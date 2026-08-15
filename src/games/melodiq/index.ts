export { MelodiqGame } from './MelodiqGame';
export { MelodiqTV } from './MelodiqTV';
export { MelodiqQueue } from './components/MelodiqQueue';
export { useSongs, SongsProvider } from './hooks/useSongs';
export { SettingsProvider, useMelodiqSettings, DEFAULT_SETTINGS, type SettingsState } from './hooks/SettingsContext';
export { QueueProvider } from './hooks/useQueue';
export { useProfiles } from './hooks/useProfiles';
export { HardwareMicSetup } from './components/HardwareMicSetup';
export { UserProfilesManager } from './components/UserProfilesManager';
export { GameSettingsPanel } from './components/GameSettingsPanel';
export { HelperConnection } from './components/HelperConnection';
export { MicrophoneManager } from './audio/MicrophoneManager';
export { initMelodiqI18n } from './i18n';
export type { UserProfile, ActivePlayer } from './types';
export { default as db } from './db';
export { PhoneClientEngine } from './PhoneClientEngine';

