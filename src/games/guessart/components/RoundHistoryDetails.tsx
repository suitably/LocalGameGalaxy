import React from 'react';
import { AccordionDetails, Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from './ExcalidrawViewer';
import type { GuessArtRound } from '../logic/types';

interface RoundHistoryDetailsProps {
  round: GuessArtRound;
  isExpanded: boolean;
  isReplaying: boolean;
  addedSynonyms: Set<string>;
  onToggleReplay: () => void;
  onAddSynonym: (word: string, guess: string, lang: string) => void;
}

export const RoundHistoryDetails: React.FC<RoundHistoryDetailsProps> = ({
  round,
  isExpanded,
  isReplaying,
  addedSynonyms,
  onToggleReplay,
  onAddSynonym,
}) => {
  const { t } = useTranslation();
  const isCompleted = round.status === 'completed';

  return (
    <AccordionDetails
      sx={{ p: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}
    >
      {round.canvasData ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant={isReplaying ? 'contained' : 'outlined'}
              color="primary"
              startIcon={isReplaying ? <VisibilityRoundedIcon /> : <PlayArrowRoundedIcon />}
              onClick={onToggleReplay}
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
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            display="block"
            mb={0.5}
          >
            {t('guessart.guessesHistoryLabel', 'Geratene Begriffe:')}
          </Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            {round.guesses.map((g, idx) => {
              const isCorrectAnswer = idx === round.guesses.length - 1 && isCompleted;
              const isWrong =
                isCompleted &&
                !isCorrectAnswer &&
                g.trim().toLowerCase() !== round.word.trim().toLowerCase();
              const isAdded = addedSynonyms.has(`${round.word}:::${g}`);
              const key = `${round.id}-guess-${idx}`;

              if (!isWrong) {
                return (
                  <Chip
                    key={key}
                    label={g}
                    size="small"
                    variant="outlined"
                    color={isCorrectAnswer ? 'success' : 'default'}
                    sx={{ fontSize: '0.8rem', fontWeight: isCorrectAnswer ? 700 : 400 }}
                  />
                );
              }

              return (
                <Tooltip
                  key={key}
                  title={
                    isAdded
                      ? t('guessart.synonymAddedTooltip', 'Bereits hinzugefügt')
                      : t('guessart.addSynonymTooltip', 'Als Synonym zum Wort speichern')
                  }
                >
                  <Chip
                    label={g}
                    size="small"
                    color={isAdded ? 'success' : 'default'}
                    variant={isAdded ? 'filled' : 'outlined'}
                    icon={
                      isAdded ? (
                        <DoneRoundedIcon fontSize="small" />
                      ) : (
                        <AddRoundedIcon fontSize="small" />
                      )
                    }
                    onClick={() =>
                      !isAdded && onAddSynonym(round.word, g, round.wordLanguageCode || 'de')
                    }
                    clickable={!isAdded}
                    sx={{ fontSize: '0.8rem', cursor: isAdded ? 'default' : 'pointer' }}
                  />
                </Tooltip>
              );
            })}
          </Stack>
        </Box>
      )}
    </AccordionDetails>
  );
};
