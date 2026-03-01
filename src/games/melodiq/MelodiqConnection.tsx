import React from 'react';
import { DeviceConnection } from '../../components/connection/DeviceConnection';
import { useWebRTC } from './audio/WebRTCContext';

interface MelodiqConnectionProps {
    onBack: () => void;
}

export const MelodiqConnection: React.FC<MelodiqConnectionProps> = ({ onBack }) => {
    return (
        <DeviceConnection
            onBack={onBack}
            title="Connect Phones"
            description="Connect your phone to use as a microphone. Scan the QR code below."
            gameId="melodiq"
            clientPath="/games/melodiq/phone"
            WebRTCHostContextHook={useWebRTC}
        />
    );
};
