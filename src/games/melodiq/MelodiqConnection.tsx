import React from 'react';
import { DeviceConnection } from '../../components/connection/DeviceConnection';
import { useWebRTC } from './audio/WebRTCContext';
import { useClientRoles } from './hooks/useClientRoles';
import type { ClientRole } from './types';
import { Select, MenuItem } from '@mui/material';

interface MelodiqConnectionProps {
    onBack: () => void;
}

export const MelodiqConnection: React.FC<MelodiqConnectionProps> = ({ onBack }) => {
    const { getRole, setRole } = useClientRoles();

    return (
        <DeviceConnection
            onBack={onBack}
            title="Connect Phones"
            description="Connect your phone to use as a microphone. Scan the QR code below."
            gameId="melodiq"
            clientPath="/games/melodiq?role=client"
            WebRTCHostContextHook={useWebRTC}
            helperStorageKey="melodiq_helper_url"
            helperTokenKey="melodiq_helper_token"
            renderPeerExtra={(peer) => (
                <Select
                    size="small"
                    value={getRole(peer.deviceId || peer.peerId)}
                    onChange={(e) => {
                        setRole(peer.deviceId || peer.peerId, e.target.value as ClientRole);
                    }}
                    sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', height: 32, '& .MuiSelect-icon': { color: 'white' } }}
                >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="queue_manager">Queue Manager</MenuItem>
                    <MenuItem value="queue_contributor">Queue Contributor</MenuItem>
                    <MenuItem value="singer">Singer</MenuItem>
                </Select>
            )}
        />
    );
};
