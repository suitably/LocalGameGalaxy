import { useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { useStageLive } from '../useStage';
import { sectionScore } from '../logic/judging';
import {
  groupOfSection,
  groupSections,
  mergeStats,
  sectionsWithNotes,
  spanProgress,
} from '../logic/sectionGroups';
import { Playhead, SectionCell } from './SectionCell';
import { useSectionName } from './useSectionName';

const gridOf = (n: number) => ({
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
  gap: '3px',
});

/**
 * At most five group cells, coloured by how sure the highlighted player was; tap one to open its
 * sections, tap a section to loop it. Sections without notes carry no rating.
 */
export function SectionStrip({ engine }: { engine: StageEngine }) {
  useStageLive(engine);
  const { t } = useTranslation();
  const sectionName = useSectionName(engine);
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const [open, setOpen] = useState<number | null>(null);
  const { sections, song, loop, focus, mode } = engine;
  const groups = useMemo(() => (sections.length ? groupSections(sections) : []), [sections]);
  const hasNotes = useMemo(() => {
    const players = focus ? [focus] : engine.players;
    return sectionsWithNotes(
      sections,
      players.flatMap((p) => p.notes.map((n) => n.t)),
    );
  }, [sections, focus, engine.players]);
  if (!song || !groups.length) return null;
  const current = groupOfSection(groups, engine.sectionAt(Math.max(0, engine.beat)));
  const expanded = open !== null && open < groups.length ? groups[open] : null;
  const head = spanProgress(groups[current].from, groups[current].to, engine.beat);
  const groupHead = head === null ? (engine.beat < 0 ? 0 : null) : (current + head) / groups.length;
  const rate = (i: number) => {
    const stat = focus?.stats.sections[i];
    return stat && hasNotes[i] ? sectionScore(stat) : null;
  };
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="caption" color="text.secondary">
          {k('sections_title')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {mode === 'perform' ? k('loop_perform') : loop ? k('loop_active') : k('loop_hint')}
        </Typography>
      </Stack>
      <Box sx={gridOf(groups.length)}>
        {groups.map((g, gi) => {
          const merged = mergeStats(focus?.stats.sections.slice(g.first, g.last + 1) ?? []);
          const anyNotes = hasNotes.slice(g.first, g.last + 1).some(Boolean);
          const label = g.firstBar === g.lastBar ? g.firstBar : `${g.firstBar}–${g.lastBar}`;
          return (
            <SectionCell
              key={g.first}
              label={label}
              ariaLabel={
                g.first === g.last
                  ? sectionName(g.first)
                  : t('games.melodiq_notes.stage.section_bars', { from: g.firstBar, to: g.lastBar })
              }
              score={anyNotes ? sectionScore(merged) : null}
              empty={!anyNotes}
              active={!!loop && g.from < loop.to && g.to > loop.from}
              expanded={open === gi}
              onClick={() => setOpen(open === gi ? null : gi)}
            />
          );
        })}
        <Playhead progress={groupHead} />
      </Box>
      {expanded && (
        <Box sx={gridOf(expanded.last - expanded.first + 1)}>
          {sections.slice(expanded.first, expanded.last + 1).map((s, j) => {
            const i = expanded.first + j;
            const inLoop = !!loop && s.from >= loop.from && s.from < loop.to;
            return (
              <SectionCell
                key={s.from}
                label={s.firstBar}
                ariaLabel={sectionName(i)}
                score={rate(i)}
                empty={!hasNotes[i]}
                active={inLoop}
                disabled={mode === 'perform' || !hasNotes[i]}
                onClick={() => engine.setLoop(loop?.from === s.from ? null : i)}
              />
            );
          })}
          <Playhead progress={spanProgress(expanded.from, expanded.to, engine.beat)} />
        </Box>
      )}
    </Stack>
  );
}
