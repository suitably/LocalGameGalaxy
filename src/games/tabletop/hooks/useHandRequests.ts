/**
 * Hand requests as one seat sees them [ID: HOOK-TABLETOP-HAND-REQUESTS]
 *
 * #557: the other seats with a hand, the requests this seat sent and received, and the actions
 * to ask, answer and close. A seatless viewer (spectator, TV) gets nothing and cannot act.
 */
import { useCallback, useMemo } from 'react';
import type { Dispatch } from 'react';
import { useTranslation } from 'react-i18next';
import type { TabletopAction } from '../logic/tabletopReducer';
import type { SeatWidget, TabletopGameDefinition, TabletopWidget } from '../logic/types';
import {
  handCardIds,
  handSeats,
  type HandRequest,
  type HandRequestKind,
  type ViewAnswer,
  type ViewAsk,
} from '../logic/handRequests';

export interface HandSeat {
  seat: number;
  name: string;
  /** Card ids in that seat's hand, in position order (faces stay redacted for others). */
  cardIds: string[];
}

/** Name of a seat: its seat widget's player or label, else "Player n". */
function seatNames(widgets: Record<string, TabletopWidget>, fallback: (seat: number) => string) {
  const names = new Map<number, string>();
  for (const w of Object.values(widgets)) {
    if (w.type !== 'seat') continue;
    const seat = w as SeatWidget;
    const name = seat.player || seat.label;
    if (name && !names.has(seat.index)) names.set(seat.index, name);
  }
  return (seat: number) => names.get(seat) ?? fallback(seat);
}

export function useHandRequests(
  game: Pick<TabletopGameDefinition, 'widgets' | 'handRequests'>,
  seat: number | null,
  dispatch: Dispatch<TabletopAction>,
) {
  const { t } = useTranslation();
  const { widgets, handRequests } = game;

  const view = useMemo(() => {
    const nameOf = seatNames(widgets, (n) => t('games.tabletop.playerN', { n: n + 1 }));
    if (seat === null) {
      return { nameOf, others: [] as HandSeat[], incoming: [], outgoing: [], results: [] };
    }
    const others: HandSeat[] = handSeats(widgets)
      .filter((s) => s !== seat)
      .map((s) => ({ seat: s, name: nameOf(s), cardIds: handCardIds(widgets, s) }));
    const list: HandRequest[] = Object.values(handRequests ?? {});
    return {
      nameOf,
      others,
      /** Requests waiting for this seat's answer. */
      incoming: list.filter((r) => r.to === seat && r.status === 'pending'),
      /** This seat's own requests still waiting for an answer. */
      outgoing: list.filter((r) => r.from === seat && r.status === 'pending'),
      /** Answers to this seat's requests, shown until dismissed. */
      results: list.filter((r) => r.from === seat && r.status !== 'pending'),
    };
  }, [widgets, handRequests, seat, t]);

  const send = useCallback(
    (payload: Extract<TabletopAction, { type: 'HAND_REQUEST' }>['payload']) =>
      dispatch({ type: 'HAND_REQUEST', payload }),
    [dispatch],
  );

  /** Creates, extends or reduces this seat's request to `to`; `null` withdraws it. */
  const ask = useCallback(
    (to: number, next: ViewAsk | null) => {
      if (seat === null) return;
      send(
        next
          ? { op: 'ask', from: seat, to, ask: next }
          : { op: 'close', from: seat, to, kind: 'view' },
      );
    },
    [seat, send],
  );

  /** Withdraws a pending request of this seat or dismisses an answer it got. */
  const close = useCallback(
    (to: number, kind: HandRequestKind) => {
      if (seat !== null) send({ op: 'close', from: seat, to, kind });
    },
    [seat, send],
  );

  /** Answers a request `from` another seat to this seat's hand. */
  const answer = useCallback(
    (from: number, reply: ViewAnswer) => {
      if (seat !== null) send({ op: 'answer', from, to: seat, kind: 'view', answer: reply });
    },
    [seat, send],
  );

  return {
    ...view,
    myCardIds: seat === null ? [] : handCardIds(widgets, seat),
    ask,
    close,
    answer,
  };
}
