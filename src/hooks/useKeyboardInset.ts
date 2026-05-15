import { useEffect, useState } from 'react';

// Returns the number of pixels the on-screen keyboard (or any other UI) is
// covering at the bottom of the layout viewport. 0 when no keyboard is up or
// when the visualViewport API isn't available. Use as bottom padding on a
// fixed `inset-0` modal container so its content stays above the keyboard.
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const next = window.innerHeight - vv.height - vv.offsetTop;
      setInset(next > 0 ? next : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
