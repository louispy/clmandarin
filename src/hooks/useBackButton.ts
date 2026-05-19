import { useEffect, useRef } from 'react';

// Shared overlay stack so the topmost overlay claims the back button and inner
// UI-dismissals (e.g. closing NoAudioModal while FlashcardViewer is still open)
// don't accidentally pop the outer layer.
type Closer = () => void;
const stack: Closer[] = [];
let installed = false;
let swallow = 0;

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('popstate', () => {
    if (swallow > 0) {
      swallow--;
      return;
    }
    const top = stack.pop();
    if (top) top();
  });
}

/**
 * Intercepts the system back button (Android, PWA, browser) while the calling
 * component is mounted. Pushes one synthetic history entry on mount and calls
 * `onClose` when the user pops it. UI-driven dismiss paths just unmount the
 * component normally — the hook pops the synthetic entry from history for them.
 */
export function useBackButton(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    install();
    const closer: Closer = () => onCloseRef.current();
    stack.push(closer);
    window.history.pushState({ overlay: true }, '');

    return () => {
      const idx = stack.indexOf(closer);
      if (idx === -1) return; // popstate already removed us
      stack.splice(idx, 1);
      swallow++;
      window.history.back();
    };
  }, []);
}
