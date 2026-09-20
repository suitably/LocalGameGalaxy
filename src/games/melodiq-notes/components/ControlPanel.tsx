import {
    Box,
    Paper,
    Stack,
    Select,
    MenuItem,
    ListSubheader,
    FormControl,
    InputLabel,
    Button,
    Typography,
    Divider,
    Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import { DEMO_SONGS } from '../demoSongs';
import { type DemoSong, type PlayMode, type InputSource, type StoredSheetMusic, type StoredFolderHandle, DIFFICULTY_COLORS } from '../types';
import { LocalLibraryPanel } from './LocalLibraryPanel';
import { SpeedControl } from './SpeedControl';

interface ControlPanelProps {
    selectedSong: DemoSong;
    customXmlContent: string | null;
    playMode: PlayMode;
    inputSource: InputSource;
    speedPercent: number;
    effectiveBpm: number;
    // Local library
    librarySongs: StoredSheetMusic[];
    storedFolders: StoredFolderHandle[];
    selectedLocalSong: StoredSheetMusic | null;
    isSyncing: boolean;
    supportsDirectoryPicker: boolean;
    onSongChange: (song: DemoSong) => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPlayModeChange: (mode: PlayMode) => void;
    onInputSourceChange: (source: InputSource) => void;
    onSpeedPercentChange: (speed: number) => void;
    onLocalSongSelect: (song: StoredSheetMusic) => void;
    onSyncFolder: () => void;
    onResyncFolders: () => void;
    onFolderFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFolder: (folderId: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    selectedSong,
    customXmlContent,
    playMode,
    inputSource,
    speedPercent,
    effectiveBpm,
    librarySongs,
    storedFolders,
    selectedLocalSong,
    isSyncing,
    supportsDirectoryPicker,
    onSongChange,
    onFileUpload,
    onPlayModeChange,
    onInputSourceChange,
    onSpeedPercentChange,
    onLocalSongSelect,
    onSyncFolder,
    onResyncFolders,
    onFolderFileInput,
    onRemoveFolder,
}) => {
    const { t } = useTranslation();

    return (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                {/* Song Selector */}
                <FormControl size="small" sx={{ minWidth: 240, maxWidth: 360, flex: '1 1 240px' }}>
                    <InputLabel id="song-select-label">{t('games.melodiq_notes.song')}</InputLabel>
                    <Select
                        labelId="song-select-label"
                        value={customXmlContent ? 'custom' : selectedLocalSong ? `local_${selectedLocalSong.id}` : selectedSong.id}
                        label={t('games.melodiq_notes.song')}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') return;
                            if (val.startsWith('local_')) {
                                const id = val.replace('local_', '');
                                const localSong = librarySongs.find(s => s.id === id);
                                if (localSong) onLocalSongSelect(localSong);
                            } else {
                                const song = DEMO_SONGS.find(s => s.id === val);
                                if (song) onSongChange(song);
                            }
                        }}
                    >
                        <ListSubheader sx={{ lineHeight: '32px', color: 'primary.main', fontWeight: 700 }}>
                            {t('games.melodiq_notes.default_songs')}
                        </ListSubheader>
                        {DEMO_SONGS.map(song => (
                            <MenuItem key={song.id} value={song.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.title}
                                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                            — {song.artist}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={song.difficulty}
                                        size="small"
                                        sx={{
                                            flexShrink: 0,
                                            fontSize: '0.65rem',
                                            height: 18,
                                            bgcolor: DIFFICULTY_COLORS[song.difficulty],
                                            color: '#fff',
                                        }}
                                    />
                                </Box>
                            </MenuItem>
                        ))}

                        {librarySongs.length > 0 && (
                            <ListSubheader sx={{ lineHeight: '32px', color: 'primary.main', fontWeight: 700 }}>
                                {t('games.melodiq_notes.local_library_songs')} ({librarySongs.length})
                            </ListSubheader>
                        )}
                        {librarySongs.map(song => (
                            <MenuItem key={song.id} value={`local_${song.id}`}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {song.title}
                                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                            — {song.artist}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${song.baseBpm} BPM`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            flexShrink: 0,
                                            fontSize: '0.65rem',
                                            height: 18,
                                            borderColor: 'rgba(255,255,255,0.3)',
                                            color: 'text.secondary',
                                        }}
                                    />
                                </Box>
                            </MenuItem>
                        ))}

                        {customXmlContent && (
                            <ListSubheader sx={{ lineHeight: '32px', color: 'primary.main', fontWeight: 700 }}>
                                {t('games.melodiq_notes.custom_upload')}
                            </ListSubheader>
                        )}
                        {customXmlContent && (
                            <MenuItem value="custom">{t('games.melodiq_notes.custom_song')}</MenuItem>
                        )}
                    </Select>
                </FormControl>

                {/* File Upload Button */}
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    size="small"
                >
                    {t('games.melodiq_notes.upload_xml')}
                    <input
                        type="file"
                        hidden
                        accept=".xml,.musicxml,.mxl"
                        onChange={onFileUpload}
                    />
                </Button>

                {/* Mode Switcher */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="mode-select-label">{t('games.melodiq_notes.mode')}</InputLabel>
                    <Select
                        labelId="mode-select-label"
                        value={playMode}
                        label={t('games.melodiq_notes.mode')}
                        onChange={(e) => onPlayModeChange(e.target.value as PlayMode)}
                    >
                        <MenuItem value="continuous">{t('games.melodiq_notes.continuous_mode')}</MenuItem>
                        <MenuItem value="wait">{t('games.melodiq_notes.wait_mode')}</MenuItem>
                    </Select>
                </FormControl>

                {/* Input Source Switcher */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="input-select-label">{t('games.melodiq_notes.input_source')}</InputLabel>
                    <Select
                        labelId="input-select-label"
                        value={inputSource}
                        label={t('games.melodiq_notes.input_source')}
                        onChange={(e) => onInputSourceChange(e.target.value as InputSource)}
                    >
                        <MenuItem value="midi">{t('games.melodiq_notes.midi_keyboard')}</MenuItem>
                        <MenuItem value="mic">{t('games.melodiq_notes.microphone')}</MenuItem>
                    </Select>
                </FormControl>

                {/* Speed Control (in %) */}
                {playMode === 'continuous' && (
                    <SpeedControl
                        speedPercent={speedPercent}
                        effectiveBpm={effectiveBpm}
                        onSpeedPercentChange={onSpeedPercentChange}
                    />
                )}
            </Stack>

            {/* ── Local Library Row ── */}
            <Divider sx={{ my: 1.5 }} />
            <LocalLibraryPanel
                storedFolders={storedFolders}
                isSyncing={isSyncing}
                supportsDirectoryPicker={supportsDirectoryPicker}
                onSyncFolder={onSyncFolder}
                onResyncFolders={onResyncFolders}
                onFolderFileInput={onFolderFileInput}
                onRemoveFolder={onRemoveFolder}
            />
        </Paper>
    );
};
