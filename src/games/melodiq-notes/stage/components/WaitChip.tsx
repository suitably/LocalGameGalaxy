import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { useStageLive } from '../useStage';
import { noteName } from '../logic/charts';
import { DRUM_LANE_META } from '../logic/instruments';
import { STRING_TUNINGS } from '../../../../modules/music-score';

/** Learn mode: what the song is waiting for, and from whom. */
export function WaitChip({ engine }: { engine: StageEngine }) {
  useStageLive(engine);
  const { t } = useTranslation();
  const p = engine.waitingFor;
  if (!p || !p.pending.length) return null;
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const notes = p.pending;
  let what: string;
  if (p.instrument.view === 'keys')
    what = k('play_note', { notes: notes.map((n) => noteName(n.pitch)).join(' + ') });
  else if (p.instrument.view === 'drums')
    what = notes.map((n) => k(`drums.${DRUM_LANE_META[n.lane].id}`)).join(' + ');
  else if (p.instrument.view === 'pitch')
    what =
      k('sing_note', { note: noteName(notes[0].pitch) }) +
      (notes[0].syl ? ` · „${notes[0].syl.replace(/-$/, '')}“` : '');
  else {
    const strings = (STRING_TUNINGS[p.instrument.kind] ?? STRING_TUNINGS.guitar!).strings;
    what = notes
      .map((n) =>
        n.fret
          ? k('string_fret', { string: strings[n.lane], fret: n.fret })
          : k('string_open', { string: strings[n.lane] }),
      )
      .join(' + ');
  }
  const label = engine.players.length > 1 ? k('waiting_for', { no: p.no, what }) : what;
  return (
    <Chip
      label={label}
      sx={{
        position: 'absolute',
        top: 36,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100% - 24px)',
        bgcolor: 'rgba(15,13,30,0.85)',
        border: 1,
        borderColor: p.instrument.color,
        color: 'text.primary',
        fontWeight: 600,
        pointerEvents: 'none',
      }}
    />
  );
}
