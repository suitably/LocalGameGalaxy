import { useEffect } from 'react';

/** Scrolls to and focuses `settings-section-<id>` once the section has rendered. */
export function useSettingsHighlight(id: string | undefined, deps: readonly unknown[] = []): void {
  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`settings-section-${id}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);
}
