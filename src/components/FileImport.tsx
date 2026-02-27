import { useRef, useState } from 'react';
import { importMultipleFiles } from '../utils/import-export';

export function FileImport({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStatus('Importing...');
    const result = await importMultipleFiles(files);
    const msgs: string[] = [];
    if (result.imported > 0) msgs.push(`${result.imported} list(s) imported`);
    if (result.errors.length > 0)
      msgs.push(`${result.errors.length} error(s): ${result.errors.join(', ')}`);
    setStatus(msgs.join('. '));
    onDone();
  };

  const handleFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      fileRef.current?.click();
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle = await (window as any).showDirectoryPicker();
      const files: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          files.push(await entry.getFile());
        }
      }
      if (files.length === 0) {
        setStatus('No .json files found in folder');
        return;
      }
      await handleFiles(files as unknown as FileList);
    } catch {
      // User cancelled
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
        Import
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-cn-border bg-cn-surface px-4 py-2.5 text-sm font-medium text-cn-ink transition-colors hover:border-cn-gold/50 dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          Import File(s)
        </button>
        <button
          onClick={handleFolder}
          className="flex items-center gap-2 rounded-xl border border-cn-border bg-cn-surface px-4 py-2.5 text-sm font-medium text-cn-ink transition-colors hover:border-cn-gold/50 dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
          </svg>
          Import Folder
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".json"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {status && (
        <p className="text-sm text-cn-gold-dark dark:text-cn-gold-light">{status}</p>
      )}
    </div>
  );
}
