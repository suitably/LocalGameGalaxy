import { useMemo, useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { useStageLive } from '../useStage';
import { sectionScore } from '../logic/judging';
import {
  loopSpan,
  mergeStats,
  pickLoop,
  rowProgress,
  sectionsWithNotes,
  stripRows,
  togglePath,
  type BarSpan,
  type LoopPick,
  type SectionGroup,
} from '../logic/sectionGroups';
import type { ScoreSong } from '../../../../modules/music-score';
import { Playhead, SectionCell } from './SectionCell';
import { useSectionName } from './useSectionName';

const gridOf = (n: number) => ({
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
  gap: '3px',
});

interface StripState {
  song: ScoreSong | null;
  /** Opened cell per row. */
  path: number[];
  pick: LoopPick | null;
}

/** Section span of the engine's loop (beats) as bars, or null without a loop. */
function loopBars(engine: StageEngine): BarSpan | null {
  if (!engine.loop) return null;
  return {
    first: engine.sectionAt(engine.loop.from),
    last: engine.sectionAt(engine.loop.to - 1e-6),
  };
}

/**
 * The song as rows of at most five cells, coloured by how sure the highlighted player was. Tap a
 * group to open its bars in the next row, down to single bars. Outside perform mode, two taps
 * pick a loop's first and last bar or group; the loop chip turns it on and off.
 */
export function SectionStrip({ engine }: { engine: StageEngine }) {
  useStageLive(engine);
  const { t } = useTranslation();
  const sectionName = useSectionName(engine);
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { sections, song, focus, mode } = engine;
  const [state, setState] = useState<StripState>({ song: null, path: [], pick: null });
  // a new song starts with closed rows and no pick
  const { path, pick } = state.song === song ? state : { path: [], pick: null };
  const rows = useMemo(() => stripRows(sections, path), [sections, path]);
  const hasNotes = useMemo(() => {
    const players = focus ? [focus] : engine.players;
    return sectionsWithNotes(
      sections,
      players.flatMap((p) => p.notes.map((n) => n.t)),
    );
  }, [sections, focus, engine.players]);
  if (!song || !rows.length) return null;

  const picking = mode !== 'perform';
  const looped = loopBars(engine);
  const pickSpan = pick && picking ? loopSpan(pick) : null;
  // a pick in progress shows over the running loop
  const marked = pick && !pick.end ? pickSpan : (looped ?? pickSpan);
  const spanName = (s: BarSpan) =>
    s.first === s.last
      ? sectionName(s.first)
      : k('section_bars', { from: sections[s.first].firstBar, to: sections[s.last].lastBar });

  const tap = (row: number, index: number, g: SectionGroup) => {
    const nextPath = g.first === g.last ? path : togglePath(path, row, index);
    const nextPick = picking ? pickLoop(pick, g) : pick;
    setState({ song, path: nextPath, pick: nextPick });
    // the loop follows a finished pick, and switches itself on
    if (picking && nextPick?.end) {
      const s = loopSpan(nextPick);
      engine.setLoop(s.first, s.last);
    }
  };
  const toggleLoop = () => {
    if (looped) engine.setLoop(null);
    else if (pickSpan) engine.setLoop(pickSpan.first, pickSpan.last);
  };
  const hint = !picking
    ? k('loop_perform')
    : pick && !pick.end
      ? k('loop_pick_end')
      : k('loop_hint');
  const chipSpan = looped ?? pickSpan;

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: '1 1 auto' }}>
          {k('sections_title')}
        </Typography>
        <Chip
          size="small"
          color={looped ? 'primary' : 'default'}
          variant={looped ? 'filled' : 'outlined'}
          disabled={!picking || !chipSpan}
          aria-pressed={!!looped}
          label={chipSpan ? k('loop_chip', { bars: spanName(chipSpan) }) : k('loop_chip_none')}
          onClick={toggleLoop}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      {rows.map((row, r) => {
        const head = rowProgress(row, engine.beat);
        return (
          <Box key={`${r}-${row[0].first}`} sx={gridOf(row.length)}>
            {row.map((g, gi) => {
              const anyNotes = hasNotes.slice(g.first, g.last + 1).some(Boolean);
              const merged = mergeStats(focus?.stats.sections.slice(g.first, g.last + 1) ?? []);
              const single = g.first === g.last;
              return (
                <SectionCell
                  key={g.first}
                  label={single ? g.firstBar : `${g.firstBar}–${g.lastBar}`}
                  ariaLabel={spanName(g)}
                  score={anyNotes ? sectionScore(merged) : null}
                  empty={!anyNotes}
                  active={!!marked && g.first <= marked.last && g.last >= marked.first}
                  expanded={single ? undefined : path[r] === gi}
                  disabled={single && !picking}
                  onClick={() => tap(r, gi, g)}
                />
              );
            })}
            <Playhead progress={head ?? (r === 0 && engine.beat < row[0].from ? 0 : null)} />
          </Box>
        );
      })}
    </Stack>
  );
}
