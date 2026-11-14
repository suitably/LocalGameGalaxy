import { useMediaQuery } from '@mui/material';
import { isPhoneScreen } from '../logic/stageLanes';

/** This device is a phone: one singer's own screen, not a shared one (rule in `stageLanes.ts`). */
export const usePhoneScreen = (): boolean => {
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  if (typeof window === 'undefined') return false;
  return isPhoneScreen(coarsePointer, window.screen.width, window.screen.height);
};
