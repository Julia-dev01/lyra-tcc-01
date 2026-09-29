const NEUTRAL_URL = 'https://www.climatempo.com.br/';

function wipeMemory() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

export async function performQuickExit() {
  wipeMemory();
  const csrf = document.cookie.match(/(?:^|;\s*)as_csrf=([^;]+)/)?.[1];
  const headers: Record<string, string> = csrf
    ? { 'x-csrf-token': decodeURIComponent(csrf) }
    : {};
  try {
    await Promise.race([
      Promise.allSettled([
        fetch('/api/auth/quick-exit', { method: 'POST', credentials: 'include', headers }),
        fetch('/api/admin/auth/quick-exit', { method: 'POST', credentials: 'include', headers }),
      ]),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);
  } catch {
    /* ignore */
  }
  wipeMemory();
  window.location.replace(NEUTRAL_URL);
}

export function installEscQuickExit() {
  let last = 0;
  const handler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const now = Date.now();
    if (now - last < 900) {
      void performQuickExit();
    }
    last = now;
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
