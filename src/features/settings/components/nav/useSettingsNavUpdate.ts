import { useSearchParams } from 'react-router-dom';

/** Returns a function that writes tab / sub / section into the URL and notifies Melodiq. */
export function useSettingsNavUpdate() {
  const [searchParams, setSearchParams] = useSearchParams();

  return (tab: string, sub?: string, section?: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (sub) next.set('sub', sub);
    else next.delete('sub');
    if (section) next.set('section', section);
    else next.delete('section');
    setSearchParams(next, { replace: true });
    window.dispatchEvent(new CustomEvent('melodiq_subtab_change', { detail: sub || 'all' }));
  };
}
