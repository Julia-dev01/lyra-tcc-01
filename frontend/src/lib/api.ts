export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'error', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function csrfFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)as_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrf() {
  if (!csrfFromCookie()) {
    await fetch('/api/health', { credentials: 'include' });
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { retry?: boolean } = {},
): Promise<T> {
  await ensureCsrf();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const csrf = csrfFromCookie();
  if (csrf) headers.set('x-csrf-token', csrf);

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && options.retry !== false && !path.includes('/auth/')) {
    const refreshPath = path.startsWith('/api/admin')
      ? '/api/admin/auth/refresh'
      : '/api/auth/refresh';
    const refreshed = await fetch(refreshPath, {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { 'x-csrf-token': csrf } : undefined,
    });
    if (refreshed.ok) {
      return api<T>(path, { ...options, retry: false });
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const payload = (data ?? {}) as { message?: string; error?: string; details?: unknown };
    throw new ApiError(
      res.status,
      payload.message || 'Não foi possível concluir esta ação agora.',
      payload.error || 'error',
      payload.details,
    );
  }

  return data as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
export const put = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });

export function download(path: string, filename: string) {
  return fetch(path, { credentials: 'include' }).then(async (res) => {
    if (!res.ok) throw new ApiError(res.status, 'Não foi possível baixar o arquivo.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}
