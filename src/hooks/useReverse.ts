import { useState, useEffect } from 'react';

export function useReverse() {
  const [reverse, setReverse] = useState<boolean>(() => {
    return localStorage.getItem('clm-reverse') === '1';
  });

  useEffect(() => {
    localStorage.setItem('clm-reverse', reverse ? '1' : '0');
  }, [reverse]);

  return {
    reverse,
    toggle: () => setReverse((r) => !r),
  };
}
