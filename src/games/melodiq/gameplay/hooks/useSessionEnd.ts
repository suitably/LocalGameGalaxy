import { useCallback } from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import { type Song } from '../../db';
import type { NavigatorWithPresentation } from '../../types';
import type { ScoreBoardPlayer } from '../logic/scoreBoardRanking';
import type { RemoteResultEntry } from './usePeerSessionMessages';
import { addPlayerScore, getPlayerScores } from '../../logic/melodiqRepository';
import { useMultiChannelSync } from '../../../../modules/sync';
import { TV_CONTROL_SYNC, type TvControlMessage } from '../../logic/syncChannels';
import { createLogger } from '../../../../lib/logger';

const log = createLogger('MelodiqSession');

/** One scoreboard row of the session just ended. */
export type SessionResult = ScoreBoardPlayer & RemoteResultEntry;

/** Publish-only: this hook never listens, so it opens no channel (`enabled: false`). */
const ignoreMessages = (): void => {};

interface UseSessionEndProps {
  playersRef: React.RefObject<PlayerRuntime[]>;
  song: Song;
  setResults: React.Dispatch<React.SetStateAction<SessionResult[]>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isTVMode?: boolean;
}

export function useSessionEnd({
  playersRef,
  song,
  setResults,
  setIsFinished,
  setIsPlaying,
  videoRef,
  isTVMode,
}: UseSessionEndProps) {
  const { publish: publishLocal } = useMultiChannelSync<TvControlMessage>({
    ...TV_CONTROL_SYNC,
    enabled: false,
    onMessage: ignoreMessages,
  });

  const handleSongEnd = useCallback(async () => {
    log.debug('Song ended, showing scoreboard');

    const now = new Date();
    const currentResults: SessionResult[] = [];
    const isoDate = now.toISOString();

    if (!playersRef.current) return;

    for (const p of playersRef.current) {
      const totalScore = Math.round(Object.values(p.trackScores).reduce((a, b) => a + b, 0));
      p.score = totalScore;

      if (p.config.isRemote) {
        if (p.webRtcManager && p.remotePeerId) {
          const statsPayload = {
            type: 'stats',
            songTitle: song.title,
            score: totalScore,
            date: isoDate,
          };
          log.debug(`Sending stats to ${p.config.name}`);
          p.webRtcManager.sendToPeer(p.remotePeerId, statsPayload);
        }

        currentResults.push({
          config: p.config,
          score: totalScore,
          history: [],
          isNewRecord: false,
          isRemote: true,
          loadingHistory: true,
        });
      } else {
        try {
          await addPlayerScore({
            songId: song.id,
            profileId: p.config.id,
            score: totalScore,
            date: isoDate,
          });

          const allScores = await getPlayerScores(song.id, p.config.id);

          const sorted = allScores.sort((a, b) => b.score - a.score);
          const isRecord = sorted.length > 0 && sorted[0].date === isoDate;

          currentResults.push({
            config: p.config,
            score: totalScore,
            history: sorted,
            isNewRecord: isRecord,
            isRemote: false,
            loadingHistory: false,
          });
        } catch (e) {
          console.error('Failed to save score', e);
          currentResults.push({
            config: p.config,
            score: totalScore,
            history: [],
            isNewRecord: false,
            isRemote: false,
          });
        }
      }
    }

    setResults(currentResults);
    setIsFinished(true);
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();

    if (isTVMode) {
      publishLocal({ type: 'SONG_ENDED' });

      // Also notify via Presentation API if available
      const nav = navigator as NavigatorWithPresentation;
      if (nav.presentation?.receiver?.connectionList) {
        nav.presentation.receiver.connectionList
          .then((list) => {
            if (list && list.connections) {
              list.connections.forEach((conn) => {
                try {
                  conn.send(JSON.stringify({ type: 'SONG_ENDED' }));
                } catch (e) {
                  console.error('Failed to send SONG_ENDED to presentation connection:', e);
                }
              });
            }
          })
          .catch((err: unknown) => {
            console.error('Failed to get presentation connection list:', err);
          });
      }
    }
  }, [
    song.title,
    song.id,
    playersRef,
    setResults,
    setIsFinished,
    setIsPlaying,
    videoRef,
    isTVMode,
    publishLocal,
  ]);

  return { handleSongEnd };
}
