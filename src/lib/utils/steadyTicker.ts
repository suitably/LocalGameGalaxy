/**
 * Timer that keeps its pace while the page is hidden [ID: LIB-STEADY-TICKER]
 *
 * Browsers pause `requestAnimationFrame` and slow page timers to about one tick per second in a
 * background tab or behind another app. A worker's timer is not slowed, so the ticks come from a
 * tiny worker; where workers are unavailable a page timer is used.
 */
const WORKER_SOURCE =
  'let t=null;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}';

/** Calls `onTick` about every `intervalMs` until the returned function is called. */
export function startSteadyTicker(intervalMs: number, onTick: () => void): () => void {
  let worker: Worker | null = null;
  let workerUrl: string | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const startPageTimer = () => {
    if (timer === null) timer = setInterval(onTick, intervalMs);
  };
  const dropWorker = () => {
    worker?.terminate();
    worker = null;
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  };

  try {
    workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    worker = new Worker(workerUrl);
    worker.onmessage = () => onTick();
    worker.onerror = () => {
      dropWorker();
      startPageTimer();
    };
    worker.postMessage(intervalMs);
  } catch {
    dropWorker();
    startPageTimer();
  }

  return () => {
    dropWorker();
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
}
