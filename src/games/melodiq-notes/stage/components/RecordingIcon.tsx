import { Badge, CircularProgress, IconButton, Tooltip } from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEqRounded';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { RecordingStatus } from '../logic/recordingStatus';
import { useRecordingStatus } from '../useRecordingStatus';
import type { StageSongState } from '../useStageSong';

const DOT: Partial<Record<RecordingStatus['kind'], 'error' | 'primary' | 'warning'>> = {
  failed: 'error',
  unaligned: 'warning',
  aligned: 'primary',
};

/** The recording icon with its state: a ring while aligning, else a dot (red: failed). */
export function RecordingIcon({ status }: { status: RecordingStatus }) {
  if (status.kind === 'running')
    return <CircularProgress size={20} variant="determinate" value={status.percent} />;
  const dot = DOT[status.kind];
  return (
    <Badge variant="dot" color={dot ?? 'default'} invisible={!dot}>
      <GraphicEqIcon fontSize="small" />
    </Badge>
  );
}

/** The recording as an icon button, for the stage's top bar while the app header is hidden. */
export function RecordingButton({ state, onOpen }: { state: StageSongState; onOpen: () => void }) {
  const { status, label } = useRecordingStatus(state);
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={onOpen}
        sx={{ width: TOUCH_TARGET, height: TOUCH_TARGET }}
      >
        <RecordingIcon status={status} />
      </IconButton>
    </Tooltip>
  );
}
