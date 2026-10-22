import { Button, Stack, Typography } from '@mui/material';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSongLibrary } from '../../hooks/useSongLibrary';
import type { StoredSheetMusic } from '../../logic/db';

/** Sheet music synced from a folder on this device (kept in the browser, works offline). */
export function LibraryTab({ onPlay }: { onPlay: (song: StoredSheetMusic) => void }) {
  const { t } = useTranslation();
  const lib = useSongLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {lib.supportsDirectoryPicker ? (
          <Button
            variant="outlined"
            size="small"
            disabled={lib.isSyncing}
            onClick={() => void lib.handleSyncFolder()}
          >
            {t('games.melodiq_notes.sync_folder')}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            disabled={lib.isSyncing}
            onClick={() => inputRef.current?.click()}
          >
            {t('games.melodiq_notes.sync_folder')}
          </Button>
        )}
        {lib.storedFolders.length > 0 && (
          <Button
            variant="text"
            size="small"
            disabled={lib.isSyncing}
            onClick={() => void lib.handleResyncFolders()}
          >
            {t('games.melodiq_notes.resync')}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          {...{ webkitdirectory: '' }}
          onChange={(e) => void lib.handleFolderFileInput(e)}
        />
      </Stack>
      {lib.librarySongs.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('games.melodiq_notes.local_library')}
        </Typography>
      )}
      {lib.librarySongs.map((s) => (
        <Button
          key={s.id}
          variant="outlined"
          sx={{ justifyContent: 'flex-start' }}
          onClick={() => onPlay(s)}
        >
          {s.title}
          {s.artist ? ` · ${s.artist}` : ''}
        </Button>
      ))}
    </Stack>
  );
}
