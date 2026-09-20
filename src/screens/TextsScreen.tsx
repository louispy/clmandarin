import type { useTexts } from '../hooks/useTexts';
import { TextManager } from '../components/TextManager';
import { TextReader } from '../components/TextReader';
import { isSharingConfigured } from '../utils/share';

export function TextsScreen({
  texts,
  showPinyin,
  onTogglePinyin,
  showTranslation,
  onToggleTranslation,
  onImportFromCode,
  onHome,
}: {
  texts: ReturnType<typeof useTexts>;
  // Reader toggles are owned by App, not this screen: the screen unmounts on
  // every tab switch, and resetting the reader each time the user glances at
  // Cards would be a regression.
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  onImportFromCode: (code: string) => void;
  onHome: () => void;
}) {
  const { activeText } = texts;

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={onHome}
        className="flex w-fit items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-bold text-cn-red transition-colors hover:bg-cn-red/10 dark:text-cn-red-light"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z" clipRule="evenodd" />
        </svg>
        Home
      </button>
      <TextManager
        texts={texts.texts}
        activeTextId={texts.activeTextId}
        onSelect={texts.setActiveTextId}
        onCreate={texts.createText}
        onUpdate={texts.updateText}
        onDelete={texts.deleteText}
        onImportFromCode={isSharingConfigured() ? onImportFromCode : undefined}
      />

      {!activeText ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cn-border px-6 py-16 text-center dark:border-cn-border-dark sm:py-24">
          <span className="text-4xl">&#25991;</span>
          <p className="font-bold text-cn-ink dark:text-cn-cream">No text selected</p>
          <p className="max-w-sm text-sm text-cn-muted dark:text-cn-muted-dark">
            Tap + above to paste your own Chinese text. Pinyin is generated automatically, and you can add your own translations sentence by sentence.
          </p>
        </div>
      ) : (
        <>
          {/* Reader toggles — mirror the flashcard show/hide controls */}
          <div className="flex items-center gap-2 px-0.5">
            <button
              onClick={onTogglePinyin}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                showPinyin
                  ? 'bg-cn-red/10 text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light'
                  : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
              }`}
            >
              {showPinyin ? 'Pinyin on' : 'Pinyin off'}
            </button>
            <button
              onClick={onToggleTranslation}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                showTranslation
                  ? 'bg-cn-red/10 text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light'
                  : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
              }`}
            >
              {showTranslation ? 'Translation on' : 'Translation off'}
            </button>
          </div>

          <TextReader
            key={activeText.id}
            text={activeText}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onChangeTranslation={(idx, value) =>
              texts.setTranslation(activeText.id, idx, value)
            }
          />
        </>
      )}
    </div>
  );
}
