import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { UploadCloud, ImageIcon, X } from 'lucide-react';

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_MB = 20;

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) {
      return 'Unsupported format. Use PNG, JPG, WebP, or GIF.';
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return `Image exceeds ${MAX_MB}MB limit.`;
    }
    return null;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile, validate],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          'group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300',
          dragging
            ? 'border-accent-400 bg-accent-500/10 shadow-glow scale-[1.01]'
            : 'border-ink-700 bg-ink-900/40 hover:border-ink-500 hover:bg-ink-900/70',
          disabled ? 'pointer-events-none opacity-50' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="pointer-events-none mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 text-accent-400 ring-1 ring-ink-700 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          <UploadCloud className="h-7 w-7" strokeWidth={1.75} />
        </div>

        <p className="font-display text-lg font-semibold text-ink-100">
          {dragging ? 'Drop image to analyze' : 'Drag & drop an image'}
        </p>
        <p className="mt-1.5 text-sm text-ink-400">
          or <span className="text-accent-400 underline-offset-4 group-hover:underline">browse files</span>
          {' '}· PNG, JPG, WebP, GIF · max {MAX_MB}MB
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-fake-500/10 px-3 py-2 text-sm text-fake-400 animate-fade-in">
            <X className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

interface PreviewProps {
  file: File;
  onClear: () => void;
}

export function ImagePreview({ file, onClear }: PreviewProps) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/60 shadow-card animate-scale-in">
      <img src={url} alt={file.name} className="max-h-[320px] w-full object-contain bg-ink-950" />
      <button
        onClick={onClear}
        aria-label="Remove image"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/80 text-ink-200 ring-1 ring-ink-700 backdrop-blur transition hover:bg-fake-500/80 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 border-t border-ink-800 px-4 py-2.5 text-xs text-ink-400">
        <ImageIcon className="h-3.5 w-3.5 text-accent-400" />
        <span className="truncate font-mono">{file.name}</span>
        <span className="ml-auto shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
      </div>
    </div>
  );
}
