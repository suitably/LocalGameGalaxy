import React from 'react';
import { WebRTCHostProvider, useWebRTCHost } from '../../../lib/webrtc/WebRTCHostContext';
import { WebRTCMicManager, type MicRemotePeer } from './WebRTCMicManager';

export const useWebRTC = () => {
    return useWebRTCHost<MicRemotePeer, WebRTCMicManager>();
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <WebRTCHostProvider<MicRemotePeer, WebRTCMicManager>
            gameId="melodiq"
            createManager={(partyId, trackerUrls, callbacks) => {
                return new WebRTCMicManager(partyId, trackerUrls, callbacks);
            }}
        >
            {children}
        </WebRTCHostProvider>
    );
};
