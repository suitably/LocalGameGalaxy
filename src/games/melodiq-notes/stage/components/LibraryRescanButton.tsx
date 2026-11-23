import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import RescanIcon from '@mui/icons-material/SyncRounded';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rescanLibrary } from '../../../../lib/companion/notesLibraryApi';

type RescanState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; songs: number; migrated: number }
  | { kind: 'failed'; error: string };

/**
 * Re-scans the song library on the server without a restart (#563): picks up song folders added
 * or changed on disk and, with management rights, moves old Notes pieces not migrated yet.
 */
export function LibraryRescanButton({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [state, setState] = useState<RescanState>({ kind: 'idle' });

  const run = async () => {
    setState({ kind: 'running' });
    try {
      const result = await rescanLibrary();
      setState({ kind: 'done', songs: result.songs, migrated: result.migration?.migrated ?? 0 });
      onDone();
    } catch (e) {
      setState({ kind: 'failed', error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Stack spacing={0.5} alignItems="flex-start">
      <Button
        variant="text"
        startIcon={state.kind === 'running' ? <CircularProgress size={16} /> : <RescanIcon />}
        disabled={state.kind === 'running'}
        onClick={() => void run()}
        title={k('rescan_hint')}
      >
        {k('rescan')}
      </Button>
      {state.kind === 'done' && (
        <Typography variant="caption" color="text.secondary">
          {k('rescan_done', { songs: state.songs, migrated: state.migrated })}
        </Typography>
      )}
      {state.kind === 'failed' && (
        <Typography variant="caption" color="error">
          {k('action_error', { error: state.error })}
        </Typography>
      )}
    </Stack>
  );
}
