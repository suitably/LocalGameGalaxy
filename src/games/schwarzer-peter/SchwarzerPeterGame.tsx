/**
 * Schwarzer Peter: one device, pass and play, hidden hands [ID: UI-SP-GAME]
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout } from '../../components/Layout/GameLayout';
import { usePageTitle } from '../../context/TitleContext';
import { HandoverCover } from '../../modules/pass-and-play';
import { SchwarzerPeterSetup } from './components/SchwarzerPeterSetup';
import { SchwarzerPeterSummary } from './components/SchwarzerPeterSummary';
import { SchwarzerPeterTable } from './components/SchwarzerPeterTable';
import { initSchwarzerPeterI18n } from './i18n';
import { useSchwarzerPeterGame } from './hooks/useSchwarzerPeterGame';

// Register translations at module load so the first render already has them.
initSchwarzerPeterI18n();

export const SchwarzerPeterGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.schwarzer-peter.title', 'Schwarzer Peter'));

  const { game, coverFor, start, act, reveal, restart } = useSchwarzerPeterGame();

  if (!game) {
    return (
      <GameLayout maxWidth="sm">
        <SchwarzerPeterSetup onStart={start} />
      </GameLayout>
    );
  }

  const covered = coverFor ? game.players.find((p) => p.id === coverFor) : undefined;

  let body: React.ReactNode;
  if (covered) {
    body = <HandoverCover player={{ id: covered.id, name: covered.name }} onReveal={reveal} />;
  } else if (game.phase === 'round_over') {
    body = (
      <SchwarzerPeterSummary
        game={game}
        onNextRound={() => act({ type: 'next_round' })}
        onRestart={restart}
      />
    );
  } else {
    body = <SchwarzerPeterTable game={game} onAct={act} />;
  }

  return <GameLayout maxWidth="md">{body}</GameLayout>;
};
