import {
  Alert,
  DialogContent,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ServerIcon from '@mui/icons-material/CloudOutlined';
import DeviceIcon from '@mui/icons-material/DevicesRounded';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import { isCompanionEnabled } from '../../../../lib/companion/songScoresApi';
import { useCatalogSearch } from '../useCatalogSearch';
import type { StageSongState } from '../useStageSong';
import { DeviceTab } from './DeviceTab';
import { ScoreLibraryList } from './ScoreLibraryList';

interface SongPickerProps {
  open: boolean;
  onClose: () => void;
  state: StageSongState;
}

/** Where the songs come from: the server's shared library, or this device only. */
type PickerTab = 'server' | 'device';

export function SongPicker({ open, onClose, state }: SongPickerProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [tab, setTab] = useState<PickerTab>(() => (isCompanionEnabled() ? 'server' : 'device'));
  const search = useCatalogSearch();
  // a phone gets the whole screen for search, filters and results
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  // the picker stays open when loading fails, so the error below is seen
  const closeIfLoaded = (load: Promise<boolean>) =>
    void load.then((ok) => {
      if (ok) onClose();
    });
  return (
    <NotesDialogFrame
      open={open}
      onClose={onClose}
      title={k('song_pick')}
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <Tabs value={tab} onChange={(_, v: PickerTab) => setTab(v)} variant="fullWidth">
        <Tab value="server" icon={<ServerIcon />} iconPosition="start" label={k('tab_server')} />
        <Tab value="device" icon={<DeviceIcon />} iconPosition="start" label={k('tab_device')} />
      </Tabs>
      <DialogContent sx={{ minHeight: 320 }}>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
          {k(tab === 'server' ? 'scope_server' : 'scope_device')}
        </Typography>
        {tab === 'server' && (
          <ScoreLibraryList
            search={search}
            onPlay={(item) => closeIfLoaded(state.loadCatalogScore(item))}
            onPlayKaraoke={(song) => closeIfLoaded(state.loadKaraoke(song))}
          />
        )}
        {tab === 'device' && (
          <DeviceTab
            onOpenFile={(file) => closeIfLoaded(state.loadFile(file))}
            onPlay={(song) => closeIfLoaded(state.loadExample(song.title, song.xmlContent))}
          />
        )}
        {state.error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={state.clearError}>
            {k('load_error', { error: state.error })}
          </Alert>
        )}
      </DialogContent>
    </NotesDialogFrame>
  );
}
