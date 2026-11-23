import { FormControlLabel, Switch, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { setJudgePercussion } from '../drumSettings';
import type { StageEngine } from '../engine/StageEngine';

/**
 * Drum lanes (#571): whether the percussion lane (tambourine, cowbell, clap …) is judged. Off by
 * default: it is shown and heard, but never scored. Only while a player on this screen drums.
 */
export function DrumLaneOptions({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  if (!engine.players.some((p) => !p.remoteId && p.instrument.view === 'drums')) return null;
  const on = engine.drumOptions.judgePercussion;
  return (
    <>
      <FormControlLabel
        sx={{ mt: 2 }}
        control={<Switch checked={on} onChange={(_, v) => setJudgePercussion(engine, v)} />}
        label={k('judge_percussion')}
      />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ maxWidth: '75ch' }}>
        {k('judge_percussion_note')}
      </Typography>
    </>
  );
}
