import { useState, useCallback } from 'react';

// Top-level destinations. A discriminated union rather than a bare string so
// later phases can hang params off a tab (a built-in deck level, a quiz phase)
// without every caller having to change shape.
export type Route =
  | { tab: 'browse' }
  | { tab: 'cards' }
  | { tab: 'texts' };

export type Tab = Route['tab'];

export function useRoute(initial: Route = { tab: 'browse' }) {
  const [route, setRoute] = useState<Route>(initial);

  // Every tab reuses the same scroll container, so the previous view's scroll
  // position leaks through. Force the top after the new view mounts.
  const navigate = useCallback((next: Route) => {
    setRoute(next);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, []);

  return { route, navigate };
}
