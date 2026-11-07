import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { markCheckText } from '../logic/markCheckText';
import type { ScoreAlignment } from '../useFolderAlignment';

interface ScoreAlignmentLineProps {
  row: ScoreAlignment | undefined;
  disabled: boolean;
  onAlign: () => void;
}

/** Under a score in the folder view: how its bar marks stand, the check of a fresh alignment, "Align". */
export function ScoreAlignmentLine({ row, disabled, onAlign }: ScoreAlignmentLineProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  if (!row?.status) return null;

  let text = k(`align_status_${row.pending ? 'pending' : row.status}`);
  let warn = row.status === 'outdated' && !row.pending;
  if (row.pending && row.quality && row.score) {
    const checked = markCheckText(k, row.score, row.quality);
    text += ` · ${checked.text}`;
    warn = checked.unsure;
  }
  if (row.error) {
    text = k('align_failed', { error: row.error });
    warn = true;
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 1 }}>
      <Typography
        variant="caption"
        color={warn ? 'warning.main' : 'text.secondary'}
        sx={{ flex: 1, minWidth: 0 }}
      >
        {text}
      </Typography>
      {row.running ? (
        <CircularProgress size={18} aria-label={k('align')} />
      ) : (
        <Button size="small" disabled={disabled} onClick={onAlign}>
          {row.status === 'none' && !row.pending ? k('files_align') : k('realign')}
        </Button>
      )}
    </Stack>
  );
}
