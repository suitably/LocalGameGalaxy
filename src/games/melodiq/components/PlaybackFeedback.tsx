import { Snackbar, Alert } from '@mui/material';

interface PlaybackFeedbackProps {
  message: string | null;
  onClose: () => void;
}

/** Local feedback toast for PlaybackManager interactions. */
export const PlaybackFeedback = ({ message, onClose }: PlaybackFeedbackProps) => (
  <Snackbar
    open={!!message}
    autoHideDuration={3000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  >
    <Alert severity="info" onClose={onClose}>
      {message}
    </Alert>
  </Snackbar>
);
