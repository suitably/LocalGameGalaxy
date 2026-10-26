/**
 * State of one tap-along calibration run [ID: MOD-AUDIO-LATENCY-TAP-ALONG-HOOK]
 *
 * The caller has the clicks played (on this device or another one) and passes their times and
 * every tap on one shared clock; the hook collects the taps and evaluates them after the last
 * click (`tapAlongLatency`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TAP_ALONG_INTERVAL_MS, tapAlongLatency, type TapAlongResult } from './tapAlong';

export type TapAlongState =
  | { kind: 'idle' }
  /** Clicks were asked for and are not scheduled yet. */
  | { kind: 'waiting' }
  | { kind: 'running'; taps: number; clicks: number }
  | { kind: 'done'; result: TapAlongResult }
  /** Nobody played the clicks (no answer, no sound). */
  | { kind: 'no_clicks' };

export function useTapAlong(onLatency: (ms: number) => void) {
  const [state, setState] = useState<TapAlongState>({ kind: 'idle' });
  const run = useRef<{ clicks: number[]; taps: number[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLatencyRef = useRef(onLatency);
  useEffect(() => {
    onLatencyRef.current = onLatency;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const begin = useCallback(() => {
    run.current = null;
    setState({ kind: 'waiting' });
  }, []);

  /** The clicks are scheduled at `clicks`; `now` is the current time on the same clock. */
  const play = useCallback((clicks: number[] | null, now: number) => {
    if (!clicks?.length) return setState({ kind: 'no_clicks' });
    run.current = { clicks, taps: [] };
    setState({ kind: 'running', taps: 0, clicks: clicks.length });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        const r = run.current;
        run.current = null;
        if (!r) return;
        const result = tapAlongLatency(r.clicks, r.taps);
        if (result.ok) onLatencyRef.current(result.latencyMs);
        setState({ kind: 'done', result });
      },
      clicks[clicks.length - 1] + TAP_ALONG_INTERVAL_MS - now,
    );
  }, []);

  const tap = useCallback((at: number) => {
    const r = run.current;
    if (!r) return;
    r.taps.push(at);
    setState({ kind: 'running', taps: r.taps.length, clicks: r.clicks.length });
  }, []);

  return { state, begin, play, tap };
}
