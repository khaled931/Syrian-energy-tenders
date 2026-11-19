const { test } = require("node:test");
const assert = require("node:assert/strict");
const { URL } = require("node:url");
const { loadTs } = require("./load-ts.cjs");
const snapshot = require("../../lib/platform-navigation-fallback.json");
const { parsePlatformNavigation, platformNavigationByLocale, resolvePlatformHref, resolveTenderReturnUrl } = loadTs("lib/platform.ts");

test("login return URLs follow the current route and reject stale route context", () => {
  assert.equal(resolveTenderReturnUrl("/", "/admin?lang=en&view=map#filters", "en"), "https://tender.syrianrenewables.com/?lang=en");
  assert.equal(resolveTenderReturnUrl("/admin", "/admin?lang=en&view=map#filters", "ar"), "https://tender.syrianrenewables.com/admin?lang=ar&view=map#filters");
  assert.equal(resolveTenderReturnUrl("/tenders/7", "/", "ar"), "https://tender.syrianrenewables.com/tenders/7?lang=ar");
  assert.equal(new URL(resolveTenderReturnUrl("//example.org/path", "//example.org/path", "ar")).origin, "https://tender.syrianrenewables.com");
});

const required = ["electric-vehicles", "energy-advisor", "damascus-bourse-news", "electricity-meter-reading", "un-data-portal", "electricity-bill-calculator", "resources-map", "oil-gas-map", "renewable-energy-sale-guide", "pvgis", "fuel-95-stations", "energy-lab", "energy-survey", "in-the-media"];

test("both official snapshots contain all fourteen restored links and forty-five destinations", () => {
  for (const locale of ["ar", "en"]) {
    const links = platformNavigationByLocale[locale].flatMap(item => item.href ? [item] : item.children);
    assert.equal(links.length, 45);
    for (const key of required) assert.ok(links.some(item => item.key === key), `${locale}: missing ${key}`);
    assert.equal(links.find(item => item.key === "ev-map").href, "/ev-chargers");
    assert.equal(links.find(item => item.key === "about-us").href, "/about");
    assert.equal(links.find(item => item.key === "ninja-simulator").href, "https://ninja.syrianrenewables.com/");
  }
});

test("central navigation rejects unsafe, duplicated and malformed links", () => {
  for (const href of ["javascript:alert(1)", "//example.org/path", "https://user:password@example.org/"]) {
    assert.throws(() => parsePlatformNavigation({ items: [{ _key: "bad", label: { ar: "اختبار", en: "Test" }, href }] }));
  }
  assert.throws(() => parsePlatformNavigation({ items: [] }));
  assert.throws(() => parsePlatformNavigation({ items: [snapshot.ar[0], snapshot.ar[0]] }));
  assert.equal(resolvePlatformHref("/en/resources-map", "ar"), "https://syrianrenewables.com/ar/resources-map");
});

test("central navigation uses the requested locale, cache and bounded request", async () => {
  delete process.env.PLATFORM_NAVIGATION_USE_SNAPSHOT;
  const { getPlatformNavigation } = loadTs("lib/platformNavigation.ts", { "server-only": {} });
  let called;
  const result = await getPlatformNavigation("en", async (url, options) => {
    called = { url, options }; return { ok: true, json: async () => ({ items: snapshot.en }) };
  });
  assert.match(called.url, /locale=en$/);
  assert.equal(called.options.next.revalidate, 300);
  assert.ok(called.options.signal);
  assert.deepEqual(result, platformNavigationByLocale.en);
});

test("central outages, non-OK responses and malformed JSON keep a complete usable navigation", async () => {
  const { getPlatformNavigation } = loadTs("lib/platformNavigation.ts", { "server-only": {} });
  for (const request of [async () => { throw new Error("offline"); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ items: [] }) })]) {
    assert.deepEqual(await getPlatformNavigation("ar", request), platformNavigationByLocale.ar);
  }
});

test("header/footer render canonical same-tab navigation, real SVG icons and policy links", () => {
  const React = require("react"); const { renderToString } = require("react-dom/server");
  const { PlatformHeader, PlatformFooter } = loadTs("components/PlatformShell.tsx");
  const header = renderToString(React.createElement(PlatformHeader, { locale: "ar", setLocale: () => {}, navigation: platformNavigationByLocale.ar }));
  const footer = renderToString(React.createElement(PlatformFooter, { locale: "ar" }));
  assert.equal((header.match(/class="sr-platform-nav-link/g) || []).length, 50); // 45 links + 5 group buttons
  assert.doesNotMatch(header, /target="_blank"/);
  assert.match(header, /تسجيل الدخول أو إنشاء حساب مجاني/);
  assert.match(footer, /\/ar\/data-use-policy/);
  assert.equal((footer.match(/title="(?:LinkedIn|Facebook|X|Instagram|YouTube|TikTok|WhatsApp)"/g) || []).length, 7);
  assert.match(footer, /sr-newsletter-form/);
});
