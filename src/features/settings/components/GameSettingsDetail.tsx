import React from 'react';
import { GameSettingsSections } from '../../../components/settings/GameSettingsSections';
import type { GameDefinition } from '../../../lib/gameRegistry';
import { useSettingsHighlight } from '../hooks/useSettingsHighlight';

interface GameSettingsDetailProps {
  game: GameDefinition;
  /** Section id or highlight to scroll to; ignored when it does not exist. */
  focusId?: string;
}

/** A game's settings page: its host/all sections stacked as cards. */
export const GameSettingsDetail: React.FC<GameSettingsDetailProps> = ({ game, focusId }) => {
  useSettingsHighlight(focusId, [game.id]);
  return <GameSettingsSections sections={game.settings?.sections ?? []} audience="host" />;
};
