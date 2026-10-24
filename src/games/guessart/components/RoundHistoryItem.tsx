import React from 'react';
import { Accordion, AccordionSummary, Box, Chip, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { useTranslation } from 'react-i18next';
import { RoundHistoryDetails } from './RoundHistoryDetails';
import type { GuessArtRound } from '../logic/types';

interface RoundHistoryItemProps {
  round: GuessArtRound;
  drawer: string;
  guesser: string;
  isExpanded: boolean;
  isReplaying: boolean;
  addedSynonyms: Set<string>;
  onToggle: (expanded: boolean) => void;
  onToggleReplay: () => void;
  onAddSynonym: (word: string, guess: string, lang: string) => void;
}

export const RoundHistoryItem: React.FC<RoundHistoryItemProps> = ({
  round,
  drawer,
  guesser,
  isExpanded,
  isReplaying,
  addedSynonyms,
  onToggle,
  onToggleReplay,
  onAddSynonym,
}) => {
  const { t } = useTranslation();
  const isCompleted = round.status === 'completed';
  const isCurrentGuessing = round.status === 'guessing';

  const originalWord =
    (round.translations &&
      round.wordLanguageCode &&
      round.translations[round.wordLanguageCode]?.canonical) ||
    round.word;
  const isDifferentOriginal =
    isCompleted &&
    Boolean(
      originalWord &&
      round.word &&
      originalWord.trim().toLowerCase() !== round.word.trim().toLowerCase(),
    );

  const roundTarget = isCompleted
    ? round.word
    : isCurrentGuessing
      ? t('guessart.hiddenWord', 'Wird aktuell geraten...')
      : round.word || t('guessart.selectingWord', 'Wortauswahl...');

  return (
    <Accordion
      expanded={isExpanded}
      onChange={(_, expanded) => onToggle(expanded)}
      elevation={0}
      sx={{
        '&, &:first-of-type, &:last-of-type': { borderRadius: 3 },
        border: '1px solid',
        borderColor: isCompleted ? 'success.light' : 'divider',
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{ px: 2, py: 1, bgcolor: 'background.paper' }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          pr={1}
          flexWrap="wrap"
          gap={1}
        >
          <Box display="flex" alignItems="center" gap={1.2}>
            <Chip
              label={t('guessart.roundHeader', {
                round: round.roundNumber,
                defaultValue: `Runde ${round.roundNumber}`,
              })}
              size="small"
              color={isCompleted ? 'success' : 'primary'}
              variant="filled"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="subtitle1" fontWeight={700}>
              {drawer} vs. {guesser}: {roundTarget}
              {isDifferentOriginal && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic', fontWeight: 500 }}
                >
                  ({originalWord})
                </Typography>
              )}
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
            <Chip
              icon={<PsychologyRoundedIcon fontSize="small" />}
              label={guesser}
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

      <RoundHistoryDetails
        round={round}
        isExpanded={isExpanded}
        isReplaying={isReplaying}
        addedSynonyms={addedSynonyms}
        onToggleReplay={onToggleReplay}
        onAddSynonym={onAddSynonym}
      />
    </Accordion>
  );
};
