import { useState, useEffect, useRef } from 'react';
import type { SettingsState } from './SettingsContext';

type VolumeKey = 'songVolume' | 'vocalsVolume' | 'masterVolume';

export interface VolumeSlider {
  /** Percent value (0-100) shown while dragging. */
  value: number;
  /** Updates the local value and notifies the player directly (no app re-render). */
  onChange: (percent: number) => void;
  /** Persists the final value into the settings. */
  onCommit: (percent: number) => void;
}

/**
 * Local slider state for the three volume sliders so dragging stays smooth at 60fps:
 * during a drag only `melodiq_direct_volume` is dispatched, the setting is saved on release.
 */
export function useDirectVolumeSliders(
  settings: SettingsState,
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void,
) {
  const [song, setSong] = useState(Math.round(settings.songVolume * 100));
  const [vocals, setVocals] = useState(Math.round((settings.vocalsVolume ?? 1.0) * 100));
  const [master, setMaster] = useState(Math.round(settings.masterVolume * 100));

  // Synchronize local slider values if settings change externally
  const prevSettingsRef = useRef(settings);
  useEffect(() => {
    if (prevSettingsRef.current.songVolume !== settings.songVolume) {
      setSong(Math.round(settings.songVolume * 100));
    }
    if (prevSettingsRef.current.vocalsVolume !== settings.vocalsVolume) {
      setVocals(Math.round((settings.vocalsVolume ?? 1.0) * 100));
    }
    if (prevSettingsRef.current.masterVolume !== settings.masterVolume) {
      setMaster(Math.round(settings.masterVolume * 100));
    }
    prevSettingsRef.current = settings;
  }, [settings.songVolume, settings.vocalsVolume, settings.masterVolume]); // eslint-disable-line react-hooks/exhaustive-deps

  const build = (
    key: VolumeKey,
    value: number,
    setValue: (percent: number) => void,
  ): VolumeSlider => ({
    value,
    onChange: (percent) => {
      setValue(percent);
      window.dispatchEvent(
        new CustomEvent('melodiq_direct_volume', { detail: { [key]: percent / 100 } }),
      );
    },
    onCommit: (percent) => onUpdateSetting(key, percent / 100),
  });

  return {
    song: build('songVolume', song, setSong),
    vocals: build('vocalsVolume', vocals, setVocals),
    master: build('masterVolume', master, setMaster),
  };
}
