import { alpha, Box, Button, Stack, Typography, type Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { playerResults, weakestSection } from '../engine/results';
import { measureIndexAt } from '../../../../modules/music-score';
import { useSectionName } from './useSectionName';
import { ResultsTable } from './ResultsTable';
import { WaitChip } from './WaitChip';
import { SkipToEndButton } from './SkipToEndButton';

interface StageOverlayProps {
  engine: StageEngine;
  onStart: () => void;
  onPractise: (section: number) => void;
}

const veil = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  p: 2,
  overflow: 'auto',
  bgcolor: (theme: Theme) => alpha(theme.palette.background.default, 0.85),
} as const;

/** Start card, pause card, results and the "play next" hint, layered over the canvas. */
export function StageOverlay({ engine, onStart, onPractise }: StageOverlayProps) {
  const { t } = useTranslation();
  const sectionName = useSectionName(engine);
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { state, song, players, focus, mode } = engine;

  if (state === 'playing')
    return (
      <>
        <WaitChip engine={engine} />
        <SkipToEndButton engine={engine} floating />
      </>
    );
  if (!song || !players.length) return null;

  if (state === 'done') {
    const weakest = weakestSection(focus);
    const acc = playerResults(players).find((r) => r.no === focus?.no)?.accuracy ?? 0;
    const title = acc >= 0.9 ? 'great' : acc >= 0.7 ? 'good' : acc >= 0.4 ? 'ok' : 'more';
    return (
      <Box sx={veil}>
        <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 520 }}>
          <Typography variant="h5" fontWeight={800}>
            {k(`results.${title}`)}
          </Typography>
          <ResultsTable engine={engine} />
          <Typography color="text.secondary">
            {weakest === null
              ? k('results.none_weak')
              : k('results.weakest', { section: sectionName(weakest) })}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
            {weakest !== null && (
              <Button variant="contained" onClick={() => onPractise(weakest)}>
                {k('results.practise', { section: sectionName(weakest) })}
              </Button>
            )}
            <Button variant="outlined" onClick={onStart}>
              {k('results.again')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  const paused = state === 'paused';
  const several = players.length > 1;
  const title = several
    ? players.map((p) => k(`instruments.${p.instrument.kind}`)).join(' · ')
    : `${k(`instruments.${players[0].instrument.kind}`)} · ${players[0].part.name}`;
  const view = focus?.instrument.view;
  const keysHint = !focus
    ? k('keys_remote')
    : view === 'keys'
      ? k('keys_keyboard')
      : view === 'strings'
        ? k('keys_strings', { count: focus?.instrument.kind === 'guitar' ? 6 : 4 })
        : view === 'drums'
          ? k('keys_drums')
          : k('keys_pitch');
  return (
    <Box sx={veil}>
      <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 460 }}>
        <Typography variant="h5" fontWeight={800}>
          {paused ? k('pause') : title}
        </Typography>
        <Typography color="text.secondary">
          {paused
            ? k('paused_at', {
                bar: measureIndexAt(song, Math.max(0, engine.beat)) + 1,
                total: song.measureStarts.length,
              })
            : k(`mode_hint.${mode}`)}
        </Typography>
        {!paused && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              bgcolor: 'background.paper',
              px: 1.5,
              py: 1,
              borderRadius: 2,
            }}
          >
            {keysHint}
            {several ? ` · ${k('keys_switch')}` : ''}
          </Typography>
        )}
        <Button variant="contained" size="large" onClick={onStart}>
          {paused ? k('resume') : k('start')}
        </Button>
        {paused && <SkipToEndButton engine={engine} />}
      </Stack>
    </Box>
  );
}
