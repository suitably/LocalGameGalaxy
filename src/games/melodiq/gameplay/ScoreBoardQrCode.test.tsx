import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ScoreBoardQrCode } from './ScoreBoardQrCode';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

let mockPartyId = '';
let mockActiveTrackerUrls: string[] = [];
let mockShowScoreboardQrCode = true;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (options && options.partyId) return `Party-ID: ${options.partyId}`;
            if (options && options.defaultValue) return options.defaultValue;
            return key;
        }
    })
}));

vi.mock('../hooks/SettingsContext', () => ({
    useMelodiqSettings: () => ({
        settings: {
            showScoreboardQrCode: mockShowScoreboardQrCode
        }
    })
}));

vi.mock('../audio/WebRTCContext', () => ({
    useWebRTC: () => ({
        partyId: mockPartyId,
        activeTrackerUrls: mockActiveTrackerUrls
    })
}));

describe('ScoreBoardQrCode', () => {
    beforeEach(() => {
        mockPartyId = '';
        mockActiveTrackerUrls = [];
        mockShowScoreboardQrCode = true;
        storage.remove(STORAGE_KEYS.MELODIQ_PARTY_ID);
    });

    it('returns null when partyId is TV-MODE and storage is empty', () => {
        mockPartyId = 'TV-MODE';
        const html = renderToString(<ScoreBoardQrCode />);
        expect(html).toBe('');
    });

    it('returns null when partyId is empty string', () => {
        mockPartyId = '';
        const html = renderToString(<ScoreBoardQrCode />);
        expect(html).toBe('');
    });

    it('returns null when showScoreboardQrCode is false', () => {
        mockPartyId = 'HOST123';
        mockShowScoreboardQrCode = false;
        const html = renderToString(<ScoreBoardQrCode />);
        expect(html).toBe('');
    });

    it('renders host partyId badge when partyId is valid', () => {
        mockPartyId = 'HOST123';
        const html = renderToString(<ScoreBoardQrCode />);
        expect(html).toContain('HOST123');
        expect(html).not.toContain('TV-MODE');
    });

    it('uses partyId from storage when webRTC partyId is TV-MODE', () => {
        mockPartyId = 'TV-MODE';
        storage.set(STORAGE_KEYS.MELODIQ_PARTY_ID, 'STORED99');
        const html = renderToString(<ScoreBoardQrCode />);
        expect(html).toContain('STORED99');
        expect(html).not.toContain('TV-MODE');
    });
});
