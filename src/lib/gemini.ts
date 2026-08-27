export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyFinding {
  id: string;
  category: string;
  label: string;
  description: string;
  severity: AnomalySeverity;
  confidence: number;
}

export interface MetadataFinding {
  label: string;
  value: string;
  status: 'clean' | 'suspicious' | 'missing' | 'info';
  detail?: string;
}

export interface AnalysisResult {
  verdict: 'real' | 'ai-generated' | 'uncertain';
  realProbability: number;
  aiProbability: number;
  confidence: number;
  summary: string;
  anomalies: AnomalyFinding[];
  metadata: MetadataFinding[];
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent';

const ANALYSIS_PROMPT = `You are TrueLens, an expert forensic image analyst specializing in detecting AI-generated images. Analyze the provided image and determine whether it is AI-generated or an authentic photograph.

Respond ONLY with a valid JSON object (no markdown, no code fences) matching this exact TypeScript type:

{
  "verdict": "real" | "ai-generated" | "uncertain",
  "realProbability": number,      // 0-100, probability image is authentic
  "aiProbability": number,        // 0-100, probability image is AI-generated
  "confidence": number,           // 0-100, your overall confidence in the verdict
  "summary": string,              // 1-2 sentence plain-language summary
  "anomalies": [
    {
      "id": string,               // short kebab-case id, e.g. "lighting-mismatch"
      "category": string,         // one of: Lighting | Texture | Geometry | Color | Artifacts | Composition | Metadata
      "label": string,            // short human label
      "description": string,      // one sentence explanation
      "severity": "low" | "medium" | "high",
      "confidence": number        // 0-100
    }
  ],
  "metadata": [
    {
      "label": string,
      "value": string,
      "status": "clean" | "suspicious" | "missing" | "info",
      "detail": string
    }
  ]
}

Guidelines:
- realProbability + aiProbability should sum to ~100.
- Look for: unnatural lighting/shadows, inconsistent geometry, warped text/faces/hands, repetitive textures, color grading artifacts, impossible physics, banding, noise patterns.
- In the metadata array, assess likely source signals (e.g. "EXIF data", "Generator signature", "Noise profile", "Compression artifacts", "Color space") — use status "missing" when you cannot determine it from the image alone.
- If the image is clearly authentic, still return 2-4 minor anomalies with low severity, and set metadata status to "clean" where appropriate.
- Keep all strings concise. Return at most 7 anomalies and 6 metadata entries.`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

function coerceResult(raw: unknown): AnalysisResult {
  const r = (raw ?? {}) as Partial<AnalysisResult> & Record<string, unknown>;
  const real = clamp(Number(r.realProbability ?? 0));
  let ai = clamp(Number(r.aiProbability ?? 0));
  if (real + ai === 0) {
    ai = 100 - real;
  } else if (Math.abs(real + ai - 100) > 5) {
    ai = 100 - real;
  }
  const verdict: AnalysisResult['verdict'] =
    r.verdict === 'real' || r.verdict === 'ai-generated' || r.verdict === 'uncertain'
      ? r.verdict
      : real >= ai
        ? 'real'
        : 'ai-generated';

  const anomalies = Array.isArray(r.anomalies)
    ? (r.anomalies as unknown[]).slice(0, 7).map((a, i) => {
        const an = (a ?? {}) as Record<string, unknown>;
        return {
          id: String(an.id ?? `finding-${i + 1}`),
          category: String(an.category ?? 'Artifacts'),
          label: String(an.label ?? 'Unnamed finding'),
          description: String(an.description ?? ''),
          severity:
            an.severity === 'high' || an.severity === 'medium' || an.severity === 'low'
              ? an.severity
              : 'medium',
          confidence: clamp(Number(an.confidence ?? 50)),
        } satisfies AnomalyFinding;
      })
    : [];

  const metadata = Array.isArray(r.metadata)
    ? (r.metadata as unknown[]).slice(0, 6).map((m) => {
        const md = (m ?? {}) as Record<string, unknown>;
        return {
          label: String(md.label ?? 'Unknown'),
          value: String(md.value ?? '—'),
          status:
            md.status === 'clean' ||
            md.status === 'suspicious' ||
            md.status === 'missing' ||
            md.status === 'info'
              ? md.status
              : 'info',
          detail: md.detail ? String(md.detail) : undefined,
        } satisfies MetadataFinding;
      })
    : [];

  return {
    verdict,
    realProbability: real,
    aiProbability: ai,
    confidence: clamp(Number(r.confidence ?? 50)),
    summary: String(r.summary ?? 'No summary available.'),
    anomalies,
    metadata,
  };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export class GeminiError extends Error {
  constructor(message: string, public readonly kind: 'auth' | 'network' | 'parse' | 'unknown') {
    super(message);
    this.name = 'GeminiError';
  }
}

async function readErrorBody(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (data as any)?.error?.message ?? (data as any)?.message;
    return msg ? String(msg) : null;
  } catch {
    return null;
  }
}

export async function analyzeImageWithGemini(
  file: File,
  apiKey: string,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  if (!apiKey.trim()) {
    throw new GeminiError('Missing Google AI API key. Add one in Settings.', 'auth');
  }

  const base64 = await fileToBase64(file);

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: file.type || 'image/jpeg',
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new GeminiError('Network request failed. Check your connection.', 'network');
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    const detail = await readErrorBody(response);
    throw new GeminiError(
      detail
        ? `Invalid or unauthorized API key. Verify it in Settings. (${detail})`
        : 'Invalid or unauthorized API key. Verify it in Settings.',
      'auth',
    );
  }
  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new GeminiError(
      detail
        ? `Google AI request failed (HTTP ${response.status}): ${detail}`
        : `Google AI request failed (HTTP ${response.status}).`,
      'unknown',
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GeminiError('Could not parse the response from Google AI.', 'parse');
  }

  const text =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((payload as any)?.candidates?.[0]?.content?.parts ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p?.text ?? '')
      .join('') || '';

  if (!text) {
    throw new GeminiError('Google AI returned an empty analysis.', 'parse');
  }

  try {
    const parsed = JSON.parse(extractJson(text));
    return coerceResult(parsed);
  } catch {
    throw new GeminiError('Google AI returned malformed analysis data.', 'parse');
  }
}
