/**
 * Cabo: one device, pass and play, hidden hands [ID: UI-CABO-GAME]
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

  const { game, coverFor, start, act, reveal, retarget, restart } = useCaboGame();

  if (!game) {
    return (
      <GameLayout maxWidth="sm">
        <CaboSetup onStart={start} />
      </GameLayout>
    );
  }

  const handoverPlayers = game.players.map((p) => ({ id: p.id, name: p.name }));
  const covered = coverFor ? handoverPlayers.find((p) => p.id === coverFor) : undefined;
  const finished = game.phase === 'round_over' || game.phase === 'game_over';

  return (
    <GameLayout maxWidth="md">
      {covered && (
        <HandoverCover
          player={covered}
          players={handoverPlayers}
          onReveal={reveal}
          onRetarget={retarget}
          onCancel={reveal}
        />
      )}
      {finished ? (
        <CaboRoundSummary
          game={game}
          onNextRound={() => act({ type: 'next_round' })}
          onRestart={restart}
        />
      ) : (
        <CaboTable game={game} onAct={act} />
      )}
    </GameLayout>
  );
};
