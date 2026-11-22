/**
 * Per-game translation bundles (phase 6.2 of GAME-CATALOG-RESTRUCTURE, ADR-0011 §6).
 *
 * Every game keeps its own strings in `src/games/<id>/i18n/{de,en}.json` under the same key
 * paths it uses with `t()`. The game's `i18n/index.ts` registers them through
 * `registerGameBundle`, called from the game's barrel (`src/games/<id>/index.ts`) and from any
 * module outside the game folder that renders the game's components. Hub titles and
 * descriptions stay in `public/locales` because the hub lists games before their chunk loads.
 */
import i18n from 'i18next';

export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

export interface GameBundle {
  de: TranslationTree;
  en: TranslationTree;
}

const registered = new WeakSet<GameBundle>();

const addBundle = (bundle: GameBundle): void => {
  i18n.addResourceBundle('de', 'translation', bundle.de, true, true);
  i18n.addResourceBundle('en', 'translation', bundle.en, true, true);
};

/**
 * Merges a game's bundle into the `translation` namespace once. Before i18next has loaded the
 * global locale the merge waits for `initialized`: the backend replaces top-level objects such
 * as `games` when it loads, which would drop keys added earlier.
 */
export const registerGameBundle = (bundle: GameBundle): void => {
  if (registered.has(bundle)) return;
  registered.add(bundle);
  if (i18n.isInitialized) {
    addBundle(bundle);
    return;
  }
  const onInitialized = () => {
    i18n.off('initialized', onInitialized);
    addBundle(bundle);
  };
  i18n.on('initialized', onInitialized);
};
