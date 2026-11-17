/**
 * Golf: one device, all cards public, 9 holes [ID: UI-GOLF-GAME]
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout } from '../../components/Layout/GameLayout';
import { usePageTitle } from '../../context/TitleContext';
import { GolfRoundSummary } from './components/GolfRoundSummary';
import { GolfSetup } from './components/GolfSetup';
import { GolfTable } from './components/GolfTable';
import { initGolfI18n } from './i18n';
import { useGolfGame } from './hooks/useGolfGame';

// Register translations at module load so the first render already has them.
initGolfI18n();

export const GolfGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.golf.title', 'Golf'));

  const { game, start, act, restart } = useGolfGame();

  if (!game) {
    return (
      <GameLayout maxWidth="sm">
        <GolfSetup onStart={start} />
      </GameLayout>
    );
  }

  const finished = game.phase === 'round_over' || game.phase === 'game_over';

  return (
    <GameLayout maxWidth="md">
      {finished ? (
        <GolfRoundSummary
          game={game}
          onNextRound={() => act({ type: 'next_round' })}
          onRestart={restart}
        />
      ) : (
        <GolfTable game={game} onAct={act} />
      )}
    </GameLayout>
  );
};
