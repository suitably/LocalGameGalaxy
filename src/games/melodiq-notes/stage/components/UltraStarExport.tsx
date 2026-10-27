import { useState } from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { buildUltraStarFile, DUET_CHOICE, ultraStarChoices } from '../logic/ultraStarExport';
import { downloadText } from '../loadScore';
import type { StageSongState } from '../useStageSong';

/** "Save as UltraStar .txt": the vocal part (or duet) with the bar marks as timing (#567). */
export function UltraStarExport({ state }: { state: StageSongState }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { song, marks, offset, recording } = state;
  const { parts, duet } = ultraStarChoices(song);
  const [picked, setPicked] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!song || !marks || parts.length === 0) return null;
  const choice = picked || parts[0].id;

  const save = () => {
    try {
      const mp3 = recording && !recording.songMix ? recording.name : undefined;
      const file = buildUltraStarFile(song, marks, offset, choice, mp3);
      downloadText(file.name, file.text, 'text/plain;charset=utf-8');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Stack spacing={1}>
      {parts.length > 1 && (
        <TextField
          select
          size="small"
          label={k('ultrastar_part')}
          value={choice}
          onChange={(e) => setPicked(e.target.value)}
        >
          {parts.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name || p.id}
            </MenuItem>
          ))}
          {duet && <MenuItem value={DUET_CHOICE}>{k('ultrastar_duet')}</MenuItem>}
        </TextField>
      )}
      <Button variant="text" onClick={save} sx={{ alignSelf: 'flex-start' }}>
        {k('export_ultrastar')}
      </Button>
      {error && <Alert severity="error">{k('action_error', { error })}</Alert>}
    </Stack>
  );
}
