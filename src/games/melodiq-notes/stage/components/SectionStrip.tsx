import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { useStageLive } from '../useStage';
import { sectionScore } from '../logic/judging';
import { useSectionName } from './useSectionName';

const scoreColor = (v: number) =>
  v >= 0.85 ? 'success.main' : v >= 0.55 ? 'warning.main' : 'error.main';

/** One cell per practice section, coloured by how sure the highlighted player was; tap to loop it. */
export function SectionStrip({ engine }: { engine: StageEngine }) {
  useStageLive(engine);
  const { t } = useTranslation();
  const sectionName = useSectionName(engine);
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const { sections, song, loop, focus, mode } = engine;
  if (!song || !sections.length) return null;
  const progress = Math.min(1, Math.max(0, engine.beat / song.end));
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
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))`,
          gap: '3px',
        }}
      >
        {sections.map((s, i) => {
          const stat = focus?.stats.sections[i];
          const v = stat ? sectionScore(stat) : null;
          const inLoop = !!loop && s.from >= loop.from && s.from < loop.to;
          return (
            <ButtonBase
              key={s.from}
              aria-label={sectionName(i)}
              disabled={mode === 'perform'}
              onClick={() => engine.setLoop(loop?.from === s.from ? null : i)}
              sx={{
                position: 'relative',
                height: 28,
                borderRadius: 2,
                border: 1,
                overflow: 'hidden',
                borderColor: inLoop ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: inLoop ? 'text.primary' : 'text.secondary',
              }}
            >
              {v !== null && (
                <Box
                  sx={{ position: 'absolute', inset: 0, opacity: 0.3, bgcolor: scoreColor(v) }}
                />
              )}
              <span style={{ position: 'relative' }}>
                {sections.length <= 16 || i % 2 === 0 ? s.firstBar : ''}
              </span>
            </ButtonBase>
          );
        })}
        <Box
          sx={{
            position: 'absolute',
            top: -3,
            bottom: -3,
            width: 2,
            borderRadius: 2,
            bgcolor: 'text.primary',
            left: `calc(${progress * 100}% - 1px)`,
            pointerEvents: 'none',
          }}
        />
      </Box>
    </Stack>
  );
}
