import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import type { InstrumentKind } from '../../../../modules/music-score';
import type { StageEngine } from '../engine/StageEngine';
import { MAX_PLAYERS, nextSeat } from '../engine/players';
import { INSTRUMENT_ORDER, STAGE_INSTRUMENTS } from '../logic/instruments';

interface PlayerListProps {
  engine: StageEngine;
  onInvite: () => void;
  /** Sends a player on their own device away; null while no room is open. */
  onRemoveRemote: ((remoteId: string) => void) | null;
}

/**
 * Everyone the stage shows in split screen, up to four: players on this screen (each picks a part
 * and how it is shown) and players on their own device, who joined through the invite.
 */
export function PlayerList({ engine, onInvite, onRemoveRemote }: PlayerListProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const song = engine.song;
  if (!song) return null;
  const canAdd = !!nextSeat(song, engine.seats);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {k('players_title')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={!canAdd}
            onClick={() => engine.addPlayer()}
          >
            {k('player_add')}
          </Button>
          <Button size="small" variant="outlined" onClick={onInvite}>
            {t('games.melodiq_notes.pult.invite')}
          </Button>
        </Stack>
      </Stack>
      <Stack spacing={0.75}>
        {engine.seats.map((seat, i) => (
          <Box
            key={i}
            sx={{
              display: 'grid',
              alignItems: 'center',
              gap: 1.25,
              px: 1.25,
              py: 0.75,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              gridTemplateColumns: {
                xs: '10px minmax(0, 1fr) auto',
                sm: '10px auto minmax(0, 1fr) auto auto',
              },
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: STAGE_INSTRUMENTS[seat.inst].color,
              }}
            />
            <Typography variant="body2" fontWeight={600} noWrap>
              {seat.name ?? k('player', { no: i + 1 })}
            </Typography>
            {seat.remoteId ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ gridColumn: { xs: '2 / 4', sm: '3 / 5' }, minWidth: 0 }}
              >
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                  {`${song.parts.find((p) => p.id === seat.partId)?.name ?? ''} · ${k(`instruments.${seat.inst}`)}`}
                </Typography>
                <Chip size="small" label={k('player_remote')} />
              </Stack>
            ) : (
              <>
                <Select
                  size="small"
                  value={seat.partId}
                  inputProps={{ 'aria-label': k('player_part', { no: i + 1 }) }}
                  onChange={(e) => engine.setSeat(i, { partId: e.target.value })}
                  sx={{ gridColumn: { xs: '2 / 4', sm: 'auto' }, minWidth: 0 }}
                >
                  {song.parts.map((part) => (
                    <MenuItem key={part.id} value={part.id}>
                      {part.name} ·{' '}
                      {k('detected', {
                        count: part.notes.length,
                        inst: k(`instruments.${part.guess}`),
                      })}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  size="small"
                  value={seat.inst}
                  inputProps={{ 'aria-label': k('player_view', { no: i + 1 }) }}
                  onChange={(e) => engine.setSeat(i, { inst: e.target.value as InstrumentKind })}
                  sx={{ gridColumn: { xs: 2, sm: 'auto' }, minWidth: 130 }}
                >
                  {INSTRUMENT_ORDER.map((kind) => (
                    <MenuItem key={kind} value={kind}>
                      {k(`instruments.${kind}`)}
                    </MenuItem>
                  ))}
                </Select>
              </>
            )}
            <IconButton
              size="small"
              aria-label={k('player_remove', { no: i + 1 })}
              disabled={seat.remoteId ? !onRemoveRemote : engine.seats.length <= 1}
              onClick={() =>
                seat.remoteId ? onRemoveRemote?.(seat.remoteId) : engine.removePlayer(i)
              }
              sx={{ gridColumn: { xs: 3, sm: 'auto' }, gridRow: { xs: 1, sm: 'auto' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mt: 1.5, maxWidth: '75ch' }}
      >
        {k('players_note', { max: MAX_PLAYERS })}
      </Typography>
    </Paper>
  );
}
