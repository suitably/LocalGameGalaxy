/**
 * Kniffel on one device, or in a party room when the URL names one (`?room=`) [ID: GAME-KNIFFEL-ENTRY]
 */
import React from 'react';
import { parseGameUrlParams } from '../../modules/sharing';
import { KniffelGame } from './KniffelGame';
import { KniffelRoomGame } from './KniffelRoomGame';

export const KniffelEntry: React.FC = () => {
  const room = parseGameUrlParams().get('room');
  return room ? <KniffelRoomGame roomId={room.toUpperCase()} /> : <KniffelGame />;
};
