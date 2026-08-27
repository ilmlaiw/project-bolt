import { useEffect, useState } from 'react';
import { Loader2, ScanLine } from 'lucide-react';

export function AnalyzingState({ fileName }: { fileName: string }) {
  const [phase, setPhase] = useState(0);
  const phases = [
    'Decoding pixels…',
    'Inspecting lighting & shadows…',
    'Analyzing texture patterns…',
    'Checking geometry & artifacts…',
    'Cross-referencing metadata…',
    'Finalizing verdict…',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % phases.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [phases.length]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-800 bg-ink-950/60 px-6 py-16 text-center shadow-card">
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-accent-500/20 animate-pulse-ring" />
        <span className="absolute inset-0 rounded-full bg-accent-500/20 animate-pulse-ring" style={{ animationDelay: '0.6s' }} />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 ring-1 ring-accent-500/40">
          <Loader2 className="h-7 w-7 animate-spin text-accent-400" />
        </div>
      </div>

      <div className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-ink-100">
        <ScanLine className="h-5 w-5 text-accent-400" />
        Analyzing image
      </div>
      <p className="mb-6 max-w-xs truncate font-mono text-xs text-ink-500">{fileName}</p>

      <div className="h-1.5 w-64 overflow-hidden rounded-full bg-ink-800">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-accent-500 to-accent-300 shimmer" />
      </div>
      <p className="mt-4 h-5 text-sm text-ink-400 transition-all animate-fade-in" key={phase}>
        {phases[phase]}
      </p>
    </div>
  );
}
