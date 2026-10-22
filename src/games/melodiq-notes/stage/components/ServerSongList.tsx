import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isCompanionEnabled,
  listCompanionSongs,
  scoreSearchUrl,
  uploadScore,
  type CompanionScore,
  type CompanionSong,
} from '../../../../lib/companion/songScoresApi';

const MAX_LISTED = 60;

interface ServerSongListProps {
  onPlay: (song: CompanionSong, score: CompanionScore) => void;
}

/** Songs from the Melodiq server; each lists its sheet music, with upload and a link to look for scores. */
export function ServerSongList({ onPlay }: ServerSongListProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [songs, setSongs] = useState<CompanionSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<CompanionSong | null>(null);
  const enabled = isCompanionEnabled();

  const reload = useCallback(() => {
    listCompanionSongs()
      .then((list) => {
        setSongs(list);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (songs ?? []).filter(
      (s) => !q || `${s.artist} ${s.title}`.toLowerCase().includes(q),
    );
    return list
      .sort((a, b) => b.scores.length - a.scores.length || a.artist.localeCompare(b.artist))
      .slice(0, MAX_LISTED);
  }, [songs, query]);

  const upload = async (file: File) => {
    const song = uploadFor.current;
    if (!song) return;
    setBusy(song.id);
    try {
      await uploadScore(song.id, file);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!enabled) return <Alert severity="info">{k('server_off')}</Alert>;
  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="warning">{k('server_error', { error })}</Alert>}
      <TextField
        size="small"
        label={k('search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!songs && !error && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
      <input
        ref={uploadRef}
        type="file"
        hidden
        accept=".mxl,.musicxml,.xml,.mid,.midi"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f);
        }}
      />
      {shown.map((s) => (
        <Box key={s.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {s.artist} – {s.title}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
            sx={{ mt: 0.75 }}
          >
            {s.scores.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                {k('no_scores')}
              </Typography>
            )}
            {s.scores.map((score) => (
              <Button
                key={score.file}
                size="small"
                variant="contained"
                onClick={() => onPlay(s, score)}
              >
                {k('play_score')}: {score.file}
              </Button>
            ))}
            <Button
              size="small"
              variant="outlined"
              disabled={busy === s.id}
              onClick={() => {
                uploadFor.current = s;
                uploadRef.current?.click();
              }}
            >
              {busy === s.id ? k('uploading') : k('upload_score')}
            </Button>
            <Link
              href={scoreSearchUrl(s.artist, s.title)}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              title={k('find_scores_hint')}
            >
              {k('find_scores')}
            </Link>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
