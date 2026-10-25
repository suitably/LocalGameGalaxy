import { useState } from 'react';
import { Button, MenuItem, Slider, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import type { StageEngine } from '../engine/StageEngine';
import { useStageLive } from '../useStage';
import { beatFromFraction, fractionOfBeat, LEAD_IN_OPTIONS_SEC, parseLeadIn } from '../logic/seek';

const STEPS = 1000;

/** Timeline like a video player: drag or click the bar to seek, or jump to the first note with a lead-in. */
export function SeekBar({ engine }: { engine: StageEngine }) {
  useStageLive(engine);
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const [leadIn, setLeadIn] = useState(() =>
    parseLeadIn(storage.get(STORAGE_KEYS.MELODIQ_NOTES_SEEK_LEAD_IN)),
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const song = engine.song;
  if (!song || !engine.players.length) return null;
  const shown = dragging ?? Math.round(fractionOfBeat(engine.beat, song.end) * STEPS);
  const seek = (v: number) => engine.seekTo(beatFromFraction(v / STEPS, song.end));
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <Slider
        size="small"
        aria-label={k('timeline')}
        min={0}
        max={STEPS}
        value={shown}
        sx={{ flex: '1 1 200px', minWidth: 0 }}
        onChange={(_, v) => setDragging(v as number)}
        onChangeCommitted={(_, v) => {
          setDragging(null);
          seek(v as number);
        }}
      />
      <TextField
        select
        size="small"
        label={k('lead_in')}
        value={leadIn}
        onChange={(e) => {
          const v = parseLeadIn(e.target.value);
          setLeadIn(v);
          storage.set(STORAGE_KEYS.MELODIQ_NOTES_SEEK_LEAD_IN, String(v));
        }}
        sx={{ minWidth: 110 }}
      >
        {LEAD_IN_OPTIONS_SEC.map((s) => (
          <MenuItem key={s} value={s}>
            {t('games.melodiq_notes.stage.lead_in_seconds', { count: s })}
          </MenuItem>
        ))}
      </TextField>
      <Button size="small" variant="outlined" onClick={() => engine.jumpToFirstNote(leadIn)}>
        {k('first_note')}
      </Button>
    </Stack>
  );
}
