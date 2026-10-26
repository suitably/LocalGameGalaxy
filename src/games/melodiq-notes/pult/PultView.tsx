/**
 * Melodiq Notes on a player's own device: their part, judged here [ID: GAME-MELODIQ-NOTES-PULT-VIEW]
 *
 * Opened from the stage's invite link (`?pult=<room>&part=<part>`). Shows the falling notes of
 * this player's part on the stage's clock, their own score, the input source and the latency
 * calibration. The judgements go to the stage, which shows every player in split screen.
 */
import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  Box,
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
import { InputSourcePicker } from '../stage/components/InputSourcePicker';
import { StageCanvas } from '../stage/components/StageCanvas';
import { useStageInput } from '../stage/useStageInput';
import { useStageTexts } from '../stage/useStage';
import { LatencyControl } from '../components/LatencyControl';
import { usePult } from './usePult';

const noop = () => {};

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
  const input = useStageInput(pult.engine);
  const texts = useStageTexts();
  const { state, part, clock, offset } = pult;
  const toStageClock = useCallback((local: number) => local + (offset ?? 0), [offset]);
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
  else if (!pult.ready) status = <Alert severity="info">{k('loading_part')}</Alert>;

  return (
    <GameLayout maxWidth="sm" disablePadding>
      <Stack spacing={1.5} sx={{ p: { xs: 1, sm: 2 } }}>
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
        {part && pult.ready && (
          <>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
            >
              <Typography variant="body2" color="text.secondary">
                {state.play === 'playing' ? k('playing') : k('waiting')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <LatencyControl
                  engine={pult.engine}
                  role="pult"
                  source={input.source}
                  schedule={pult.requestClicks}
                  toClock={toStageClock}
                  canStart={offset !== null}
                  note={
                    clock && (
                      <Typography variant="caption" color="text.secondary">
                        {k('network', { ms: Math.round(clock.rtt) })}
                      </Typography>
                    )
                  }
                />
                <InputSourcePicker
                  value={input.source}
                  midiCount={input.midiDevices.length}
                  onChange={(next) => {
                    pult.unlockAudio();
                    input.choose(next);
                  }}
                />
              </Box>
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                height: 'clamp(320px, 62dvh, 560px)',
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: 'background.default',
              }}
            >
              <StageCanvas
                engine={pult.engine}
                display="instrument"
                texts={texts}
                onGesture={pult.unlockAudio}
                onTogglePause={noop}
              />
            </Paper>
          </>
        )}
      </Stack>
    </GameLayout>
  );
};
