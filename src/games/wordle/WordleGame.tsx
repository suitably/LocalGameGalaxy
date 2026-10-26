/**
 * WordleGame.tsx - Main Wordle Game View & Screen Coordinator
 */

import React from 'react';
import { Alert, Box, Button, ButtonGroup } from '@mui/material';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { useGameSettingsHost } from '../../context/GameSettingsContext';
import { GameLayout } from '../../components/Layout/GameLayout';
import { useWordleScreen } from './hooks/useWordleScreen';
import { WordleBoard } from './components/WordleBoard';
import { WordleKeyboard } from './components/WordleKeyboard';
import { WordleStatsModal } from './components/WordleStatsModal';
import { WordleDuelModal } from './components/WordleDuelModal';
import { WordleHistoryModal } from './components/WordleHistoryModal';
import { WordleHelpDialog } from './components/WordleHelpDialog';
import { WordleToast } from './components/WordleToast';
import { HeaderActionBar } from './components/HeaderActionBar';

export const WordleGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.wordle.title', 'Wordle'));

  const {
    state,
    stats,
    keyStatuses,
    language,
    reloadDictionaryOnly,
    openDialog,
    open,
    close,
    addLetter,
    removeLetter,
    submitGuess,
    switchMode,
    startNewGame,
  } = useWordleScreen();

  useGameSettingsHost({ onClose: reloadDictionaryOnly });

  const finished = state.status !== 'playing';

  return (
    <GameLayout maxWidth="sm" disablePadding>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: { xs: 1.5, sm: 2.5 },
        }}
      >
        <HeaderActionBar
          onHistory={() => open('history')}
          onDuel={() => open('duel')}
          onStats={() => open('stats')}
          onHelp={() => open('help')}
        />

        <ButtonGroup size="small" variant="outlined" sx={{ mb: 1.5 }}>
          <Button
            variant={state.mode === 'daily' ? 'contained' : 'outlined'}
            onClick={() => switchMode('daily')}
          >
            {t('wordle.mode.daily', 'Tagesrätsel')}
          </Button>
          <Button
            variant={state.mode === 'practice' ? 'contained' : 'outlined'}
            onClick={() => switchMode('practice')}
          >
            {t('wordle.mode.practice', 'Üben')}
          </Button>
        </ButtonGroup>

        {state.mode === 'duel' && (
          <Alert severity="info" sx={{ width: '100%', mb: 1.5, py: 0.2 }}>
            {t('wordle.duel.active_banner', 'Du spielst ein Duell-Wort eines Freundes!')}
          </Alert>
        )}

        {state.message && <WordleToast message={state.message} status={state.status} />}

        <WordleBoard
          guesses={state.guesses}
          evaluations={state.evaluations}
          currentInput={state.currentInput}
          isShaking={state.invalidWordShake}
        />

        {finished && state.mode !== 'daily' && (
          <Button
            variant="contained"
            startIcon={<ReplayRoundedIcon />}
            onClick={() => startNewGame('practice')}
            sx={{ mb: 1, fontWeight: 700 }}
          >
            {t('wordle.new_word', 'Neues Wort')}
          </Button>
        )}

        {finished && state.mode === 'daily' && (
          <Button
            variant="contained"
            startIcon={<BarChartRoundedIcon />}
            onClick={() => open('stats')}
            sx={{ mb: 1, fontWeight: 700 }}
          >
            {t('wordle.stats.btn_tooltip', 'Statistiken')}
          </Button>
        )}

        <Box sx={{ mt: 'auto', width: '100%' }}>
          <WordleKeyboard
            onChar={addLetter}
            onDelete={removeLetter}
            onEnter={submitGuess}
            keyStatuses={keyStatuses}
            language={language}
            disabled={finished}
          />
        </Box>

        <WordleStatsModal
          open={openDialog === 'stats'}
          onClose={close}
          stats={stats}
          gameStatus={state.status}
          targetWord={state.targetWord}
          evaluations={state.evaluations}
          mode={state.mode}
          dateKey={state.dateKey}
          onPlayAgain={state.mode !== 'daily' ? () => startNewGame('practice') : undefined}
        />
        <WordleDuelModal open={openDialog === 'duel'} onClose={close} />
        <WordleHistoryModal open={openDialog === 'history'} onClose={close} language={language} />
        <WordleHelpDialog open={openDialog === 'help'} onClose={close} />
      </Box>
    </GameLayout>
  );
};
