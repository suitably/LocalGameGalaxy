import type { MelodiqProfile, MelodiqParticipant, ActivePlayer } from '../types';

export function enrichQueueParticipants(activeSession: ActivePlayer[], storedProfiles: MelodiqProfile[]): MelodiqParticipant[] {
    return activeSession.map(p => {
        if (p.profileId === 'BOT') return { ...p, name: 'Bot Player', hue: 330, isRemote: false, deviceId: p.deviceId };
        const profile = storedProfiles.find(prof => prof.id === p.profileId);
        return profile ? { ...p, name: profile.name, hue: profile.hue, isRemote: p.isRemote ?? false, deviceId: p.deviceId } : { ...p, deviceId: p.deviceId };
    });
}
