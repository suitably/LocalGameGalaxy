import { alpha, Box, Button, Chip, Stack, Typography, type Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { ladderBar, ladderSpeed, PASSES_PER_STEP } from '../logic/practiceLadder';
import type { usePracticeLadder } from '../usePracticeLadder';
import { useSectionName } from './useSectionName';

interface LadderPanelProps {
  engine: StageEngine;
  ladder: ReturnType<typeof usePracticeLadder>;
  onPerform: () => void;
}

const veil = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  p: 2,
  zIndex: 1,
  bgcolor: (theme: Theme) => alpha(theme.palette.background.default, 0.9),
} as const;

/** Guided practice (#638): progress chip while a bar loops, congratulation between bars. */
export function LadderPanel({ engine, ladder, onPerform }: LadderPanelProps) {
  const { t } = useTranslation();
  const sectionName = useSectionName(engine);
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.ladder.${key}`, opts);
  const { state } = ladder;
  if (!state) return null;
  const bar = sectionName(ladderBar(state.ladder));
  const left = state.ladder.bars.length - state.ladder.at - 1;

  if (state.phase === 'running')
    return (
      <Chip
        color="primary"
        onDelete={ladder.stop}
        label={k('progress', {
          section: bar,
          speed: Math.round(ladderSpeed(state.ladder) * 100),
          streak: state.ladder.streak,
          needed: PASSES_PER_STEP,
        })}
        sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)' }}
      />
    );

  const allDone = state.phase === 'all_done';
  return (
    <Box sx={veil}>
      <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={800}>
          {k(allDone ? 'all_done_title' : 'bar_done_title')}
        </Typography>
        <Typography color="text.secondary">
          {allDone ? k('all_done') : k('bar_done', { section: bar, count: left })}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
          {allDone ? (
            <>
              <Button variant="contained" onClick={ladder.wholeSong}>
                {k('whole_song')}
              </Button>
              <Button variant="outlined" onClick={onPerform}>
                {k('perform')}
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={ladder.next}>
              {left > 0 ? k('next_bar') : k('finish')}
            </Button>
          )}
          <Button onClick={ladder.stop}>{k('stop')}</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
