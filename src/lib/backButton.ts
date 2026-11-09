/**
 * Android back button (Capacitor) interceptors. A screen registers a handler while it is mounted;
 * the app-level listener in `App.tsx` asks the newest one first and only falls back to its default
 * (navigate back / exit) when none of them handled the press. Dialogs are closed before this runs.
 */
type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/** Registers `handler`; return `true` from it when the press was handled. Returns the unregister function. */
export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.lastIndexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** Runs the handlers, newest first. `true` when one of them handled the press. */
export function runBackHandlers(): boolean {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return true;
  }
  return false;
}
