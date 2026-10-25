import { Snackbar, Alert } from '@mui/material';

interface PlaybackFeedbackProps {
  message: string | null;
  onClose: () => void;
  anchorVertical?: 'top' | 'bottom';
}

/** Info toast for playback / song-selection feedback. */
export const PlaybackFeedback = ({
  message,
  onClose,
  anchorVertical = 'bottom',
}: PlaybackFeedbackProps) => (
  <Snackbar
    open={!!message}
    autoHideDuration={3000}
    onClose={onClose}
    anchorOrigin={{ vertical: anchorVertical, horizontal: 'center' }}
  >
    <Alert severity="info" onClose={onClose}>
      {message}
    </Alert>
  </Snackbar>
);
