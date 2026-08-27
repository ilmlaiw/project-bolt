import { useCallback, useRef, useState } from 'react';
import { AlertCircle, KeyRound, ScanEye, Settings, Sparkles, Trash2 } from 'lucide-react';
import { Dropzone, ImagePreview } from '@/components/Dropzone';
import { AnalyzingState } from '@/components/AnalyzingState';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { SettingsModal } from '@/components/SettingsModal';
import { analyzeImageWithGemini, GeminiError, type AnalysisResult } from '@/lib/gemini';
import { getApiKey, hasApiKey } from '@/lib/apiKeyStore';

type Status = 'idle' | 'analyzing' | 'done' | 'error';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyPresent, setKeyPresent] = useState(hasApiKey());
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(async (target: File) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('analyzing');
    setError(null);
    setResult(null);
    try {
      const res = await analyzeImageWithGemini(target, apiKey, controller.signal);
      setResult(res);
      setStatus('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message =
        err instanceof GeminiError
          ? err.message
          : 'Something went wrong while analyzing the image.';
      setError(message);
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      setStatus('idle');
      setResult(null);
      setError(null);
      void runAnalysis(f);
    },
    [runAnalysis],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const onSettingsSaved = useCallback((key: string) => {
    setKeyPresent(key.length > 0);
    if (key.length > 0 && file && status !== 'analyzing') {
      void runAnalysis(file);
    }
  }, [file, status, runAnalysis]);

  return (
    <div className="app-bg min-h-screen text-ink-100">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        keyConfigured={keyPresent}
      />

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-6">
        <Hero />

        <section className="mt-10">
          {status === 'analyzing' && file ? (
            <AnalyzingState fileName={file.name} />
          ) : status === 'done' && result ? (
            <ResultsDashboard result={result} />
          ) : (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <Dropzone onFile={handleFile} disabled={status === 'analyzing'} />
              </div>
              <div className="flex flex-col gap-4">
                {file ? (
                  <ImagePreview file={file} onClear={reset} />
                ) : (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-ink-800 bg-ink-900/30 px-6 text-center">
                    <ScanEye className="mb-3 h-8 w-8 text-ink-600" />
                    <p className="text-sm text-ink-500">
                      Your image preview and analysis results will appear here.
                    </p>
                  </div>
                )}

                {status === 'error' && (
                  <div className="flex items-start gap-3 rounded-xl border border-fake-500/30 bg-fake-500/10 p-4 animate-fade-in">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-fake-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-fake-400">Analysis failed</p>
                      <p className="mt-0.5 text-sm text-ink-400">{error}</p>
                    </div>
                    <button
                      onClick={() => file && void runAnalysis(file)}
                      className="rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-200 transition hover:bg-ink-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!keyPresent && status !== 'analyzing' && (
                  <div className="flex items-start gap-3 rounded-xl border border-warn-500/30 bg-warn-500/10 p-4 animate-fade-in">
                    <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-warn-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warn-400">API key required</p>
                      <p className="mt-0.5 text-sm text-ink-400">
                        Add your Google AI API key in Settings to start analyzing images.
                      </p>
                    </div>
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="rounded-lg bg-warn-500/20 px-3 py-1.5 text-xs font-medium text-warn-400 transition hover:bg-warn-500/30"
                    >
                      Add key
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {status === 'done' && result && file && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 px-5 py-2.5 text-sm font-medium text-ink-200 transition hover:border-accent-500 hover:text-accent-400"
            >
              <Trash2 className="h-4 w-4" />
              Analyze another image
            </button>
          </div>
        )}

        <FeatureStrip />
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={onSettingsSaved}
      />
    </div>
  );
}

function Header({ onOpenSettings, keyConfigured }: { onOpenSettings: () => void; keyConfigured: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30">
            <ScanEye className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-base font-bold tracking-tight text-ink-50">
              True<span className="text-accent-400">Lens</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500">AI Image Authenticity</p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 px-3.5 py-2 text-sm font-medium text-ink-200 transition hover:border-ink-600 hover:text-ink-50"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
          <span
            className={[
              'h-1.5 w-1.5 rounded-full',
              keyConfigured ? 'bg-real-500' : 'bg-warn-500',
            ].join(' ')}
            title={keyConfigured ? 'API key set' : 'API key missing'}
          />
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="text-center animate-fade-in">
      <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 px-3.5 py-1.5 text-xs text-ink-400">
        <Sparkles className="h-3.5 w-3.5 text-accent-400" />
        Powered by Google Gemini Vision
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
        See past the synthetic.
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-400 sm:text-base">
        Drop in any image and TrueLens inspects lighting, texture, geometry, and metadata to tell you
        whether it's authentic or AI-generated — with a transparent breakdown of what it found.
      </p>
    </div>
  );
}

function FeatureStrip() {
  const features = [
    { label: 'Lighting & shadows', desc: 'Detects inconsistent light sources' },
    { label: 'Texture analysis', desc: 'Spots repetitive or synthetic patterns' },
    { label: 'Geometry checks', desc: 'Flags warped faces, hands, and text' },
    { label: 'Metadata signals', desc: 'Reviews EXIF and generator traces' },
  ];
  return (
    <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {features.map((f) => (
        <div
          key={f.label}
          className="rounded-xl border border-ink-800 bg-ink-900/40 p-4 transition hover:border-ink-700"
        >
          <p className="text-sm font-semibold text-ink-100">{f.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
