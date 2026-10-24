import React, { useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useTranslation } from 'react-i18next';
import type { StoryEntry, StoryGameRecord } from '../types';

interface StoryReaderModalProps {
  open: boolean;
  onClose: () => void;
  game: StoryGameRecord | null;
  entries: StoryEntry[];
}

export const StoryReaderModal: React.FC<StoryReaderModalProps> = ({
  open,
  onClose,
  game,
  entries,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!game) return null;

  const title = game.name || t('games.storyteller.title', 'Geschichtenschreiber');
  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);

  const handleCopyStory = () => {
    const header = `📖 ${title}\n${'='.repeat(title.length + 3)}\n\n`;
    const body = entries
      .map((entry) => `[Kapitel ${entry.turnNumber} - ${entry.authorName}]\n${entry.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(header + body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <MenuBookRoundedIcon sx={{ color: 'secondary.main' }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {entries.length} {t('storyteller.chapters', 'Kapitel')} • {totalWords}{' '}
              {t('storyteller.words', 'Wörter')}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <Box py={6} textAlign="center">
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {t('storyteller.noEntriesYet', 'Es wurde noch kein Text geschrieben.')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {entries.map((entry) => (
              <Box key={entry.id} sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'secondary.main' }}>
                    {t('storyteller.chapter', 'Kapitel')} {entry.turnNumber}
                  </Typography>

                  <Chip
                    size="small"
                    label={entry.authorName}
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: 'Georgia, serif',
                    fontSize: { xs: '1rem', sm: '1.05rem' },
                    lineHeight: 1.8,
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {entry.text}
                </Typography>

                <Divider
                  sx={{ borderColor: (theme) => alpha(theme.palette.text.primary, 0.08), mt: 3 }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleCopyStory}
          disabled={entries.length === 0}
          startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          sx={{
            borderColor: (theme) => alpha(theme.palette.text.primary, 0.2),
            color: copied ? 'success.main' : 'inherit',
          }}
        >
          {copied
            ? t('common.copied', 'Kopiert!')
            : t('storyteller.copyStory', 'Geschichte kopieren')}
        </Button>

        <Button
          variant="contained"
          size="small"
          onClick={onClose}
          sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
        >
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
