/**
 * Host-run game state for a party room [ID: MOD-ROOM-GAME-SYNC]
 *
 * One device (the party host) owns the state and runs the game's pure reducer; every other
 * device only sends actions and shows the state it receives. Messages carry the sender's
 * player id, so the host can refuse an action for someone else's sheet (`authorize`), and a
 * revision number, so a late or echoed state never overwrites a newer one.
 */

export type RoomMessage<S, A> =
  | { kind: 'hello'; from: string }
  | { kind: 'action'; from: string; action: A }
  | { kind: 'state'; from: string; rev: number; state: S };

export interface RoomHost<S> {
  state: S;
  rev: number;
}

/** Host side: applies a guest's action if allowed; returns the next host state or `null`. */
export function hostApply<S, A>(
  host: RoomHost<S>,
  action: A,
  from: string,
  reducer: (state: S, action: A) => S,
  authorize: (state: S, action: A, from: string) => boolean = () => true,
): RoomHost<S> | null {
  if (!authorize(host.state, action, from)) return null;
  const next = reducer(host.state, action);
  return next === host.state ? null : { state: next, rev: host.rev + 1 };
}

/** Guest side: takes an incoming state only when it is newer than the one shown. */
export function guestAccept(currentRev: number, incomingRev: number): boolean {
  return incomingRev > currentRev;
}
