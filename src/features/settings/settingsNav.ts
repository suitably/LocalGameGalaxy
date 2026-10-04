export type SettingsTabType = 'general' | 'server' | 'notifications' | 'melodiq' | 'melodiq-notes';

export interface SettingsNavParams {
    activeTab: SettingsTabType;
    activeSub: string;
    activeSection: string;
    isFromMelodiq: boolean;
    isFromMelodiqNotes?: boolean;
}

/**
 * Resolves the active settings tab, sub-tab, and section based on
 * URL search parameters, react-router location state, and optional activeGameId.
 */
export function resolveSettingsNav(
    searchParams: URLSearchParams,
    locationState: Record<string, unknown> | null | undefined,
    activeGameId?: string
): SettingsNavParams {
    const state = (locationState && typeof locationState === 'object') ? locationState : {};
    const gameParam = (activeGameId || searchParams.get('game') || (typeof state.game === 'string' ? state.game : '')).toLowerCase();
    const fromPath = (typeof state.from === 'string' ? state.from : '').toLowerCase();
    const isFromMelodiqNotes = gameParam === 'melodiq-notes' || fromPath.includes('/games/melodiq-notes') || fromPath.includes('melodiq-notes');
    const isFromMelodiq = !isFromMelodiqNotes && (gameParam === 'melodiq' || fromPath.includes('/games/melodiq') || fromPath.includes('melodiq') || (typeof window !== 'undefined' && window.location.pathname.includes('/games/melodiq')));

    const tabParam = (searchParams.get('tab') || (typeof state.tab === 'string' ? state.tab : '')).toLowerCase();
    const subParam = (searchParams.get('sub') || (typeof state.sub === 'string' ? state.sub : '')).toLowerCase();
    const sectionParam = (searchParams.get('section') || (typeof state.section === 'string' ? state.section : '')).toLowerCase();

    let resolvedTab: SettingsTabType | null = null;
    if (tabParam === 'general') {
        resolvedTab = 'general';
    } else if (tabParam === 'server' || tabParam === 'signaling') {
        resolvedTab = 'server';
    } else if (tabParam === 'notifications' || tabParam === 'push' || tabParam === 'ntfy') {
        resolvedTab = 'notifications';
    } else if (tabParam === 'melodiq-notes' || tabParam === 'notes' || tabParam === 'instruments') {
        resolvedTab = 'melodiq-notes';
    } else if (tabParam === 'melodiq') {
        resolvedTab = subParam === 'server' ? 'server' : 'melodiq';
    } else if (['server', 'signaling', 'trackers', 'companion'].includes(subParam)) {
        resolvedTab = 'server';
    } else if (['microphones', 'profiles', 'gameplay', 'playlists'].includes(subParam)) {
        resolvedTab = 'melodiq';
    } else if (['sounds', 'soundfont', 'instruments'].includes(subParam)) {
        resolvedTab = 'melodiq-notes';
    } else if (['feedback', 'language', 'pat', 'github'].includes(subParam)) {
        resolvedTab = 'general';
    } else if (['push', 'ntfy', 'relay'].includes(subParam)) {
        resolvedTab = 'notifications';
    }

    if (!resolvedTab) {
        resolvedTab = isFromMelodiqNotes ? 'melodiq-notes' : (isFromMelodiq ? 'melodiq' : 'general');
    }

    return {
        activeTab: resolvedTab,
        activeSub: subParam || 'all',
        activeSection: sectionParam,
        isFromMelodiq,
        isFromMelodiqNotes,
    };
}
