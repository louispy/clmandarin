import { detectPlatform, type Platform } from '../utils/speech';

const INSTRUCTIONS: Record<Platform, { title: string; steps: string[] }> = {
  macos: {
    title: 'macOS — Add a Chinese voice',
    steps: [
      'Open System Settings → Accessibility → Spoken Content',
      'Click the "System Voice" dropdown → Manage Voices',
      'Find "Chinese (China mainland)" and download Ting-Ting',
    ],
  },
  ios: {
    title: 'iOS — Add a Chinese voice',
    steps: [
      'Open Settings → Accessibility → Spoken Content → Voices',
      'Tap "Chinese", then download Ting-Ting',
    ],
  },
  windows: {
    title: 'Windows — Install Chinese language',
    steps: [
      'Open Settings → Time & Language → Language & Region',
      'Click "Add a language" → choose Chinese (China)',
      'In language options, ensure "Text-to-speech" is installed',
    ],
  },
  android: {
    title: 'Android — Download Chinese TTS',
    steps: [
      'Open Settings → System → Languages & input → Text-to-speech output',
      'Pick Google TTS, tap the gear icon → Install voice data → Chinese',
    ],
  },
  linux: {
    title: 'Linux — Install a Chinese TTS engine',
    steps: [
      'Install a TTS engine with Chinese support (e.g. piper-tts or espeak-ng)',
      'Make sure your browser exposes it via the Web Speech API',
    ],
  },
  unknown: {
    title: 'Add a Chinese voice to your system',
    steps: [
      'Open your OS settings and add a Chinese language pack or TTS voice',
      'Make sure text-to-speech is enabled for Chinese',
    ],
  },
};

export function NoAudioModal({ onClose }: { onClose: () => void }) {
  const info = INSTRUCTIONS[detectPlatform()];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-cn-border bg-cn-surface p-6 shadow-2xl dark:border-cn-border-dark dark:bg-cn-surface-dark"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">
            No Chinese voice found
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm text-cn-muted dark:text-cn-muted-dark">
          Your device doesn't have a Chinese text-to-speech voice installed. Here's how to add one:
        </p>

        <div className="mt-4 rounded-xl bg-cn-paper p-4 dark:bg-cn-paper-dark">
          <p className="text-sm font-bold text-cn-ink dark:text-cn-cream">{info.title}</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-cn-muted dark:text-cn-muted-dark">
            {info.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-cn-red px-4 py-2.5 font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
