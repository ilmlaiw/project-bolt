import { useEffect, useState } from 'react';

interface GaugeProps {
  real: number;
  ai: number;
  verdict: 'real' | 'ai-generated' | 'uncertain';
  confidence: number;
}

export function AuthenticityGauge({ real, ai, verdict, confidence }: GaugeProps) {
  const [displayReal, setDisplayReal] = useState(0);
  const [displayAi, setDisplayAi] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDisplayReal(real);
      setDisplayAi(ai);
    }, 80);
    return () => clearTimeout(t);
  }, [real, ai]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const realArc = (displayReal / 100) * circumference;
  const aiArc = (displayAi / 100) * circumference;

  const verdictLabel =
    verdict === 'real' ? 'Likely Authentic' : verdict === 'ai-generated' ? 'Likely AI-Generated' : 'Uncertain';
  const verdictColor =
    verdict === 'real' ? 'text-real-400' : verdict === 'ai-generated' ? 'text-fake-400' : 'text-warn-400';

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[200px] w-[200px]">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${realArc} ${circumference}`}
            style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)' }}
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${aiArc} ${circumference}`}
            strokeDashoffset={-realArc}
            style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)', transitionDelay: '0.15s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-3xl font-bold ${verdictColor}`}>{displayReal.toFixed(0)}%</span>
          <span className="mt-1 text-xs uppercase tracking-widest text-ink-400">Real</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <Legend color="bg-real-500" label="Real" value={displayReal} />
        <Legend color="bg-fake-500" label="AI" value={displayAi} />
      </div>

      <div className="mt-4 text-center">
        <p className={`font-display text-lg font-semibold ${verdictColor}`}>{verdictLabel}</p>
        <p className="mt-1 text-xs text-ink-400">
          Model confidence: <span className="font-mono text-ink-200">{confidence.toFixed(0)}%</span>
        </p>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm text-ink-300">{label}</span>
      <span className="font-mono text-sm text-ink-100">{value.toFixed(0)}%</span>
    </div>
  );
}
