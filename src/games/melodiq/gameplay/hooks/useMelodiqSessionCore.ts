import { useState, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type React from 'react';
import { useMelodiqSettings } from '../../hooks/settingsContextCore';
import { useWebRTC } from '../../audio/webRTCContextCore';
import { useScreenOrientation } from '../../../../hooks/useScreenOrientation';
import { useMediaLoaders } from './useMediaLoaders';
import { useSessionPlayers } from './useSessionPlayers';
import { useSessionEnd } from './useSessionEnd';
import { usePassiveSync } from './usePassiveSync';
import { useSessionAudioController } from './useSessionAudioController';
import { useSessionScoringController } from './useSessionScoringController';
import { useSongVocals } from './useSongVocals';
import { useSessionResultsBroadcast } from './useSessionResultsBroadcast';
import type { MelodiqSessionHandle, MelodiqSessionProps } from '../types';
import type { PlayerRuntime } from './PlayerRuntime';
import type { SessionResult } from './useSessionEnd';
type SetPlayers = React.Dispatch<React.SetStateAction<PlayerRuntime[]>>;

/** All state of a running session: media, audio, players, scoring, passive sync and the handle. */
export function useMelodiqSessionCore(
  props: MelodiqSessionProps,
  ref: React.ForwardedRef<MelodiqSessionHandle>,
) {
  const {
    song,
    initialTime,
    onExit,
    onPlaybackUpdate,
    isTVMode = false,
    muteAudio = false,
    isPassive = false,
    passiveState,
    activeSessionOverride = null,
    isClient = false,
    clientDeviceId,
    hasTv = false,
  } = props;
  const { settings } = useMelodiqSettings();
  const { manager, activePeers } = useWebRTC();
  useScreenOrientation('landscape');

  const [results, setResults] = useState<SessionResult[]>([]);
  const { parsedSong, contentLoading, loadError } = useSongVocals(song);

  const {
    audioSrc,
    videoSrc,
    vocalsSrc,
    needsFolderAccess,
    videoError,
    setVideoError,
    folderInputRef,
    handleFolderInputChange,
  } = useMediaLoaders(song, parsedSong, isClient, settings.audioPlaybackMode ?? 'separated');

  // `useSessionPlayers` needs `switchTrack` and returns `setPlayers`: the ref breaks the cycle
  const setPlayersRef = useRef<SetPlayers | null>(null);
  const switchTrack = useCallback(
    (playerIndex: number, trackIndex: number) => {
      setPlayersRef.current?.((prev) => {
        const newPlayers = [...prev];
        const p = newPlayers[playerIndex];
        if (p) {
          p.trackIndex =
            parsedSong?.tracks && trackIndex < parsedSong.tracks.length ? trackIndex : 0;
          p.activeSegments = {};
        }
        return newPlayers;
      });
    },
    [parsedSong],
  );

  const audioCtrl = useSessionAudioController({
    songId: song.id,
    audioSrc,
    vocalsSrc,
    videoSrc,
    initialTime,
    muteAudio,
    songVolume: settings.songVolume,
    masterVolume: settings.masterVolume,
    vocalsVolume: settings.vocalsVolume ?? 1.0,
    audioPlaybackMode: settings.audioPlaybackMode,
    isPassive,
    passiveState,
    isClient,
    ready: !contentLoading && !!parsedSong,
    contentLoading,
    parsedSong,
    onExit,
    onPlaybackUpdate,
  });

  const { players, setPlayers, playersRef, ready } = useSessionPlayers({
    manager,
    activePeers,
    parsedSong,
    song,
    switchTrack,
    setResults,
    onExit,
    audioRef: audioCtrl.audioRef,
    vocalsRef: audioCtrl.vocalsRef,
    videoRef: audioCtrl.videoRef,
    activeSessionOverride,
    isPassive,
  });

  useEffect(() => {
    setPlayersRef.current = setPlayers;
  }, [setPlayers]);

  const { handleSongEnd: handleSongEndBound } = useSessionEnd({
    playersRef,
    song,
    setResults,
    setIsFinished: audioCtrl.setIsFinished,
    setIsPlaying: audioCtrl.setIsPlaying,
    videoRef: audioCtrl.videoRef,
    isTVMode,
  });

  const scoringCtrl = useSessionScoringController({
    players,
    ready,
    audioRef: audioCtrl.audioRef,
    vocalsRef: audioCtrl.vocalsRef,
    videoRef: audioCtrl.videoRef,
    virtualTimeRef: audioCtrl.virtualTimeRef,
    isPlayingRef: audioCtrl.isPlayingRef,
    parsedSong,
    goldenNoteMultiplier: settings.goldenNoteMultiplier,
    isPassive,
    passiveState,
    isClient,
    duration: audioCtrl.duration,
    micLatency: settings.micLatency || 0,
    onPlaybackUpdate,
    activeSessionOverride,
    clientDeviceId,
    customLayouts: settings.customLayouts,
    hasTv,
    isTVMode,
  });

  usePassiveSync({
    isPassive,
    passiveState: passiveState || null,
    isClient,
    isTVMode,
    players,
    setPlayers,
    playersRef,
    scoreDisplayRef: scoringCtrl.scoreDisplayRef,
    audioRef: audioCtrl.audioRef,
    vocalsRef: audioCtrl.vocalsRef,
    videoRef: audioCtrl.videoRef,
    isPlayingRef: audioCtrl.isPlayingRef,
    setIsPlaying: audioCtrl.setIsPlaying,
    setIsFinished: audioCtrl.setIsFinished,
    setIsPausedForScore: audioCtrl.setIsPausedForScore,
    setPassivePlayBlocked: audioCtrl.setPassivePlayBlocked,
    virtualTimeRef: audioCtrl.virtualTimeRef,
  });

  useSessionResultsBroadcast({
    enabled: hasTv && !isPassive && !isClient,
    isFinished: audioCtrl.isFinished,
    songId: song.id,
    results,
  });

  useImperativeHandle(
    ref,
    () => ({
      togglePlay: audioCtrl.togglePlay,
      isPlaying: audioCtrl.isPlaying,
      getDuration: () => audioCtrl.audioRef.current?.duration || 0,
      getCurrentTime: () => audioCtrl.audioRef.current?.currentTime || 0,
      finishSong: handleSongEndBound,
      isFinished: audioCtrl.isFinished,
      pauseForScore: audioCtrl.pauseForScore,
      resumeFromScore: audioCtrl.resumeFromScore,
      isPausedForScore: audioCtrl.isPausedForScore,
      handleNext: audioCtrl.handleNext,
    }),
    [audioCtrl, handleSongEndBound],
  );

  return {
    settings,
    parsedSong,
    contentLoading,
    loadError,
    audioSrc,
    videoSrc,
    vocalsSrc,
    needsFolderAccess,
    videoError,
    setVideoError,
    folderInputRef,
    handleFolderInputChange,
    switchTrack,
    audioCtrl,
    players,
    ready,
    results,
    scoringCtrl,
    handleSongEndBound,
  };
}

export type MelodiqSessionCore = ReturnType<typeof useMelodiqSessionCore>;
