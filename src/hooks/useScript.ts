import { useState, useEffect } from 'react';

export type Script = 'cn' | 'tw';

export function useScript() {
  const [script, setScript] = useState<Script>(() => {
    const stored = localStorage.getItem('clm-script');
    return stored === 'tw' ? 'tw' : 'cn';
  });

  useEffect(() => {
    localStorage.setItem('clm-script', script);
  }, [script]);

  return {
    script,
    toggle: () => setScript((s) => (s === 'cn' ? 'tw' : 'cn')),
  };
}

export function displayHanzi(word: { hanzi: string; traditional?: string }, script: Script): string {
  if (script === 'tw' && word.traditional) return word.traditional;
  return word.hanzi;
}
