import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import FileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderIcon from '@mui/icons-material/FolderOpenRounded';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../../components/common/EmptyState';
import { useSongLibrary } from '../../hooks/useSongLibrary';
import type { StoredSheetMusic } from '../../logic/db';
import { matchesQuery } from '../logic/scoreCatalog';

interface OptionTileProps {
  icon: ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}

function OptionTile({ icon, title, hint, disabled, onClick }: OptionTileProps) {
  return (
    <Button
      variant="outlined"
      startIcon={icon}
      disabled={disabled}
      onClick={onClick}
      sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}
    >
      <Box>
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {hint}
        </Typography>
      </Box>
    </Button>
  );
}

interface DeviceTabProps {
  /** Opens one file without storing it. */
  onOpenFile: (file: File) => void;
  /** Plays a score imported from a folder (kept in this browser, works offline). */
  onPlay: (song: StoredSheetMusic) => void;
}

/** Everything on this device: a single file, or a folder imported into this browser. */
export function DeviceTab({ onOpenFile, onPlay }: DeviceTabProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const lib = useSongLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () =>
      lib.librarySongs.filter((s) => matchesQuery(`${s.artist} ${s.title} ${s.fileName}`, query)),
    [lib.librarySongs, query],
  );
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <OptionTile
          icon={<FileIcon />}
          title={k('open_file')}
          hint={k('open_file_hint')}
          onClick={() => fileRef.current?.click()}
        />
        <OptionTile
          icon={<FolderIcon />}
          title={k('import_folder')}
          hint={k('import_folder_hint')}
          disabled={lib.isSyncing}
          onClick={() =>
            lib.supportsDirectoryPicker ? void lib.handleSyncFolder() : folderRef.current?.click()
          }
        />
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".mxl,.musicxml,.xml,.mid,.midi,.gp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onOpenFile(f);
          }}
        />
        <input
          ref={folderRef}
          type="file"
          hidden
          multiple
          {...{ webkitdirectory: '' }}
          onChange={(e) => void lib.handleFolderFileInput(e)}
        />
      </Stack>
      {lib.storedFolders.length > 0 && (
        <Button
          size="small"
          sx={{ alignSelf: 'flex-start' }}
          disabled={lib.isSyncing}
          onClick={() => void lib.handleResyncFolders()}
        >
          {k('resync_folders')}
        </Button>
      )}
      {lib.librarySongs.length === 0 ? (
        <EmptyState dense message={k('device_empty')} />
      ) : (
        <TextField
          size="small"
          type="search"
          label={k('device_search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {shown.map((s) => (
        <Button
          key={s.id}
          variant="outlined"
          startIcon={<PlayIcon />}
          sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          title={s.fileName}
          onClick={() => onPlay(s)}
        >
          {s.title}
          {s.artist ? ` · ${s.artist}` : ''}
        </Button>
      ))}
    </Stack>
  );
}
