/**
 * Touch-target sizes (DESIGN.md §4): >= 48px everywhere, >= 56px for primary
 * actions on phone controllers.
 */
export const TOUCH_TARGET = 48;
export const CONTROLLER_TARGET = 56;

/**
 * Invisible hit-area expansion for controls whose visual size must stay small.
 * The overlay is centred on the element and at least `size` px high (and wide,
 * unless `axis: 'y'` is passed, e.g. for dense rows of cells or chips).
 * Spread into an `sx` object; the element becomes `position: relative`.
 */
export function invisibleHitArea(size: number = TOUCH_TARGET, axis: 'both' | 'y' = 'both') {
  return {
    position: 'relative' as const,
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      minHeight: size,
      height: '100%',
      width: axis === 'y' ? '100%' : undefined,
      minWidth: axis === 'y' ? undefined : size,
    },
  };
}
