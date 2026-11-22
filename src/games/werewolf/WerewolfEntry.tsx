/**
 * Werewolf on one device, or in a party room when the URL names one (`?room=`)
 * [ID: GAME-WEREWOLF-ENTRY]
 */
import React from 'react';
import { parseGameUrlParams } from '../../modules/sharing';
import { WerewolfGame } from './WerewolfGame';
import { WerewolfRoomGame } from './WerewolfRoomGame';

export const WerewolfEntry: React.FC = () => {
  const room = parseGameUrlParams().get('room');
  return room ? <WerewolfRoomGame roomId={room.toUpperCase()} /> : <WerewolfGame />;
};
