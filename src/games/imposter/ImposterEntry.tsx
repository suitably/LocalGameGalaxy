/**
 * Imposter on one device, or in a party room when the URL names one (`?room=`) [ID: GAME-IMPOSTER-ENTRY]
 */
import React from 'react';
import { parseGameUrlParams } from '../../modules/sharing';
import { ImposterGame } from './ImposterGame';
import { ImposterRoomGame } from './ImposterRoomGame';

export const ImposterEntry: React.FC = () => {
  const room = parseGameUrlParams().get('room');
  return room ? <ImposterRoomGame roomId={room.toUpperCase()} /> : <ImposterGame />;
};
