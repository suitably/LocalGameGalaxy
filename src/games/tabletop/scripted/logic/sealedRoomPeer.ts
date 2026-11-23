/**
 * Host-run scripted game with sealed per-seat views [ID: LOGIC-TABLETOP-SCRIPT-SEALED-PEER]
 *
 * The shared `SealedRoomPeer` (src/modules/room-game/sealed) with the scripted session's rules:
 * hands, stock and the skat never leave the host unsealed.
 */
import {
  SealedRoomPeer as GenericSealedRoomPeer,
  type SealedGame,
  type SealedPeerOptions,
  type SealedRoomMessage as GenericMessage,
} from '../../../../modules/room-game/sealed/sealedRoomPeer';
import { seatPacket, type SeatPacket } from './sealedViews';
import { sessionAllows, sessionReducer, type SessionAction, type SessionState } from './session';

export type SealedRoomMessage = GenericMessage<SessionAction, SeatPacket>;
export type SealedRoomOptions = SealedPeerOptions<SessionState, SeatPacket>;

const SCRIPTED_GAME: SealedGame<SessionState, SessionAction, SeatPacket> = {
  reducer: sessionReducer,
  allows: sessionAllows,
  playerIds: (state) => state.players.map((p) => p.id),
  viewFor: seatPacket,
};

export class SealedRoomPeer extends GenericSealedRoomPeer<SessionState, SessionAction, SeatPacket> {
  constructor(opts: SealedRoomOptions) {
    super(SCRIPTED_GAME, opts);
  }
}
