import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';

/** "Takt 5" or "Takt 5–9" for a practice section. */
export function useSectionName(engine: StageEngine) {
  const { t } = useTranslation();
  return useCallback(
    (index: number) => {
      const s = engine.sections[index];
      if (!s) return '';
      return s.firstBar === s.lastBar
        ? t('games.melodiq_notes.stage.section_bar', { bar: s.firstBar })
        : t('games.melodiq_notes.stage.section_bars', { from: s.firstBar, to: s.lastBar });
    },
    [engine, t],
  );
}
