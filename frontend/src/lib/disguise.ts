const STORAGE_KEY = 'as.disguise';
const REAL_TITLE = 'Alerta Segura';
const FAKE_TITLE = 'Receitas & Dicas';
const REAL_FAVICON = '/favicon.svg';
const FAKE_FAVICON = '/disguise-favicon.svg';

export function isDisguiseEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDisguiseEnabled(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  applyDisguise(enabled);
}

export function applyDisguise(enabled = isDisguiseEnabled()) {
  document.title = enabled ? FAKE_TITLE : REAL_TITLE;
  const link =
    (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ??
    document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = enabled ? FAKE_FAVICON : REAL_FAVICON;
  if (!link.parentNode) document.head.appendChild(link);
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', enabled ? '#4a7c59' : '#525871');
}

export const DISGUISE_PIN = '2580';
