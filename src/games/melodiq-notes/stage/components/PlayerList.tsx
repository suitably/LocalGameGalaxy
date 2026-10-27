import { Box, Button, Chip, IconButton, MenuItem, Select, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddRounded';
import QrCodeIcon from '@mui/icons-material/QrCode2Rounded';
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
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          disabled={!canAdd}
          onClick={() => engine.addPlayer()}
        >
          {k('player_add')}
        </Button>
        <Button variant="outlined" startIcon={<QrCodeIcon />} onClick={onInvite}>
          {t('games.melodiq_notes.pult.invite')}
        </Button>
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
              // name and remove button on top, part and view below: the list lives in a narrow sheet
              gridTemplateColumns: '10px minmax(0, 1fr) 40px',
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
                sx={{ gridColumn: '2 / 4', minWidth: 0 }}
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
                  onChange={(e) => engine.setSeat(i, { partId: e.target.value, chosen: true })}
                  sx={{ gridColumn: '2 / 4', minWidth: 0 }}
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
                  onChange={(e) =>
                    engine.setSeat(i, { inst: e.target.value as InstrumentKind, chosen: true })
                  }
                  sx={{ gridColumn: '2 / 4', minWidth: 0 }}
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
              sx={{ gridColumn: 3, gridRow: 1 }}
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
    </Box>
  );
}
