/**
 * One move coalescer per table engine [ID: HOOK-TABLETOP-COALESCED-MOVE]
 *
 * Wraps `createMoveCoalescer` (≤ 1 move per 50 ms) with the latest `onMove` callback and drops
 * a pending move on unmount.
 */
import { useEffect, useState } from 'react';
import {
  createMoveCoalescer,
  type CoalescedMove,
  type MoveCoalescer,
} from '../logic/moveCoalescer';

type MoveHandler = (move: CoalescedMove) => void;

export function useCoalescedMove(onMove: MoveHandler): MoveCoalescer {
  const [{ coalescer, handlerRef }] = useState(() => {
    const handler: { current: MoveHandler } = { current: () => {} };
    return {
      handlerRef: handler,
      coalescer: createMoveCoalescer({
        emit: (move) => handler.current(move),
        now: () => performance.now(),
      }),
    };
  });
  useEffect(() => {
    handlerRef.current = onMove;
  });
  useEffect(() => () => coalescer.cancel(), [coalescer]);
  return coalescer;
}
