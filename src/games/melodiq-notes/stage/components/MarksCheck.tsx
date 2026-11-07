import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MarksMode } from '../../../../modules/music-score';
import { barRanges } from '../logic/marksPolicy';
import type { StageSongState } from '../useStageSong';

const MODES: MarksMode[] = ['steady', 'bars', 'off'];

/** How the bar marks play (steady tempo, bar by bar, score tempo) and what the check found in them. */
export function MarksCheck({ state }: { state: StageSongState }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { song, quality, mode, stale } = state;
  if (!song || !quality) return null;

  let check: string;
  let unsure = quality.verdict === 'unsure';
  if (stale) {
    check = k('stale_marks');
    unsure = true;
  } else if (quality.suspectBars.length) {
    check = k('quality_unsure', { bars: barRanges(quality.suspectBars, song.measureNumbers) });
  } else if (unsure) {
    check = k('quality_tempo', { percent: Math.round(100 / quality.fit.ratio) });
  } else if (quality.steady) {
    const bpm = (song.tempoMap[0]?.bpm ?? 120) / quality.fit.ratio;
    check = k('quality_good_steady', { bpm: bpm.toFixed(1) });
  } else {
    check = k('quality_good');
  }

  return (
    <>
      <Typography variant="body2" color={unsure ? 'warning.main' : 'text.secondary'}>
        {check}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {k('marks_mode')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        onChange={(_, next: MarksMode | null) => next && state.chooseMode(next)}
        aria-label={k('marks_mode')}
        sx={{ flexWrap: 'wrap' }}
      >
        {MODES.map((m) => (
          <ToggleButton key={m} value={m}>
            {k(`marks_mode_${m}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary">
        {k('marks_mode_hint')}
      </Typography>
    </>
  );
}
