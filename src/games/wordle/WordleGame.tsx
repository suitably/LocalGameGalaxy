/**
 * WordleGame.tsx - Main Wordle Game View & Screen Coordinator
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Tooltip,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWordle } from './hooks/useWordle';
import { wordleEngine } from './logic/wordleEngine';
import { WordleBoard } from './components/WordleBoard';
import { WordleKeyboard } from './components/WordleKeyboard';
import { WordleStatsModal } from './components/WordleStatsModal';
import { WordleDuelModal } from './components/WordleDuelModal';
import type { WordleGameMode } from './logic/types';

export const WordleGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [statsOpen, setStatsOpen] = useState(false);
  const [duelOpen, setDuelOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Check URL parameters for duel challenge
  const duelParam = new URLSearchParams(location.search).get('duel') ||
    (location.hash.includes('?') ? new URLSearchParams(location.hash.split('?')[1]).get('duel') : null);

  const customDuelWord = duelParam ? wordleEngine.decodeDuelWord(duelParam) : null;
  const initialMode: WordleGameMode = customDuelWord ? 'duel' : 'daily';

  const {
    state,
    stats,
    keyStatuses,
    addLetter,
    removeLetter,
    submitGuess,
    startNewGame,
    clearShake,
  } = useWordle(i18n.language || 'de', initialMode, customDuelWord);

  // Automatically open stats modal when game is won or lost
  useEffect(() => {
    if (state.status !== 'playing') {
      const timer = setTimeout(() => {
        setStatsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Clear shake animation after 600ms
  useEffect(() => {
    if (state.invalidWordShake) {
      const timer = setTimeout(clearShake, 600);
      return () => clearTimeout(timer);
    }
  }, [state.invalidWordShake, clearShake]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        py: { xs: 1.5, sm: 2.5 },
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          pb: 1.5,
          mb: 1.5,
        }}
      >
        <IconButton onClick={() => navigate('/')} edge="start">
          <ArrowBackRoundedIcon />
        </IconButton>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: 2,
            background: 'linear-gradient(90deg, #4caf50, #81c784)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          WORDLE
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={t('wordle.duel.btn_tooltip', 'Freund herausfordern')}>
            <IconButton onClick={() => setDuelOpen(true)}>
              <PersonAddAlt1RoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('wordle.stats.btn_tooltip', 'Statistiken')}>
            <IconButton onClick={() => setStatsOpen(true)}>
              <BarChartRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.help', 'Hilfe')}>
            <IconButton onClick={() => setHelpOpen(true)}>
              <HelpOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Mode Selector */}
      <ButtonGroup size="small" variant="outlined" sx={{ mb: 1.5 }}>
        <Button
          variant={state.mode === 'daily' ? 'contained' : 'outlined'}
          color="success"
          onClick={() => startNewGame('daily')}
        >
          {t('wordle.mode.daily', 'Tagesrätsel 📅')}
        </Button>
        <Button
          variant={state.mode === 'practice' ? 'contained' : 'outlined'}
          color="success"
          onClick={() => startNewGame('practice')}
        >
          {t('wordle.mode.practice', 'Üben 🎯')}
        </Button>
      </ButtonGroup>

      {/* Duel Banner */}
      {state.mode === 'duel' && (
        <Alert severity="info" sx={{ width: '100%', mb: 1.5, py: 0.2 }}>
          {t('wordle.duel.active_banner', 'Du spielst ein Duell-Wort eines Freundes!')}
        </Alert>
      )}

      {/* Notification Toast */}
      {state.message && (
        <Paper
          elevation={4}
          sx={{
            px: 2,
            py: 0.8,
            mb: 1,
            borderRadius: 2,
            bgcolor: state.status === 'won' ? '#2e7d32' : state.status === 'lost' ? '#c62828' : 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {t(state.message)}
        </Paper>
      )}

      {/* 6x5 Letter Board */}
      <WordleBoard
        guesses={state.guesses}
        evaluations={state.evaluations}
        currentInput={state.currentInput}
        isShaking={state.invalidWordShake}
      />

      {/* Action / Play Again Button if finished in Practice mode */}
      {state.status !== 'playing' && state.mode !== 'daily' && (
        <Button
          variant="contained"
          color="success"
          startIcon={<ReplayRoundedIcon />}
          onClick={() => startNewGame('practice')}
          sx={{ mb: 1, fontWeight: 700 }}
        >
          {t('wordle.new_word', 'Neues Wort')}
        </Button>
      )}

      {/* On-Screen Touch Keyboard */}
      <Box sx={{ mt: 'auto', width: '100%' }}>
        <WordleKeyboard
          onChar={addLetter}
          onDelete={removeLetter}
          onEnter={submitGuess}
          keyStatuses={keyStatuses}
          language={i18n.language}
          disabled={state.status !== 'playing'}
        />
      </Box>

      {/* Stats Modal */}
      <WordleStatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        gameStatus={state.status}
        targetWord={state.targetWord}
        evaluations={state.evaluations}
        mode={state.mode}
        dateKey={state.dateKey}
        onPlayAgain={state.mode !== 'daily' ? () => startNewGame('practice') : undefined}
      />

      {/* Duel Creator Modal */}
      <WordleDuelModal open={duelOpen} onClose={() => setDuelOpen(false)} />

      {/* How to play dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t('wordle.help.title', 'Spielregeln 📖')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2">
            {t('wordle.help.p1', 'Errate das 5-Buchstaben-Wort in 6 Versuchen.')}
          </Typography>
          <Typography variant="body2">
            {t('wordle.help.p2', 'Nach jedem Versuch färben sich die Kacheln:')}
          </Typography>
          <Stack spacing={1} sx={{ my: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, bgcolor: '#2e7d32', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>A</Box>
              <Typography variant="body2">{t('wordle.help.green', 'Grün: Buchstabe ist an der richtigen Stelle.')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, bgcolor: '#f9a825', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>B</Box>
              <Typography variant="body2">{t('wordle.help.yellow', 'Gelb: Buchstabe kommt im Wort vor, aber an anderer Stelle.')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, bgcolor: '#374151', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>C</Box>
              <Typography variant="body2">{t('wordle.help.gray', 'Grau: Buchstabe kommt nicht im Wort vor.')}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>{t('common.close', 'Verstanden')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
