/** Bottom safe-area inset (Capacitor plugin variable, with the CSS env() fallback). */
export const SAFE_AREA_BOTTOM = 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))';

/** Height of the fixed MiniPlayer bar including the bottom safe area. Content above it reserves this much. */
export const MINI_PLAYER_OFFSET = `calc(64px + ${SAFE_AREA_BOTTOM})`;
