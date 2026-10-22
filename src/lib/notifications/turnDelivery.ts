/**
 * Who gets told about a turn, and how [ID: LIB-NOTIFICATIONS-TURN-DELIVERY]
 *
 * One rule for both directions of an async game:
 * - the device that just finished a move decides whether to push the next player (`push`),
 *   show a notification itself (`local`) or stay quiet (`none`);
 * - a device that receives the new state over the mailbox decides whether to show one.
 * Pure: callers pass in what they know about seats and visibility.
 */

export type TurnDelivery =
  | { kind: 'push' }
  | { kind: 'local' }
  | {
      kind: 'none';
      reason:
        'same_player' | 'temporary_claim' | 'pass_and_play' | 'visible' | 'not_on_this_device';
    };

export interface TurnDeliveryInput {
  /** The player whose turn it is now plays on this device. */
  targetIsLocal: boolean;
  /** Every player of the game plays on this device (pass and play). */
  allPlayersLocal: boolean;
  /** The player who made the move is the one who is next (nothing to announce). */
  targetIsActor: boolean;
  /** The move was made under "play here" for a remote player. */
  temporaryClaim: boolean;
  /** The game is open and visible on this device. */
  appVisible: boolean;
}

const none = (reason: Extract<TurnDelivery, { kind: 'none' }>['reason']): TurnDelivery => ({
  kind: 'none',
  reason,
});

/** On the device that made the move. */
export function deliveryAfterOwnMove(input: TurnDeliveryInput): TurnDelivery {
  if (input.targetIsActor) return none('same_player');
  if (input.temporaryClaim) return none('temporary_claim');
  if (input.targetIsLocal) {
    if (input.allPlayersLocal) return none('pass_and_play');
    return input.appVisible ? none('visible') : { kind: 'local' };
  }
  return { kind: 'push' };
}

/** On a device that received the new state from another device. */
export function deliveryForIncomingMove(input: TurnDeliveryInput): TurnDelivery {
  if (input.targetIsActor) return none('same_player');
  if (input.temporaryClaim) return none('temporary_claim');
  if (!input.targetIsLocal) return none('not_on_this_device');
  if (input.allPlayersLocal) return none('pass_and_play');
  return input.appVisible ? none('visible') : { kind: 'local' };
}
