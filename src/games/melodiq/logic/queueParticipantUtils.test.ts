import { describe, it, expect } from 'vitest';
import { enrichQueueParticipants } from './queueParticipantUtils';
import type { MelodiqProfile, ActivePlayer } from '../types';

describe('enrichQueueParticipants', () => {
    it('should correctly enrich a BOT player', () => {
        const activeSession: ActivePlayer[] = [
            { profileId: 'BOT', deviceId: 'bot-device' }
        ];
        const storedProfiles: MelodiqProfile[] = [];

        const result = enrichQueueParticipants(activeSession, storedProfiles);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            profileId: 'BOT',
            deviceId: 'bot-device',
            name: 'Bot Player',
            hue: 330,
            isRemote: false
        });
    });

    it('should enrich player using stored profile', () => {
        const activeSession: ActivePlayer[] = [
            { profileId: 'user1', deviceId: 'dev1' }
        ];
        const storedProfiles: MelodiqProfile[] = [
            { id: 'user1', deviceId: 'dev1', name: 'Alice', hue: 120 }
        ];

        const result = enrichQueueParticipants(activeSession, storedProfiles);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            profileId: 'user1',
            deviceId: 'dev1',
            name: 'Alice',
            hue: 120,
            isRemote: false
        });
    });

    it('should retain isRemote flag from active session if present', () => {
        const activeSession: ActivePlayer[] = [
            { profileId: 'user1', deviceId: 'dev1', isRemote: true }
        ];
        const storedProfiles: MelodiqProfile[] = [
            { id: 'user1', deviceId: 'dev1', name: 'Bob', hue: 200 }
        ];

        const result = enrichQueueParticipants(activeSession, storedProfiles);

        expect(result).toHaveLength(1);
        expect(result[0].isRemote).toBe(true);
    });

    it('should fallback gracefully when stored profile is missing', () => {
        const activeSession: ActivePlayer[] = [
            { profileId: 'unknown', deviceId: 'dev2' }
        ];
        const storedProfiles: MelodiqProfile[] = [];

        const result = enrichQueueParticipants(activeSession, storedProfiles);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            profileId: 'unknown',
            deviceId: 'dev2'
        });
    });
});
