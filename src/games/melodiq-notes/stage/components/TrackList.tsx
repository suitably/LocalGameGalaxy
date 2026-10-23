import { Box, Button, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { InstrumentKind } from '../../../../modules/music-score';
import type { StageEngine } from '../engine/StageEngine';
import { MAX_PLAYERS } from '../engine/players';
import type { TrackRole } from '../engine/types';
import { INSTRUMENT_ORDER, STAGE_INSTRUMENTS } from '../logic/instruments';

const ROLES: TrackRole[] = ['play', 'band', 'off'];

/** Every part of the song: which instrument it is played as, and whether a person plays it, the band, or nobody. */
export function TrackList({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const song = engine.song;
  if (!song) return null;
  const players = song.parts.filter((p) => engine.setups[p.id]?.role === 'play').length;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {k('tracks_title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {k('tracks_summary', {
              count: song.parts.length,
              source: song.source,
              players: Math.min(players, MAX_PLAYERS),
              max: MAX_PLAYERS,
            })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => engine.applyPreset('solo')}>
            {k('preset_solo')}
          </Button>
          <Button size="small" variant="outlined" onClick={() => engine.applyPreset('band')}>
            {k('preset_band')}
          </Button>
        </Stack>
      </Stack>
      <Stack spacing={0.75}>
        {song.parts.map((part) => {
          const setup = engine.setups[part.id];
          if (!setup) return null;
          return (
            <Box
              key={part.id}
              sx={{
                display: 'grid',
                alignItems: 'center',
                gap: 1.25,
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                border: 1,
                borderColor: setup.role === 'play' ? 'primary.main' : 'divider',
                gridTemplateColumns: {
                  xs: '10px minmax(0, 1fr)',
                  sm: '10px minmax(0, 1fr) auto auto',
                },
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: STAGE_INSTRUMENTS[setup.inst].color,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {part.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {k('detected', {
                    count: part.notes.length,
                    inst: k(`instruments.${part.guess}`),
                  })}
                </Typography>
              </Box>
              <Select
                size="small"
                value={setup.inst}
                inputProps={{ 'aria-label': `${part.name}: ${k('display')}` }}
                onChange={(e) =>
                  engine.setTrack(part.id, { inst: e.target.value as InstrumentKind })
                }
                sx={{ gridColumn: { xs: 2, sm: 'auto' }, minWidth: 130 }}
              >
                {INSTRUMENT_ORDER.map((kind) => (
                  <MenuItem key={kind} value={kind}>
                    {k(`instruments.${kind}`)}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={setup.role}
                inputProps={{ 'aria-label': `${part.name}: ${k('role_play')}` }}
                onChange={(e) => engine.setTrack(part.id, { role: e.target.value as TrackRole })}
                sx={{ gridColumn: { xs: 2, sm: 'auto' }, minWidth: 130 }}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {k(`role_${role}`)}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          );
        })}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mt: 1.5, maxWidth: '75ch' }}
      >
        {k('tracks_note')}
      </Typography>
    </Paper>
  );
}
