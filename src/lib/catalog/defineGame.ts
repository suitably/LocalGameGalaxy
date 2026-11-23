/**
 * Helpers for `definition.tsx` files: lazy pages and route entries [ID: LIB-CATALOG-DEFINE]
 */
import { lazy, type ComponentType } from 'react';
import type { GameDefinition } from './types';

/** Lazily loads the named export of a module; importing a definition pulls in no page code. */
export function lazyNamed<M, K extends keyof M & string>(load: () => Promise<M>, name: K) {
  return lazy(() => load().then((mod) => ({ default: mod[name] as unknown as ComponentType })));
}

type RouteGameInput = Omit<GameDefinition, 'launch' | 'route' | 'titleKey' | 'descKey'> & {
  /** Route without leading slash. */
  route: string;
  /** Where a tile opens, when not the page itself (a game only the party lobby starts). */
  opens?: string;
  /** i18n prefix; title and description keys are `<prefix>.title` / `<prefix>.description`. */
  i18n: string;
};

/** A game with its own page; `launch` and the i18n keys follow from `route` and `i18n`. */
export function defineGame({ i18n, route, opens, ...rest }: RouteGameInput): GameDefinition {
  return {
    ...rest,
    route,
    launch: { type: 'route', route: opens ?? `/${route}` },
    titleKey: `${i18n}.title`,
    descKey: `${i18n}.description`,
  };
}
