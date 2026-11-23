import { useWebRTCHost } from '../../../lib/webrtc';
import type { WebRTCMicManager, MicRemotePeer } from './WebRTCMicManager';

export const useWebRTC = () => {
  return useWebRTCHost<MicRemotePeer, WebRTCMicManager>();
};
