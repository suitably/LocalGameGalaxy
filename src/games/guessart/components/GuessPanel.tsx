import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from './ExcalidrawViewer';
import { HintWordSlots } from './HintWordSlots';
import { HintLetterChips, type LetterEntry } from './HintLetterChips';
import { normalize } from '../logic/lingo';
import type { GuessArtRound, HintResult } from '../logic/types';
import { useGuessArtHints } from '../hooks/useGuessArtHints';

interface GuessPanelProps {
  currentRound: GuessArtRound | null;
  onSubmitGuess: (guess: string) => Promise<{ correct: boolean }>;
  onRequestHint: () => Promise<{ hint?: HintResult; exhausted?: boolean }>;
}



export const GuessPanel: React.FC<GuessPanelProps> = ({
  currentRound,
  onSubmitGuess,
  onRequestHint,
}) => {
  const { t } = useTranslation();
  const [guess, setGuess] = useState<string>('');
  const { hintStage, setHintStage, hintLetters, setHintLetters } = useGuessArtHints(currentRound, guess, setGuess);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [requestingHint, setRequestingHint] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'warning' | 'info'; text: string } | null>(null);
  const knownGuessesRef = useRef<Set<string>>(new Set());

  const slotCount = useMemo(() => {
    if (hintStage <= 0) return 0;
    return currentRound?.wordLength || currentRound?.wordMask?.length || 0;
  }, [hintStage, currentRound]);



  const handleHintClick = async () => {
    if (hintStage >= 2 || requestingHint) return;
    setRequestingHint(true);
    try {
      const result = await onRequestHint();
      if (result.hint) {
        setHintStage(result.hint.level);
        if (result.hint.letters.length > 0) {
          setHintLetters(
            result.hint.letters.map((letter, id) => ({
              id,
              letter: letter.toUpperCase(),
              used: false,
            })),
          );

          setGuess((prev) => {
            const pool = [...result.hint!.letters].map((l) => l.toUpperCase());
            let filtered = '';
            for (const char of prev) {
              const upper = char.toUpperCase();
              const idx = pool.indexOf(upper);
              if (idx !== -1) {
                filtered += char;
                pool.splice(idx, 1);
              }
            }
            return filtered;
          });
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Hint failed' });
    } finally {
      setRequestingHint(false);
    }
  };

  const handleLetterChipClick = (entry: LetterEntry) => {
    if (entry.used) return;
    setGuess((prev) => {
      if (slotCount > 0 && prev.length >= slotCount) return prev;
      return prev + entry.letter;
    });

  };

  const handleSlotClick = (index: number) => {
    if (index >= guess.length) return;
    const nextGuess = guess.slice(0, index) + guess.slice(index + 1);
    setGuess(nextGuess);
  };

  const handleSubmit = async () => {
    const trimmed = guess.trim();
    if (!trimmed) return;

    const norm = normalize(trimmed);
    if (knownGuessesRef.current.has(norm)) {
      setFeedback({ type: 'warning', text: t('guessart.repeatedGuess', 'Dieses Wort hast du schon versucht!') });
      return;
    }
    knownGuessesRef.current.add(norm);

    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await onSubmitGuess(trimmed);
      if (!result.correct) {
        setFeedback({ type: 'error', text: t('guessart.wrongGuess', 'Leider falsch! Versuch es weiter.') });
        // Reset guess input for next attempt
        setGuess('');

      }
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Guess failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, height: '100%', position: 'relative' }}>
        <ExcalidrawViewer data={currentRound?.canvasData} />
      </Box>

      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ my: 1 }}>
          {feedback.text}
        </Alert>
      )}

      {/* Hint Slots */}
      {hintStage >= 1 && slotCount > 0 && (
        <HintWordSlots
          slotCount={slotCount}
          guess={guess}
          wordMask={currentRound?.wordMask}
          onSlotClick={handleSlotClick}
        />
      )}

      {/* Hint Letters Pool */}
      {hintStage >= 2 && hintLetters.length > 0 && (
        <HintLetterChips letters={hintLetters} onLetterClick={handleLetterChipClick} />
      )}

      {/* Input Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 1.5, pb: 1 }}>
        <Tooltip title={hintStage >= 2 ? t('guessart.noMoreHints', 'Keine weiteren Tipps') : t('guessart.getHint', 'Tipp anfordern')}>
          <span>
            <IconButton
              color="warning"
              onClick={handleHintClick}
              disabled={hintStage >= 2 || requestingHint}
              sx={{ width: 52, height: 52, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            >
              {requestingHint ? <CircularProgress size={20} /> : <LightbulbRoundedIcon />}
            </IconButton>
          </span>
        </Tooltip>

        <TextField
          fullWidth
          value={guess}
          onChange={(e) => {
            const val = e.target.value;
            let finalVal = val;
            if (hintStage >= 2 && currentRound?.hintLetters) {
              const pool = [...currentRound.hintLetters].map((l) => l.toUpperCase());
              let filtered = '';
              for (const char of val) {
                const upper = char.toUpperCase();
                const idx = pool.indexOf(upper);
                if (idx !== -1) {
                  filtered += char;
                  pool.splice(idx, 1);
                }
              }
              finalVal = filtered;
            }
            if (slotCount > 0 && finalVal.length > slotCount) {
              finalVal = finalVal.slice(0, slotCount);
            }
            setGuess(finalVal);
          }}
          placeholder={t('guessart.guessPlaceholder', 'Was wurde gezeichnet?')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={submitting}
          autoComplete="off"
        />

        <IconButton
          color="primary"
          onClick={handleSubmit}
          disabled={submitting || !guess.trim()}
          sx={{
            width: 52,
            height: 52,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
          }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : <SendRoundedIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};
