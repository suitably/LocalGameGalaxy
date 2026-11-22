import { registerGameBundle } from '../../../lib/i18n/gameBundle';
import de from './de.json';
import en from './en.json';

const bundle = { de, en };

/** Registers Drawpot's own strings (`./de.json`, `./en.json`); safe to call more than once. */
export const initDrawPotI18n = (): void => registerGameBundle(bundle);
