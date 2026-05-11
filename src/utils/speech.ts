let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    const existing = speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    const fallback = setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
    speechSynthesis.onvoiceschanged = () => {
      clearTimeout(fallback);
      resolve(speechSynthesis.getVoices());
    };
  });
  return voicesPromise;
};

export const findZhVoice = async (): Promise<SpeechSynthesisVoice | null> => {
  const voices = await loadVoices();
  return (
    voices.find((v) => v.lang === 'zh-CN' && v.localService) ||
    voices.find((v) => v.lang.startsWith('zh') && v.localService) ||
    voices.find((v) => v.lang === 'zh-CN') ||
    voices.find((v) => v.lang.startsWith('zh')) ||
    null
  );
};

export const speak = async (text: string, rate = 0.5): Promise<boolean> => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const voice = await findZhVoice();
  if (!voice) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  speechSynthesis.speak(u);
  return true;
};

export type Platform = 'macos' | 'ios' | 'windows' | 'android' | 'linux' | 'unknown';

export const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(ua)) return 'macos';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux|X11/.test(ua)) return 'linux';
  return 'unknown';
};
