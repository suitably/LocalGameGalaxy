/**
 * Knister on one device, or in a party room when the URL names one (`?room=`) [ID: GAME-KNISTER-ENTRY]
 */
import React from 'react';
import { parseGameUrlParams } from '../../modules/sharing';
import { KnisterGame } from './KnisterGame';
import { KnisterRoomGame } from './KnisterRoomGame';

export const KnisterEntry: React.FC = () => {
  const room = parseGameUrlParams().get('room');
  return room ? <KnisterRoomGame roomId={room.toUpperCase()} /> : <KnisterGame />;
};
