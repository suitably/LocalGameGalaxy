import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '../../../lib/storage';
import { parseFeedbackResult } from '../logic/feedbackRpc';
import { parseAssignedTrack } from '../gameplay/logic/trackChoice';
import { reportTrackAssignment } from '../gameplay/hooks/usePhoneTrackChoice';
import { ApiChunkBuffer } from '../logic/apiChunkBuffer';
import type { ClientProfile } from '../logic/clientProfile';
import type {
  MelodiqNetworkMessage,
  MelodiqParticipant,
  MelodiqProfile,
  MelodiqRosterMember,
  HostSettings,
  HostSettingsReply,
} from '../types';

interface HostPlayer {
  id?: string;
  deviceId?: string;
  name?: string;
  hue?: number;
  config?: MelodiqProfile;
}

const emit = (name: string, detail?: unknown) =>
  window.dispatchEvent(new CustomEvent(name, { detail }));

interface Options {
  getDeviceId: () => string;
  setClientRole: (role: string) => void;
  updateClientProfile: (updates: Partial<ClientProfile>) => void;
}

/**
 * Routes host messages to window events and keeps the derived session state
 * (`isSessionPlaying`, `activeSongId`). State only changes when those values change,
 * which avoids re-rendering on every 20 fps game-state update.
 */
export const usePhoneClientMessages = ({
  getDeviceId,
  setClientRole,
  updateClientProfile,
}: Options) => {
  const [isSessionPlaying, setIsSessionPlaying] = useState(false);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [hostSettings, setHostSettings] = useState<HostSettings | null>(null);

  const playingRef = useRef(isSessionPlaying);
  const activeSongRef = useRef(activeSongId);
  useEffect(() => {
    playingRef.current = isSessionPlaying;
  }, [isSessionPlaying]);
  useEffect(() => {
    activeSongRef.current = activeSongId;
  }, [activeSongId]);

  const chunkBufferRef = useRef(new ApiChunkBuffer());
  const lastSyncedSongIdRef = useRef<string | null>(null);

  const handleGameState = useCallback((state: NonNullable<MelodiqNetworkMessage['state']>) => {
    if (state.isPlaying !== playingRef.current) {
      setIsSessionPlaying(state.isPlaying);
      playingRef.current = state.isPlaying;
    }
    const activeId = state.activeSongId || null;
    if (activeId !== activeSongRef.current) {
      setActiveSongId(activeId);
      activeSongRef.current = activeId;
    }

    // Full game state for lightweight event listeners (lyrics, etc.)
    emit('melodiq_tv_game_state', state);

    // Auto-sync session view if the phone joined late, reloaded, or a new song started
    const activeSong = state.activeSong || (activeId ? { id: activeId } : null);
    const players = state.players as unknown as HostPlayer[] | undefined;
    const participants = players?.map(
      (p) =>
        p.config || {
          profileId: p.id,
          deviceId: p.deviceId || p.id,
          name: p.name,
          hue: p.hue,
          isRemote: true,
        },
    );
    if (activeId && activeId !== lastSyncedSongIdRef.current) {
      lastSyncedSongIdRef.current = activeId;
      emit('melodiq_client_session_sync', { activeSong, participants });
    } else if (!activeId && lastSyncedSongIdRef.current) {
      lastSyncedSongIdRef.current = null;
      emit('melodiq_client_session_sync', { activeSong: null, participants });
    }
  }, []);

  const handleSessionSync = useCallback(
    (data: MelodiqNetworkMessage) => {
      emit('melodiq_client_session_sync', data);
      if (data.activeSong && data.participants) {
        const isSinger = data.participants.some(
          (p: MelodiqParticipant) => p.deviceId === getDeviceId(),
        );
        setClientRole(isSinger ? 'singer' : 'spectator');
        updateClientProfile({ displayMode: isSinger ? 'self' : 'lyrics' });
      } else if (!data.activeSong) {
        setClientRole('spectator');
        updateClientProfile({ displayMode: 'lyrics' });
      }
    },
    [getDeviceId, setClientRole, updateClientProfile],
  );

  const handleChunk = useCallback((data: MelodiqNetworkMessage) => {
    const { reqId, chunk, index, total } = data;
    if (!reqId || index === undefined || total === undefined) return;

    const result = chunkBufferRef.current.add(reqId, index, total, chunk as string);
    if (result.status === 'complete') {
      emit(`melodiq_api_response_${reqId}`, result.payload);
    } else if (result.status === 'error') {
      console.error('[PhoneClientEngine] Failed to parse reassembled api_response');
      emit(`melodiq_api_response_${reqId}`, {
        reqId,
        status: 500,
        error: 'Chunk reassembly parse failed',
      });
    }
  }, []);

  const handleMessage = useCallback(
    (data: MelodiqNetworkMessage) => {
      if (!data || !data.type) return;

      switch (data.type) {
        case 'game_state_update':
          if (data.state) handleGameState(data.state);
          break;
        case 'queue.update':
          emit('melodiq_client_queue_update', data);
          break;
        case 'session_sync':
          handleSessionSync(data);
          break;
        case 'roster.update': {
          const me = Array.isArray(data.roster)
            ? data.roster.find((r: MelodiqRosterMember) => r.deviceId === getDeviceId())
            : undefined;
          if (me && me.role) setClientRole(me.role);
          break;
        }
        case 'api_response_chunk':
          handleChunk(data);
          break;
        case 'api_response':
          // Legacy fallback for small responses sent without chunking
          emit(`melodiq_api_response_${data.reqId}`, data);
          break;
        case 'host.settings.state':
          setHostSettings((data as unknown as HostSettingsReply).settings);
          break;
        case 'host.feedback.result': {
          const result = parseFeedbackResult(data);
          if (result) emit(`melodiq_feedback_result_${result.reqId}`, result);
          break;
        }
        case 'songInfo': {
          const assignment = parseAssignedTrack(data);
          if (assignment) reportTrackAssignment(assignment);
          break;
        }
        case 'helper_config':
          if (data.url) {
            storage.setHelperUrl(data.url as string);
            storage.setHelperActive(true);
            window.dispatchEvent(new Event('melodiq_settings_updated'));
          }
          break;
      }
    },
    [getDeviceId, setClientRole, handleGameState, handleSessionSync, handleChunk],
  );

  return { handleMessage, isSessionPlaying, activeSongId, hostSettings };
};
