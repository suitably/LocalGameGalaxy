import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEMO_SONGS } from '../../demoSongs';
import type { StageSongState } from '../useStageSong';
import { LibraryTab } from './LibraryTab';
import { ScoreLibraryList } from './ScoreLibraryList';

interface SongPickerProps {
  open: boolean;
  onClose: () => void;
  state: StageSongState;
}

type PickerTab = 'notes' | 'library' | 'examples' | 'file';

export function SongPicker({ open, onClose, state }: SongPickerProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [tab, setTab] = useState<PickerTab>('notes');
  const fileRef = useRef<HTMLInputElement>(null);
  // the picker stays open when loading fails, so the error below is seen
  const closeIfLoaded = (load: Promise<boolean>) =>
    void load.then((ok) => {
      if (ok) onClose();
    });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{k('song_pick')}</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v: PickerTab) => setTab(v)}
        variant="scrollable"
        sx={{ px: 2 }}
      >
        <Tab value="notes" label={k('tab_notes')} />
        <Tab value="library" label={k('tab_library')} />
        <Tab value="examples" label={k('tab_examples')} />
        <Tab value="file" label={k('tab_file')} />
      </Tabs>
      <DialogContent sx={{ minHeight: 320 }}>
        {tab === 'notes' && (
          <ScoreLibraryList
            onPlay={(item) => closeIfLoaded(state.loadCatalogScore(item))}
            onPlayKaraoke={(song) => closeIfLoaded(state.loadKaraoke(song))}
          />
        )}
        {tab === 'library' && (
          <LibraryTab
            onPlay={(song) => closeIfLoaded(state.loadExample(song.title, song.xmlContent))}
          />
        )}
        {tab === 'examples' && (
          <Stack spacing={1}>
            {DEMO_SONGS.map((d) => (
              <Button
                key={d.id}
                variant="outlined"
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => closeIfLoaded(state.loadExample(d.title, d.xmlContent))}
              >
                {d.title} · {d.artist}
              </Button>
            ))}
          </Stack>
        )}
        {tab === 'file' && (
          <Stack spacing={1.5} alignItems="flex-start">
            <Button variant="contained" onClick={() => fileRef.current?.click()}>
              {k('open_file')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {k('file_hint')}
            </Typography>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".mxl,.musicxml,.xml,.mid,.midi"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) closeIfLoaded(state.loadFile(f));
              }}
            />
          </Stack>
        )}
        {state.error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={state.clearError}>
            {k('load_error', { error: state.error })}
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
