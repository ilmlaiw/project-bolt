import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { AnomalyFinding, MetadataFinding, AnalysisResult } from '@/lib/gemini';
import { AuthenticityGauge } from '@/components/AuthenticityGauge';

const severityStyles: Record<AnomalyFinding['severity'], { ring: string; text: string; bar: string }> = {
  low: { ring: 'ring-real-500/30', text: 'text-real-400', bar: 'bg-real-500' },
  medium: { ring: 'ring-warn-500/30', text: 'text-warn-400', bar: 'bg-warn-500' },
  high: { ring: 'ring-fake-500/30', text: 'text-fake-400', bar: 'bg-fake-500' },
};

export function AnomalyList({ anomalies }: { anomalies: AnomalyFinding[] }) {
  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-ink-400">
        <CheckCircle2 className="h-8 w-8 text-real-400" />
        <p className="text-sm">No significant anomalies detected.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {anomalies.map((a, i) => {
        const s = severityStyles[a.severity];
        return (
          <li
            key={a.id}
            className="rounded-xl bg-ink-900/50 p-4 ring-1 ring-ink-800 animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 ring-1 ${s.ring}`}>
                  <AlertTriangle className={`h-4 w-4 ${s.text}`} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-100">{a.label}</p>
                  <p className="text-xs text-ink-500">{a.category}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.text} bg-ink-800`}>
                {a.severity}
              </span>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-400">{a.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className={`h-full rounded-full ${s.bar}`}
                  style={{ width: `${a.confidence}%`, transition: 'width 0.9s ease' }}
                />
              </div>
              <span className="font-mono text-xs text-ink-400">{a.confidence}%</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const metaStyles: Record<MetadataFinding['status'], { icon: typeof Info; text: string; ring: string }> = {
  clean: { icon: CheckCircle2, text: 'text-real-400', ring: 'ring-real-500/20' },
  suspicious: { icon: AlertTriangle, text: 'text-warn-400', ring: 'ring-warn-500/20' },
  missing: { icon: XCircle, text: 'text-ink-500', ring: 'ring-ink-700' },
  info: { icon: Info, text: 'text-accent-400', ring: 'ring-accent-500/20' },
};

export function MetadataPanel({ metadata }: { metadata: MetadataFinding[] }) {
  if (metadata.length === 0) {
    return <p className="py-6 text-sm text-ink-400">No metadata findings available.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {metadata.map((m, i) => {
        const s = metaStyles[m.status];
        const Icon = s.icon;
        return (
          <li
            key={`${m.label}-${i}`}
            className="flex items-start gap-3 rounded-xl bg-ink-900/50 p-3.5 ring-1 ring-ink-800 animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-800 ring-1 ${s.ring}`}>
              <Icon className={`h-3.5 w-3.5 ${s.text}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-ink-100">{m.label}</p>
                <span className={`shrink-0 font-mono text-xs ${s.text}`}>{m.value}</span>
              </div>
              {m.detail && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{m.detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SummaryCard({ summary }: { summary: string }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-4">
      <p className="text-sm leading-relaxed text-ink-200">{summary}</p>
    </div>
  );
}

export function ResultsDashboard({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="flex flex-col gap-5 rounded-2xl border border-ink-800 bg-ink-950/60 p-6 shadow-card animate-slide-up">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-400">
            Authenticity Score
          </h3>
        </div>
        <AuthenticityGauge
          real={result.realProbability}
          ai={result.aiProbability}
          verdict={result.verdict}
          confidence={result.confidence}
        />
        <div className="mt-1">
          <SummaryCard summary={result.summary} />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="rounded-2xl border border-ink-800 bg-ink-950/60 p-6 shadow-card animate-slide-up" style={{ animationDelay: '80ms' }}>
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-ink-400">
            Anomaly Breakdown
          </h3>
          <AnomalyList anomalies={result.anomalies} />
        </div>
        <div className="rounded-2xl border border-ink-800 bg-ink-950/60 p-6 shadow-card animate-slide-up" style={{ animationDelay: '160ms' }}>
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-ink-400">
            Metadata Findings
          </h3>
          <MetadataPanel metadata={result.metadata} />
        </div>
      </section>
    </div>
  );
}
