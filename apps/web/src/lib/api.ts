import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from '@vibe-store/shared';

export type {
  AnalyzeRequest,
  AnalyzeResponse,
  BusinessCategory,
  Verdict,
} from '@vibe-store/shared';

interface ApiErrorShape {
  message?: string;
  errorCode?: string;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

const ANALYZE_URL = API_URL.endsWith('/api')
  ? `${API_URL}/analyze`
  : `${API_URL}/api/analyze`;

const API_ORIGIN = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

export function buildReportUrl(reportPath: string): string {
  if (/^https?:\/\//i.test(reportPath)) {
    return reportPath;
  }

  return `${API_ORIGIN}${reportPath.startsWith('/') ? reportPath : `/${reportPath}`}`;
}

export async function runAnalysis(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await safeFetch(ANALYZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await resolveApiError(response, 'Analysis request failed'));
  }

  return response.json() as Promise<AnalyzeResponse>;
}

async function resolveApiError(response: Response, fallback: string): Promise<string> {
  let message = `${fallback} with status ${response.status}`;

  try {
    const body = (await response.json()) as ApiErrorShape;
    if (body.message) {
      message = body.message;
    }
  } catch {
    // ignore parse errors and keep fallback message
  }

  return message;
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      'No se pudo conectar con la API. Verifica que backend esté corriendo y NEXT_PUBLIC_API_URL sea correcto.',
    );
  }
}
