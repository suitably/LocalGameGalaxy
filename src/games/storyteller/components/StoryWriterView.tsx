import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { useTranslation } from 'react-i18next';
import { StoryContextCard } from './StoryContextCard';
import { ModifierRouletteBar } from './ModifierRouletteBar';
import { ModifierTimerBar } from './ModifierTimerBar';
import { extractPrecedingContext, evaluateRouletteWords } from '../logic/modifiers';
import { useTurnTimer } from '../hooks/useTurnTimer';
import type { StoryEntry, StoryGameRecord } from '../types';

interface StoryWriterViewProps {
  game: StoryGameRecord;
  entries: StoryEntry[];
  onSubmitTurn: (text: string, timeSpentSeconds?: number) => Promise<unknown>;
  onFinishStory: () => Promise<unknown>;
  loading?: boolean;
}

export const StoryWriterView: React.FC<StoryWriterViewProps> = ({
  game,
  entries,
  onSubmitTurn,
  onFinishStory,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const modifiers = game.options.modifiers;
  const timeAttack = modifiers.timeAttack;
  const wordRoulette = modifiers.wordRoulette;

  const contextView = useMemo(
    () => extractPrecedingContext(entries, modifiers.blindMode),
    [entries, modifiers.blindMode],
  );

  const rouletteEvaluation = useMemo(() => {
    if (!wordRoulette.enabled || !game.currentRequiredWords) return [];
    return evaluateRouletteWords(text, game.currentRequiredWords);
  }, [wordRoulette.enabled, game.currentRequiredWords, text]);

  const allRouletteWordsMet = useMemo(() => {
    if (!wordRoulette.enabled || rouletteEvaluation.length === 0) return true;
    return rouletteEvaluation.every((e) => e.matched);
  }, [wordRoulette.enabled, rouletteEvaluation]);

  const wordsCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting || loading) return;
    if (wordRoulette.enabled && !allRouletteWordsMet) return;

    setSubmitting(true);
    try {
      await onSubmitTurn(trimmed);
      setText('');
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, loading, wordRoulette.enabled, allRouletteWordsMet, onSubmitTurn]);

  // Handle timer auto-submit when time runs out
  const handleTimerExpire = useCallback(() => {
    const current = text.trim();
    if (current) {
      handleSend();
    } else {
      // If nothing entered, provide a narrative fallback turn
      onSubmitTurn(t('storyteller.timeoutFallback', '...und plötzlich geschah eine unerwartete Wendung!')).then(() => {
        setText('');
      });
    }
  }, [text, handleSend, onSubmitTurn, t]);

  const { timeLeft, percentRemaining, isExpiringSoon, isCritical } = useTurnTimer({
    durationSeconds: timeAttack.timeLimitSeconds || 45,
    isActive: timeAttack.enabled && !loading && !submitting,
    onExpire: handleTimerExpire,
  });

  const activePlayer = game.players[game.currentPlayerIndex] || {
    name: t('storyteller.defaultPlayer', 'Spieler'),
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        p: { xs: 1, sm: 2 },
      }}
    >
      {/* Context from previous turns */}
      <StoryContextCard contextView={contextView} totalEntriesCount={entries.length} />

      {/* Time Attack widget if enabled */}
      {timeAttack.enabled && (
        <ModifierTimerBar
          timeLeft={timeLeft}
          percentRemaining={percentRemaining}
          isExpiringSoon={isExpiringSoon}
          isCritical={isCritical}
        />
      )}

      {/* Word Roulette widget if enabled */}
      {wordRoulette.enabled && <ModifierRouletteBar evaluation={rouletteEvaluation} />}

      {/* Main Text Writing Area */}
      <Card
        variant="outlined"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderRadius: 2,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 180,
        }}
      >
        <CardContent
          sx={{
            p: 2,
            '&:last-child': { pb: 2 },
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <Typography variant="caption" fontWeight={600} sx={{ color: '#94a3b8', mb: 1 }}>
            {t('storyteller.authorInputTitle', 'Dein Textabschnitt')}: {activePlayer.name}
          </Typography>

          <TextField
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            variant="outlined"
            placeholder={t(
              'storyteller.inputPlaceholder',
              'Schreibe hier deinen Teil der Geschichte weiter...',
            )}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting || loading}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(15, 23, 42, 0.4)',
                color: '#f8fafc',
                fontSize: { xs: '0.95rem', sm: '1rem' },
                lineHeight: 1.6,
                fontFamily: 'Georgia, serif',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                '&:hover fieldset': { borderColor: '#38bdf8' },
                '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
              },
            }}
          />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1.5,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {wordsCount} {t('storyteller.words', 'Wörter')} | {text.length}{' '}
              {t('storyteller.characters', 'Zeichen')}
            </Typography>

            <Stack direction="row" spacing={1}>
              {entries.length >= 2 && (
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={onFinishStory}
                  disabled={submitting || loading}
                  startIcon={<CheckCircleOutlineRoundedIcon />}
                  sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  {t('storyteller.finishStory', 'Geschichte beenden')}
                </Button>
              )}

              <Button
                variant="contained"
                size="small"
                onClick={handleSend}
                disabled={!text.trim() || !allRouletteWordsMet || submitting || loading}
                startIcon={<SendRoundedIcon />}
                sx={{
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  fontWeight: 600,
                  px: 2,
                }}
              >
                {t('storyteller.submitTurn', 'Abschnitt senden')}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
