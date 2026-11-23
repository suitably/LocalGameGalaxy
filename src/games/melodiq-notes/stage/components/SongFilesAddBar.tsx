import { Button, Stack, TextField, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileRounded';
import MoveIcon from '@mui/icons-material/DriveFileMoveRounded';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SONG_FILE_ACCEPT, canEditSongMeta } from '../logic/songFileEdits';
import type { SongFilesManager } from '../useSongFilesManager';
import { SongChoiceDialog } from './SongChoiceDialog';

interface SongFilesAddBarProps {
  m: SongFilesManager;
  disabled: boolean;
  /** The song's files moved into another song: the dialog closes and the library reloads. */
  onMoved: () => void;
}

/**
 * Adding files to a song folder, with an optional name for a single score (#563), and moving a
 * song without `.txt` into another song, e.g. the Melodiq song it belongs to.
 */
export function SongFilesAddBar({ m, disabled, onMoved }: SongFilesAddBarProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const input = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState('');
  const [moving, setMoving] = useState(false);

  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept={SONG_FILE_ACCEPT}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!files.length) return;
          void m.upload(files, label).then((ok) => ok && setLabel(''));
        }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          label={k('files_add_label')}
          value={label}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          disabled={disabled}
          onClick={() => input.current?.click()}
          sx={{ alignSelf: 'flex-start' }}
        >
          {k('files_add')}
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {k('files_add_hint')}
      </Typography>
      {canEditSongMeta(m.song) && (
        <Button
          variant="text"
          startIcon={<MoveIcon />}
          disabled={disabled}
          onClick={() => setMoving(true)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {k('link_move_open')}
        </Button>
      )}
      {moving && (
        <SongChoiceDialog
          mode="move"
          score={m.song}
          excludeId={m.song.id}
          onCancel={() => setMoving(false)}
          onChoose={({ songId }) => {
            setMoving(false);
            if (songId) void m.merge(songId).then((ok) => ok && onMoved());
          }}
        />
      )}
    </>
  );
}
