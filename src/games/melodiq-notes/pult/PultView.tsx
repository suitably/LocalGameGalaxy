/**
 * Melodiq Notes on a player's own device: only their instrument [ID: GAME-MELODIQ-NOTES-PULT-VIEW]
 *
 * Opened from the stage's invite link (`?pult=<room>&part=<part>`). Shows the part this pult
 * plays, the input source and the instrument's pads; the notes and the judging stay on the stage.
 */
import React, { useMemo } from 'react';
import {
  Alert,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../../context/TitleContext';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { GameLayout } from '../../../components/Layout/GameLayout';
import { getOrCreatePlayerName } from '../../../features/party/logic/playerName';
import { STAGE_INSTRUMENTS } from '../stage/logic/instruments';
import { InputSourcePicker } from '../stage/components/InputSourcePicker';
import { PultPad } from './components/PultPad';
import { usePult } from './usePult';
import { usePultInput } from './usePultInput';

export const PultView: React.FC<{ roomId: string; wantedPart: string | null }> = ({
  roomId,
  wantedPart,
}) => {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.pult.${key}`, opts);
  usePageTitle(t('games.melodiq_notes.title'));
  useWakeLock(true);
  const name = useMemo(() => getOrCreatePlayerName(), []);
  const pult = usePult(roomId, name, wantedPart);
  const input = usePultInput(pult.part, pult.play);
  const { state, part, clock } = pult;
  const taken = new Set(state.members.filter((m) => m.id !== pult.me?.id).map((m) => m.partId));

  let status: React.ReactNode = null;
  if (!pult.synced)
    status = (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={18} />
        <Typography>{k('connecting', { room: roomId })}</Typography>
      </Stack>
    );
  else if (!state.song) status = <Alert severity="info">{k('no_song')}</Alert>;
  else if (!part) status = <Alert severity="warning">{k('no_part')}</Alert>;

  return (
    <GameLayout maxWidth="sm">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {state.song?.title ?? k('title')}
          </Typography>
          <Chip size="small" label={name} />
          <Chip
            size="small"
            color={clock ? 'success' : 'default'}
            label={clock ? k('clock', { ms: Math.round(clock.rtt) }) : k('clock_pending')}
          />
        </Stack>
        {status}
        {state.song && (
          <TextField
            select
            size="small"
            label={k('part')}
            value={part?.id ?? ''}
            onChange={(e) => pult.join(e.target.value)}
          >
            {state.song.parts.map((p) => (
              <MenuItem key={p.id} value={p.id} disabled={taken.has(p.id)}>
                {`${p.name} · ${t(`games.melodiq_notes.stage.instruments.${p.inst}`)}`}
              </MenuItem>
            ))}
          </TextField>
        )}
        {part && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {state.play === 'playing' ? k('playing') : k('waiting')}
              </Typography>
              <InputSourcePicker
                value={input.source}
                midiCount={input.midiDevices.length}
                onChange={input.choose}
              />
            </Stack>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <PultPad
                view={STAGE_INSTRUMENTS[part.inst].view}
                inst={part.inst}
                octaveBase={part.octaveBase}
                onLane={input.hitLane}
              />
            </Paper>
          </>
        )}
      </Stack>
    </GameLayout>
  );
};
