import { useNavigate, useLocation } from 'react-router-dom';

/** Click handler for the header's home / back button. */
export function useHomeNavigation(
  homeAction: (() => void) | null | undefined,
  isSettingsPage: boolean,
) {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (homeAction) {
      homeAction();
    } else if (isSettingsPage) {
      const game = new URLSearchParams(location.search).get('game');
      const state = location.state as { from?: unknown } | null;
      const from = state?.from;

      if (from && typeof from === 'string' && !from.startsWith('/settings')) {
        navigate(from);
      } else if (game) {
        navigate(`/games/${game}`);
      } else {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };
}
