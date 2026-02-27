import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('clm-dark-mode');
    if (stored !== null) return stored === 'true';
    return false; // default to light theme
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('clm-dark-mode', String(dark));
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
