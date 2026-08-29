import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useTranslation } from 'react-i18next';
import { LocalGameEngine } from '../logic/engine';
import { ExcalidrawViewer } from './ExcalidrawViewer';
import type { GuessArtRound, PlayerIdentity } from '../logic/types';

interface RoundHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  gameId: string | null;
  players?: PlayerIdentity[];
}

export const RoundHistoryDialog: React.FC<RoundHistoryDialogProps> = ({
  open,
  onClose,
  gameId,
  players = [],
}) => {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<GuessArtRound[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedRoundId, setExpandedRoundId] = useState<string | false>(false);
  const [replayingRoundId, setReplayingRoundId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !gameId) {
      setRounds([]);
      setExpandedRoundId(false);
      setReplayingRoundId(null);
      return;
    }
    setLoading(true);
    LocalGameEngine.listRounds(gameId)
      .then((data) => {
        const sorted = [...(data || [])].sort((a, b) => a.roundNumber - b.roundNumber);
        setRounds(sorted);
        // Expand the latest completed round by default if any
        const latestCompleted = [...sorted].reverse().find((r) => r.status === 'completed');
        if (latestCompleted) {
          setExpandedRoundId(latestCompleted.id);
        } else if (sorted.length > 0) {
          setExpandedRoundId(sorted[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load rounds history', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, gameId]);

  const getDrawerName = (round: GuessArtRound): string => {
    if (round.drawnByName) return round.drawnByName;
    const player = players.find((p) => p.id === round.drawnById);
    return player?.name || round.drawnById || 'Player';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1.2}>
          <HistoryRoundedIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={800} component="div">
              {t('guessart.historyTitle', 'Runden-Historie')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('guessart.historySubtitle', 'Vergangene Zeichnungen & Runden dieses Spiels')}
            </Typography>
          </Box>
        </Box>
        <IconButton aria-label={t('common.close', 'Schließen')} onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 }, overflowY: 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={6}>
            <CircularProgress />
          </Box>
        ) : rounds.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography color="text.secondary">
              {t('guessart.noRoundsYet', 'Noch keine Runden gespielt.')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {rounds.map((round) => {
              const drawer = getDrawerName(round);
              const isCompleted = round.status === 'completed';
              const isCurrentGuessing = round.status === 'guessing';
              const isExpanded = expandedRoundId === round.id;
              const isReplaying = replayingRoundId === round.id;

              return (
                <Accordion
                  key={round.id}
                  expanded={isExpanded}
                  onChange={(_, expanded) => {
                    setExpandedRoundId(expanded ? round.id : false);
                    if (!expanded && isReplaying) {
                      setReplayingRoundId(null);
                    }
                  }}
                  sx={{
                    borderRadius: '12px !important',
                    border: '1px solid',
                    borderColor: isCompleted ? 'success.light' : 'divider',
                    boxShadow: 1,
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreRoundedIcon />}
                    sx={{ px: 2, py: 1, bgcolor: 'background.paper' }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1} flexWrap="wrap" gap={1}>
                      <Box display="flex" alignItems="center" gap={1.2}>
                        <Chip
                          label={t('guessart.roundHeader', { round: round.roundNumber, defaultValue: `Runde ${round.roundNumber}` })}
                          size="small"
                          color={isCompleted ? 'success' : 'primary'}
                          variant="filled"
                          sx={{ fontWeight: 700 }}
                        />
                        <Typography variant="subtitle1" fontWeight={700}>
                          {isCompleted
                            ? round.word
                            : isCurrentGuessing
                            ? t('guessart.hiddenWord', 'Wird aktuell geraten...')
                            : round.word || t('guessart.selectingWord', 'Wortauswahl...')}
                        </Typography>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          icon={<BrushRoundedIcon fontSize="small" />}
                          label={drawer}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                        {isCompleted && (
                          <Chip
                            icon={<CheckCircleOutlineRoundedIcon fontSize="small" />}
                            label={t('guessart.attemptsCount', {
                              count: round.guesses?.length || 1,
                              defaultValue: `${round.guesses?.length || 1} Versuche`,
                            })}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
                    {round.canvasData ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant={isReplaying ? 'contained' : 'outlined'}
                            color="primary"
                            startIcon={isReplaying ? <VisibilityRoundedIcon /> : <PlayArrowRoundedIcon />}
                            onClick={() => setReplayingRoundId(isReplaying ? null : round.id)}
                            sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.825rem' }}
                          >
                            {isReplaying
                              ? t('guessart.showFinalDrawing', 'Fertiges Bild anzeigen')
                              : t('guessart.replayDrawing', 'Animation abspielen')}
                          </Button>
                        </Box>

                        <Box
                          sx={{
                            width: '100%',
                            height: { xs: 260, sm: 340 },
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                          }}
                        >
                          {isExpanded && (
                            <ExcalidrawViewer
                              key={`${round.id}-${isReplaying ? 'anim' : 'static'}`}
                              data={round.canvasData}
                              animate={isReplaying}
                              viewportZoomFactor={0.82}
                            />
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {t('guessart.noDrawingData', 'Keine Zeichnungsdaten vorhanden.')}
                      </Typography>
                    )}

                    {Array.isArray(round.guesses) && round.guesses.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>
                          {t('guessart.guessesHistoryLabel', 'Geratene Begriffe:')}
                        </Typography>
                        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                          {round.guesses.map((g, idx) => (
                            <Chip
                              key={`${round.id}-guess-${idx}`}
                              label={g}
                              size="small"
                              variant="outlined"
                              color={idx === round.guesses.length - 1 && isCompleted ? 'success' : 'default'}
                              sx={{ fontSize: '0.8rem' }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" color="primary">
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
