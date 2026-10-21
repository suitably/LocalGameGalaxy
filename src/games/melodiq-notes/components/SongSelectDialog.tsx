import React from 'react';
import {
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import { NotesDialogFrame } from './NotesDialogFrame';
import { DEMO_SONGS } from '../demoSongs';
import {
  type DemoSong,
  type StoredSheetMusic,
  type StoredFolderHandle,
  DIFFICULTY_COLORS,
} from '../types';

import { LocalLibraryPanel } from './LocalLibraryPanel';

interface SongSelectDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSong: DemoSong;
  selectedLocalSong: StoredSheetMusic | null;
  librarySongs: StoredSheetMusic[];
  storedFolders: StoredFolderHandle[];
  isSyncing: boolean;
  supportsDirectoryPicker: boolean;
  onSongChange: (song: DemoSong) => void;
  onLocalSongSelect: (song: StoredSheetMusic) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSyncFolder: () => void;
  onResyncFolders: () => void;
  onFolderFileInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFolder: (folderId: string) => void;
}

export const SongSelectDialog: React.FC<SongSelectDialogProps> = ({
  open,
  onClose,
  selectedSong,
  selectedLocalSong,
  librarySongs,
  storedFolders,
  isSyncing,
  supportsDirectoryPicker,
  onSongChange,
  onLocalSongSelect,
  onFileUpload,
  onSyncFolder,
  onResyncFolders,
  onFolderFileInput,
  onRemoveFolder,
}) => {
  const { t } = useTranslation();

  return (
    <NotesDialogFrame
      open={open}
      onClose={onClose}
      maxWidth="sm"
      title={t('games.melodiq_notes.song', 'Song auswählen')}
      titleSx={{}}
    >
      <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        {/* Upload Action */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} size="small">
            {t('games.melodiq_notes.upload_xml', 'XML / MXL hochladen')}
            <input
              type="file"
              hidden
              accept=".xml,.musicxml,.mxl"
              onChange={(e) => {
                onFileUpload(e);
                onClose();
              }}
            />
          </Button>
        </Stack>

        {/* Default Demo Songs */}
        <Typography
          variant="caption"
          color="primary.main"
          fontWeight={700}
          sx={{ textTransform: 'uppercase' }}
        >
          {t('games.melodiq_notes.default_songs')}
        </Typography>
        <List dense sx={{ mb: 2 }}>
          {DEMO_SONGS.map((song) => (
            <ListItemButton
              key={song.id}
              selected={!selectedLocalSong && selectedSong.id === song.id}
              onClick={() => {
                onSongChange(song);
                onClose();
              }}
              sx={{ borderRadius: 2, my: 0.5 }}
            >
              <ListItemText primary={song.title} secondary={song.artist} />
              <Chip
                label={song.difficulty}
                size="small"
                sx={{
                  bgcolor: DIFFICULTY_COLORS[song.difficulty],
                  color: '#fff',
                  fontSize: '0.65rem',
                  height: 18,
                }}
              />
            </ListItemButton>
          ))}
        </List>

        {/* Local Library Songs */}
        {librarySongs.length > 0 && (
          <>
            <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
            <Typography
              variant="caption"
              color="primary.main"
              fontWeight={700}
              sx={{ textTransform: 'uppercase' }}
            >
              {t('games.melodiq_notes.local_library_songs')} ({librarySongs.length})
            </Typography>
            <List dense>
              {librarySongs.map((song) => (
                <ListItemButton
                  key={song.id}
                  selected={selectedLocalSong?.id === song.id}
                  onClick={() => {
                    onLocalSongSelect(song);
                    onClose();
                  }}
                  sx={{ borderRadius: 2, my: 0.5 }}
                >
                  <ListItemText primary={song.title} secondary={song.artist} />
                  <Chip
                    label={`${song.baseBpm} BPM`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {/* Local Folder Management */}
        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
        <LocalLibraryPanel
          storedFolders={storedFolders}
          isSyncing={isSyncing}
          supportsDirectoryPicker={supportsDirectoryPicker}
          onSyncFolder={onSyncFolder}
          onResyncFolders={onResyncFolders}
          onFolderFileInput={onFolderFileInput}
          onRemoveFolder={onRemoveFolder}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{t('common.cancel', 'Abbrechen')}</Button>
      </DialogActions>
    </NotesDialogFrame>
  );
};
