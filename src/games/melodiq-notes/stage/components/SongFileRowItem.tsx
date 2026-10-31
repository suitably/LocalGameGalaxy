import { Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import { useTranslation } from 'react-i18next';
import { companionUrl } from '../../../../lib/companion/songScoresApi';
import type { SongFileRow } from '../logic/songFileEdits';

interface SongFileRowItemProps {
  row: SongFileRow;
  /** The draft label of a score (ignored for recordings). */
  label: string;
  disabled: boolean;
  onLabel: (label: string) => void;
  onDelete: () => void;
}

/** Max label length the server stores (`MAX_LABEL` in `server/…/songFolder.ts`). */
const MAX_LABEL = 100;

/** One file of a song folder: a score with its editable library name, or a recording. */
export function SongFileRowItem({ row, label, disabled, onLabel, onDelete }: SongFileRowItemProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {row.kind === 'score' ? (
        <TextField
          size="small"
          fullWidth
          label={k('files_label')}
          placeholder={row.file}
          value={label}
          disabled={disabled}
          onChange={(e) => onLabel(e.target.value)}
          helperText={row.file}
          slotProps={{ htmlInput: { maxLength: MAX_LABEL } }}
        />
      ) : (
        <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
          {row.file}
        </Typography>
      )}
      {row.kind === 'score' && row.hasMarks && (
        <Chip size="small" variant="outlined" label={k('files_marks')} />
      )}
      <IconButton
        size="small"
        component="a"
        href={companionUrl(row.url)}
        target="_blank"
        rel="noopener noreferrer"
        download={row.file}
        aria-label={k('files_download')}
        title={k('files_download')}
      >
        <DownloadIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        disabled={disabled}
        onClick={onDelete}
        aria-label={k('files_delete')}
        title={k('files_delete')}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
