import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, Shield, ShieldCheck, X } from 'lucide-react';
import { getApiKey, setApiKey } from '@/lib/apiKeyStore';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (key: string) => void;
}

export function SettingsModal({ open, onClose, onSaved }: SettingsModalProps) {
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(getApiKey());
      setSaved(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    setApiKey(value);
    setSaved(true);
    onSaved?.(value.trim());
    setTimeout(onClose, 700);
  };

  const handleClear = () => {
    setApiKey('');
    setValue('');
    setSaved(false);
    onSaved?.('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-card animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30">
              <KeyRound className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 id="settings-title" className="font-display text-base font-semibold text-ink-100">
                Settings
              </h2>
              <p className="text-xs text-ink-500">Google AI API key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-950/60 p-3.5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-real-400" />
            <p className="text-xs leading-relaxed text-ink-400">
              Your API key is stored <span className="text-ink-200">only in this browser</span> via local
              storage. It is sent directly to Google's API and never touches any other server.
            </p>
          </div>

          <div>
            <label htmlFor="api-key" className="mb-1.5 block text-xs font-medium text-ink-300">
              Google AI API Key
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                id="api-key"
                ref={inputRef}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSaved(false);
                }}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-ink-700 bg-ink-950 py-2.5 pl-10 pr-10 font-mono text-sm text-ink-100 outline-none transition placeholder:text-ink-600 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Hide key' : 'Show key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-500 transition hover:bg-ink-800 hover:text-ink-200"
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Get a key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent-400 underline-offset-2 hover:underline"
              >
                Google AI Studio
              </a>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink-800 px-5 py-4">
          <button
            onClick={handleClear}
            className="text-xs font-medium text-ink-500 transition hover:text-fake-400"
          >
            Clear key
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-300 transition hover:bg-ink-800 hover:text-ink-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!value.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saved ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Saved
                </>
              ) : (
                'Save key'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
