/**
 * Turns a script's `Text` into a string in the UI language [ID: HOOK-TABLETOP-SCRIPT-TEXT]
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Text } from '../logic/scriptTypes';

export type ScriptTextFn = (text: Text) => string;

export function useScriptText(names: readonly string[]): ScriptTextFn {
  const { t } = useTranslation();
  return useCallback(
    (text: Text) =>
      typeof text === 'string'
        ? text
        : String(
            t(`games.tabletop.scripted.${text.key}`, {
              ...text.params,
              name: text.seat === undefined ? '' : (names[text.seat] ?? ''),
            }),
          ),
    [t, names],
  );
}
