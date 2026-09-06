import React from 'react';
import { WebRTCHostProvider, useWebRTCHost, WebRTCHostContext } from '../../../lib/webrtc';
import { WebRTCMicManager, type MicRemotePeer } from './WebRTCMicManager';

export const useWebRTC = () => {
    return useWebRTCHost<MicRemotePeer, WebRTCMicManager>();
};

const createMicManager = (partyId: string, trackerUrls: string[], callbacks: any) => {
    return new WebRTCMicManager(partyId, trackerUrls, callbacks);
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <WebRTCHostProvider<MicRemotePeer, WebRTCMicManager>
            gameId="melodiq"
            createManager={createMicManager}
        >
            {children}
        </WebRTCHostProvider>
    );
};


export const WebRTCMockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <WebRTCHostContext.Provider value={{
            manager: null,
            peers: [],
            activePeers: [],
            inactivePeers: [],
            togglePeerActive: () => {},
            partyId: '',
            regeneratePartyId: () => {},
            trackerUrls: [],
            activeTrackerUrls: [],
            disabledTrackerUrls: [],
            allTrackers: [],
            toggleTrackerActive: () => {},
            addTrackerUrl: () => {},
            removeTrackerUrl: () => {},
            restoreDefaultTrackers: () => {}
        }}>
            {children}
        </WebRTCHostContext.Provider>
    );
};
