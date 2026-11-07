import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MarksMode } from '../../../../modules/music-score';
import { markCheckText } from '../logic/markCheckText';
import type { StageSongState } from '../useStageSong';

const MODES: MarksMode[] = ['steady', 'bars', 'off'];

/** How the bar marks play (steady tempo, bar by bar, score tempo) and what the check found in them. */
export function MarksCheck({ state }: { state: StageSongState }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { song, quality, mode, stale } = state;
  if (!song || !quality) return null;

  const checked = stale
    ? { text: k('stale_marks'), unsure: true }
    : markCheckText(k, song, quality);

  return (
    <>
      <Typography variant="body2" color={checked.unsure ? 'warning.main' : 'text.secondary'}>
        {checked.text}
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
