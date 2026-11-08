import {
  Button,
  DialogActions,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
  type Theme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import type { PendingReview } from '../useBatchImport';

const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

interface RecordingReviewDialogProps {
  review: PendingReview;
  /** The chosen hit's URL, or null to skip the score. */
  onResolve: (url: string | null) => void;
}

/** None of the YouTube hits matches the score's length: the person picks one or skips the score. */
export function RecordingReviewDialog({ review, onResolve }: RecordingReviewDialogProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  return (
    <NotesDialogFrame
      open
      onClose={() => onResolve(null)}
      maxWidth="sm"
      fullScreen={phone}
      title={k('review_title')}
    >
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {k('review_hint', {
            song: `${review.artist} – ${review.title}`,
            length: clock(review.scoreSec),
          })}
        </Typography>
        <List dense disablePadding>
          {review.candidates.map((c) => (
            <ListItemButton key={c.id || c.url} onClick={() => onResolve(c.url)}>
              <ListItemText
                primary={c.title}
                primaryTypographyProps={{ noWrap: true }}
                secondary={k('review_candidate', {
                  uploader: c.uploader,
                  length: c.duration > 0 ? clock(c.duration) : k('review_unknown_length'),
                })}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onResolve(null)}>{k('review_skip')}</Button>
      </DialogActions>
    </NotesDialogFrame>
  );
}
