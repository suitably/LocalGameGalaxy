/**
 * Melodiq Notes: the stage, or a player's own device when the URL names a room (`?pult=`) [ID: GAME-MELODIQ-NOTES-ENTRY]
 */
import React from 'react';
import { parseGameUrlParams } from '../../modules/sharing';
import { MelodiqNotesGame } from './MelodiqNotesGame';
import { PultView } from './pult/PultView';

export const MelodiqNotesEntry: React.FC = () => {
  const params = parseGameUrlParams();
  const room = params.get('pult');
  return room ? (
    <PultView roomId={room.toUpperCase()} wantedPart={params.get('part')} />
  ) : (
    <MelodiqNotesGame />
  );
};
