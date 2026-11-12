import { useMediaQuery } from '@mui/material';

/**
 * Portrait phone: too narrow for side-by-side lanes, so duet lyrics and pitch lanes stack.
 * Holds for the phone as mic and for the phone as standalone host alike; a TV or tablet keeps
 * the side-by-side layout.
 */
export const STACKED_STAGE_QUERY = '(orientation: portrait) and (max-width: 719.95px)';

export const useStackedStage = (): boolean => useMediaQuery(STACKED_STAGE_QUERY);
