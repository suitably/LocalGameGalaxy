import { describe, it, expect } from 'vitest';
import { resolveSettingsNav } from './settingsNav';

describe('resolveSettingsNav', () => {
    it('resolves melodiq tab and sub-tabs from searchParams', () => {
        const params1 = new URLSearchParams('tab=melodiq');
        expect(resolveSettingsNav(params1, null, 'melodiq')).toEqual({
            activeTab: 'melodiq',
            activeSub: 'all',
            activeSection: '',
            isFromMelodiq: true,
        });

        const params2 = new URLSearchParams('tab=melodiq&sub=microphones');
        expect(resolveSettingsNav(params2, null, 'melodiq')).toEqual({
            activeTab: 'melodiq',
            activeSub: 'microphones',
            activeSection: '',
            isFromMelodiq: true,
        });

        const params3 = new URLSearchParams('tab=melodiq&sub=server');
        expect(resolveSettingsNav(params3, null, 'melodiq')).toEqual({
            activeTab: 'server',
            activeSub: 'server',
            activeSection: '',
            isFromMelodiq: true,
        });

        const params4 = new URLSearchParams('tab=server');
        expect(resolveSettingsNav(params4, null)).toEqual({
            activeTab: 'server',
            activeSub: 'all',
            activeSection: '',
            isFromMelodiq: false,
        });

        const params5 = new URLSearchParams('sub=signaling');
        expect(resolveSettingsNav(params5, null)).toEqual({
            activeTab: 'server',
            activeSub: 'signaling',
            activeSection: '',
            isFromMelodiq: false,
        });
    });
});
