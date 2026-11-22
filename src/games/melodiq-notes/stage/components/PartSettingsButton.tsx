import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/TuneRounded';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScorePart, ScoreSong } from '../../../../modules/music-score';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import { canHide, hiddenCount, type PartPlayback } from '../logic/partSettings';
import { isStrummed } from '../logic/strumDirection';
import { StrumSettings } from './StrumSettings';
import type { StageParts } from '../useStageParts';

interface PartSettingsButtonProps {
  /** The full score on stage, hidden parts included. */
  song: ScoreSong | null;
  parts: StageParts;
}

/**
 * Hides and renames parts of the score on stage (#564) and sets the strum direction of guitar
 * parts (#634), from the players sheet. A hidden part is muted or played by the synth as backing;
 * settings of a score from a song folder are stored in its `song.json`.
 */
export function PartSettingsButton({ song, parts }: PartSettingsButtonProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [open, setOpen] = useState(false);
  if (!song || (song.parts.length < 2 && !song.parts.some((p) => isStrummed(p.guess)))) {
    return null;
  }
  const hidden = hiddenCount(song, parts.settings);
  const { settings } = parts;

  const row = (part: ScorePart) => {
    const setting = settings[part.id] ?? {};
    return (
      <Stack key={part.id} spacing={0.5} sx={{ py: 0.5 }}>
        <TextField
          size="small"
          label={part.name}
          // remounts with the stored name, so an edit starts from it
          key={setting.name ?? ''}
          defaultValue={setting.name ?? ''}
          placeholder={part.name}
          onBlur={(e) => {
            if (e.target.value.trim() !== (setting.name ?? '')) {
              void parts.change(part, { name: e.target.value });
            }
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControlLabel
            label={k('parts_hide')}
            control={
              <Switch
                checked={!!setting.hidden}
                disabled={!setting.hidden && !canHide(song, settings, part.id)}
                onChange={(e) => void parts.change(part, { hidden: e.target.checked })}
              />
            }
          />
          {setting.hidden && (
            <Select
              size="small"
              value={setting.playback === 'synth' ? 'synth' : 'muted'}
              inputProps={{ 'aria-label': k('parts_playback') }}
              onChange={(e) =>
                void parts.change(part, { playback: e.target.value as PartPlayback })
              }
            >
              <MenuItem value="muted">{k('parts_muted')}</MenuItem>
              <MenuItem value="synth">{k('parts_synth')}</MenuItem>
            </Select>
          )}
        </Stack>
        {isStrummed(part.guess) && (
          <StrumSettings
            setting={setting.strum}
            barCount={song.measureStarts.length}
            onChange={(strum) => void parts.change(part, { strum })}
          />
        )}
      </Stack>
    );
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<TuneIcon />}
        onClick={() => setOpen(true)}
        sx={{ mt: 1.5 }}
      >
        {hidden ? k('parts_edit_hidden', { count: hidden }) : k('parts_edit')}
      </Button>
      {open && (
        <NotesDialogFrame open onClose={() => setOpen(false)} maxWidth="sm" title={k('parts_edit')}>
          <DialogContent>
            <Stack spacing={1}>
              {parts.error && (
                <Alert severity="error">{k('action_error', { error: parts.error })}</Alert>
              )}
              {song.parts.map(row)}
              <Typography variant="caption" color="text.secondary">
                {k(parts.persistent ? 'parts_stored' : 'parts_session')}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('common.close')}</Button>
          </DialogActions>
        </NotesDialogFrame>
      )}
    </>
  );
}
