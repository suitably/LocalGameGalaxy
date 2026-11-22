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
  /** i18n prefix; title and description keys are `<prefix>.title` / `<prefix>.description`. */
  i18n: string;
};

/** A game with its own page; `launch` and the i18n keys follow from `route` and `i18n`. */
export function defineGame({ i18n, route, ...rest }: RouteGameInput): GameDefinition {
  return {
    ...rest,
    route,
    launch: { type: 'route', route: `/${route}` },
    titleKey: `${i18n}.title`,
    descKey: `${i18n}.description`,
  };
}
