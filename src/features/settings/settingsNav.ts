export type SettingsTabType = 'general' | 'server' | 'notifications' | 'melodiq';

export interface SettingsNavParams {
    activeTab: SettingsTabType;
    activeSub: string;
    activeSection: string;
    isFromMelodiq: boolean;
}

/**
 * Resolves the active settings tab, sub-tab, and section based on
 * URL search parameters, react-router location state, and optional activeGameId.
 *
 * Rules:
 * 1. If tab is explicitly specified ('general', 'server', 'notifications', 'melodiq') -> use it.
 * 2. If a known sub-tab is specified without tab:
 *    - 'server', 'signaling', 'trackers', 'companion' -> 'server'
 *    - 'microphones', 'profiles', 'gameplay', 'playlists' -> 'melodiq'
 *    - 'feedback', 'language', 'pat', 'github' -> 'general'
 *    - 'push', 'ntfy', 'relay' -> 'notifications'
 * 3. Default fallback:
 *    - If coming from Melodiq (game === 'melodiq' or from contains 'melodiq') -> 'melodiq'
 *    - For all other origins (main hub, other games) -> 'general'
 */
export function resolveSettingsNav(
    searchParams: URLSearchParams,
    locationState: Record<string, unknown> | null | undefined,
    activeGameId?: string
): SettingsNavParams {
    const state = (locationState && typeof locationState === 'object') ? locationState : {};
    const gameParam = (activeGameId || searchParams.get('game') || (typeof state.game === 'string' ? state.game : '')).toLowerCase();
    const fromPath = (typeof state.from === 'string' ? state.from : '').toLowerCase();
    const isFromMelodiq = gameParam === 'melodiq' || fromPath.includes('/games/melodiq') || fromPath.includes('melodiq') || (typeof window !== 'undefined' && window.location.pathname.includes('/games/melodiq'));

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
    } else if (tabParam === 'melodiq') {
        resolvedTab = subParam === 'server' ? 'server' : 'melodiq';
    } else if (['server', 'signaling', 'trackers', 'companion'].includes(subParam)) {
        resolvedTab = 'server';
    } else if (['microphones', 'profiles', 'gameplay', 'playlists'].includes(subParam)) {
        resolvedTab = 'melodiq';
    } else if (['feedback', 'language', 'pat', 'github'].includes(subParam)) {
        resolvedTab = 'general';
    } else if (['push', 'ntfy', 'relay'].includes(subParam)) {
        resolvedTab = 'notifications';
    }

    if (!resolvedTab) {
        resolvedTab = isFromMelodiq ? 'melodiq' : 'general';
    }

    return {
        activeTab: resolvedTab,
        activeSub: subParam || 'all',
        activeSection: sectionParam,
        isFromMelodiq,
    };
}
