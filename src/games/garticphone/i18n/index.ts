import { registerGameBundle } from '../../../lib/i18n/gameBundle';
import de from './de.json';
import en from './en.json';

const bundle = { de, en };

/** Registers Gartic Phone's own strings (`./de.json`, `./en.json`); safe to call more than once. */
export const initGarticPhoneI18n = (): void => registerGameBundle(bundle);
