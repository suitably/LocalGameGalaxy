/**
 * Cabo: one device, pass and play, hidden hands [ID: UI-CABO-GAME]
 *
 * While the handover cover is up, only the cover is rendered — the board of the next player is
 * not in the DOM until they reveal it.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameLayout } from '../../components/Layout/GameLayout';
import { usePageTitle } from '../../context/TitleContext';
import { HandoverCover } from '../../modules/pass-and-play';
import { CaboRoundSummary } from './components/CaboRoundSummary';
import { CaboSetup } from './components/CaboSetup';
import { CaboTable } from './components/CaboTable';
import { initCaboI18n } from './i18n';
import { useCaboGame } from './hooks/useCaboGame';

// Register translations at module load so the first render already has them.
initCaboI18n();

export const CaboGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.cabo.title', 'Cabo'));

  const { game, coverFor, startPeek, start, act, reveal, ackStartPeek, restart } = useCaboGame();

  if (!game) {
    return (
      <GameLayout maxWidth="sm">
        <CaboSetup onStart={start} />
      </GameLayout>
    );
  }

  const covered = coverFor ? game.players.find((p) => p.id === coverFor) : undefined;
  if (covered) {
    return <HandoverCover player={{ id: covered.id, name: covered.name }} onReveal={reveal} />;
  }

  const finished = game.phase === 'round_over' || game.phase === 'game_over';
  return (
    <GameLayout maxWidth="md">
      {finished ? (
        <CaboRoundSummary
          game={game}
          onNextRound={() => act({ type: 'next_round' })}
          onRestart={restart}
        />
      ) : (
        <CaboTable game={game} startPeek={startPeek} onAct={act} onAckStartPeek={ackStartPeek} />
      )}
    </GameLayout>
  );
};
