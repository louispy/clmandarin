import { useEffect, useRef, useState } from 'react';
import { canShareImage, shareImage } from '../utils/share-image';

/**
 * Shares a generated image to the OS share sheet (Instagram Stories included),
 * or downloads it where that isn't supported.
 *
 * The blob is rendered as soon as the button mounts. Safari rejects
 * navigator.share() when the call drifts too far from the user's gesture, so
 * awaiting canvas encoding inside the click handler would break sharing on the
 * one platform that matters most here.
 */
export function ShareStoryButton({
  render,
  filename,
  title,
  label = 'Share',
  className,
}: {
  render: () => Promise<Blob>;
  filename: string;
  title: string;
  label?: string;
  className?: string;
}) {
  const blobRef = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    blobRef.current = null;
    setReady(false);
    render()
      .then((blob) => {
        if (cancelled) return;
        blobRef.current = blob;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setNote('Could not build the image on this device.');
      });
    return () => {
      cancelled = true;
    };
  }, [render]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  const handleClick = async () => {
    const blob = blobRef.current;
    if (!blob || busy) return;
    setBusy(true);
    try {
      const outcome = await shareImage(blob, filename, title);
      if (outcome === 'downloaded') setNote('Saved as an image.');
    } catch {
      setNote('Sharing failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!ready || busy}
        className={
          className ??
          'flex items-center gap-1.5 rounded-xl border border-cn-border px-2.5 py-1 text-xs font-bold text-cn-muted transition-colors hover:border-cn-red hover:text-cn-red disabled:opacity-40 dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-red-light'
        }
        title={canShareImage() ? 'Share as an image' : 'Save as an image'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.475l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
        </svg>
        {label}
      </button>
      {note && (
        <span className="text-[11px] text-cn-muted dark:text-cn-muted-dark">{note}</span>
      )}
    </>
  );
}
