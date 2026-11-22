/**
 * Qwixx on one device, or in a party room when the URL names one (`?room=`) [ID: GAME-QWIXX-ENTRY]
 */
import React from 'react';
import { parseGameUrlParams } from '../../modules/sharing';
import { QwixxGame } from './QwixxGame';
import { QwixxRoomGame } from './QwixxRoomGame';

export const QwixxEntry: React.FC = () => {
  const room = parseGameUrlParams().get('room');
  return room ? <QwixxRoomGame roomId={room.toUpperCase()} /> : <QwixxGame />;
};
