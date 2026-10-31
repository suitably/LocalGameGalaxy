import {
  Button,
  DialogActions,
  DialogContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
  type Theme,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileRounded';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import { BATCH_SCORE_ACCEPT } from '../logic/batchImport';
import { useBatchImport, type BatchItem } from '../useBatchImport';
import { batchProgressText } from './batchProgress';

interface BatchImportDialogProps {
  /** `changed`: at least one song folder was filled, so the library reloads. */
  onClose: (changed: boolean) => void;
}

/**
 * Several score files at once (.gp, .mxl, .musicxml, .xml, .mid): each goes to its song folder,
 * gets the top YouTube hit as recording unless the folder has one, and is aligned to it.
 * Mounted only while open.
 */
export function BatchImportDialog({ onClose }: BatchImportDialogProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const batch = useBatchImport();
  const input = useRef<HTMLInputElement>(null);

  const close = () => {
    batch.cancel();
    onClose(batch.changed);
  };

  const status = (item: BatchItem) => {
    const s = item.status;
    switch (s.kind) {
      case 'waiting':
        return { text: k('batch_waiting') };
      case 'cancelled':
        return { text: k('batch_cancelled') };
      case 'failed':
        return { text: k('yt_failed', { error: s.error }), error: true };
      case 'done': {
        const r = s.result;
        const where = `${r.artist} – ${r.title}`;
        return { text: k(r.aligned ? 'batch_done' : 'batch_done_unaligned', { song: where }) };
      }
      case 'running': {
        const p = batchProgressText(s.progress);
        return { text: k(p.key, p.opts), value: p.value, running: true };
      }
    }
  };

  return (
    <NotesDialogFrame
      open
      onClose={close}
      maxWidth="sm"
      fullScreen={phone}
      title={k('batch_title')}
    >
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {k('batch_hint')}
          </Typography>
          <input
            ref={input}
            type="file"
            hidden
            multiple
            accept={BATCH_SCORE_ACCEPT}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length) void batch.start(files);
            }}
          />
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            disabled={batch.running}
            onClick={() => input.current?.click()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {k('batch_pick')}
          </Button>
          {batch.items.length > 0 && (
            <List dense disablePadding>
              {batch.items.map((item) => {
                const s = status(item);
                return (
                  <ListItem key={item.id} disableGutters sx={{ display: 'block' }}>
                    <ListItemText
                      primary={item.file.name}
                      primaryTypographyProps={{ noWrap: true }}
                      secondary={s.text}
                      secondaryTypographyProps={s.error ? { color: 'error' } : undefined}
                    />
                    {s.running && (
                      <LinearProgress
                        variant={s.value === undefined ? 'indeterminate' : 'determinate'}
                        value={s.value}
                      />
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {batch.running && <Button onClick={batch.cancel}>{k('batch_stop')}</Button>}
        <Button onClick={close}>{t('common.close')}</Button>
      </DialogActions>
    </NotesDialogFrame>
  );
}
