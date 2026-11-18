// Keep Kit's subscription handling, confirmation flow and spam protection intact.
export function mountKitNewsletter(host: HTMLDivElement, { locale, onStateChange }: { locale: "ar" | "en"; onStateChange: (state: "loading" | "ready" | "error") => void }) {
  let cancelled = false;
  let timeout: number | undefined;
  let state: 'loading' | 'ready' | 'error' = 'loading';
  const setState = (next: typeof state) => {
    if (!cancelled && state !== next) {
      state = next;
      onStateChange(next);
    }
  };
  const localize = () => {
    if (cancelled) return;
    const form = host.querySelector<HTMLFormElement>('form');
    // Kit currently emits type="text" for email_address.
    const input = host.querySelector<HTMLInputElement>('input[name="email_address"], input[type="email"]');
    const submit = host.querySelector('[data-element="submit"] span');
    if (!form || !input || !submit) return;
    const emailLabel = locale === 'ar' ? 'بريدك الإلكتروني' : 'Email address';
    const buttonLabel = locale === 'ar' ? 'اشترك' : 'Subscribe';
    form.dir = locale === 'ar' ? 'rtl' : 'ltr';
    form.lang = locale;
    form.setAttribute('aria-label', locale === 'ar' ? 'نموذج الاشتراك في النشرة البريدية' : 'Newsletter subscription form');
    input.type = 'email';
    input.autocomplete = 'email';
    input.inputMode = 'email';
    input.dir = 'ltr';
    input.placeholder = emailLabel;
    input.setAttribute('aria-label', emailLabel);
    if (submit.textContent !== buttonLabel) submit.textContent = buttonLabel;
    // Preserve required provider attribution, using its high-contrast variant.
    host.querySelector('[data-element="powered-by"]')?.setAttribute('data-variant', 'light');
    host.querySelectorAll('[data-group="alert"]').forEach((alert) => {
      alert.setAttribute('role', 'status');
      alert.setAttribute('aria-live', 'polite');
    });
    window.clearTimeout(timeout);
    setState('ready');
  };

  host.replaceChildren();
  const observer = new MutationObserver(localize);
  observer.observe(host, { childList: true, subtree: true });
  const script = document.createElement('script');
  script.async = true;
  script.dataset.uid = '9aa680b026';
  script.src = 'https://syrian-renewables.kit.com/9aa680b026/index.js';
  script.onload = localize;
  script.onerror = () => setState('error');
  timeout = window.setTimeout(() => setState('error'), 12000);
  host.appendChild(script);

  return () => {
    cancelled = true;
    window.clearTimeout(timeout);
    observer.disconnect();
    script.onload = null;
    script.onerror = null;
    host.replaceChildren();
  };
}

