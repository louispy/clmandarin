import { useState } from 'react';

export interface VisibilityState {
  hanzi: boolean;
  pinyin: boolean;
  english: boolean;
}

export function useVisibility() {
  const [visibility, setVisibility] = useState<VisibilityState>({
    hanzi: true,
    pinyin: true,
    english: true,
  });

  const toggle = (field: keyof VisibilityState) => {
    setVisibility((v) => ({ ...v, [field]: !v[field] }));
  };

  return { visibility, toggle };
}
