import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type NavigationEntry = { label: { ar: string; en: string }; href?: string; children?: NavigationEntry[] };
const snapshot: Record<"ar" | "en", NavigationEntry[]> = JSON.parse(readFileSync(new URL("../../lib/platform-navigation-fallback.json", import.meta.url), "utf8"));

const MAIN_SITE = "https://syrianrenewables.com";

// Isolate external provider boundaries. No emails are submitted by this suite.
test.beforeEach(async ({ page }) => {
  await page.route(`${MAIN_SITE}/api/account/session`, route => route.fulfill({ headers: { "Access-Control-Allow-Origin": route.request().headers().origin || "http://127.0.0.1:3000", "Access-Control-Allow-Credentials": "true" }, json: { authenticated: false } }));
  await page.route(`${MAIN_SITE}/english-contact-popup.js`, route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("https://syrian-renewables.kit.com/9aa680b026/index.js", route => route.fulfill({ contentType: "application/javascript", body: `
    document.currentScript?.parentElement?.insertAdjacentHTML('beforeend', '<form data-sv-form="9aa680b026" class="formkit-form"><div data-element="fields"><div class="formkit-field"><input name="email_address" class="formkit-input" required type="text"></div><button type="submit" data-element="submit"><span>Subscribe</span></button></div><a data-element="powered-by">Built with Kit</a></form>');
  ` }));
});

function monitorBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test("desktop shell, navigation, locale and theme controls", async ({ page }, testInfo) => {
  const browserErrors = monitorBrowserErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  await expect(page.locator(".sr-platform-header")).toBeVisible();
  await expect(page.getByRole("heading", { name: "مناقصات الطاقة" })).toBeVisible();
  await expect(page.getByAltText("Syrian Renewables — بوابة الطاقة المتجددة في سورية").first()).toHaveAttribute(
    "src",
    "/syrian-renewables-logo.svg",
  );

  const arabicNavigation = page.getByRole("navigation", { name: "التنقل الرئيسي" });
  await expect(arabicNavigation.getByRole("link", { name: "أخبار الطاقة في سورية" })).toHaveAttribute("href", `${MAIN_SITE}/ar/news`);

  const services = arabicNavigation.getByRole("button", { name: "خدماتنا" });
  const tenderLink = arabicNavigation.getByRole("link", { name: "متتبع مناقصات الطاقة" });
  await expect(tenderLink).not.toBeVisible();
  await services.click();
  await expect(tenderLink).toBeVisible();
  await expect(tenderLink).toHaveAttribute("href", "https://tender.syrianrenewables.com/");
  await expect(arabicNavigation.getByRole("link", { name: "سوق الطاقة" })).toHaveAttribute("href", "https://market.syrianrenewables.com");
  await expect(arabicNavigation.getByRole("link", { name: "اتفاقيات وعقود الطاقة" })).toHaveAttribute("href", "https://contracts.syrianrenewables.com");
  await page.screenshot({ path: testInfo.outputPath("desktop-services-ar.png"), fullPage: true });

  await page.keyboard.press("Escape");
  await expect(tenderLink).not.toBeVisible();
  await services.click();
  await page.locator("main").click({ position: { x: 10, y: 10 } });
  await expect(tenderLink).not.toBeVisible();

  const usefulTools = arabicNavigation.getByRole("button", { name: "أدوات مفيدة" });
  await usefulTools.click();
  await expect(arabicNavigation.getByRole("link", { name: "حاسبة الطاقة الشمسية" })).toHaveAttribute("href", "https://solarist.syrianrenewables.com/");
  await page.keyboard.press("Escape");

  const footerLogoBox = await page.locator(".sr-platform-footer-logo").boundingBox();
  expect(footerLogoBox).not.toBeNull();
  expect(footerLogoBox?.width ?? 999).toBeLessThanOrEqual(120);
  expect(footerLogoBox?.height ?? 999).toBeLessThanOrEqual(150);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", /light|dark/);
  const themeBefore = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: "تبديل الوضع اللوني" }).click();
  await expect.poll(() => html.getAttribute("data-theme")).not.toBe(themeBefore);

  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(html).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Energy Tenders" })).toBeVisible();

  const englishNavigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(englishNavigation.getByRole("link", { name: "Syria Energy News" })).toHaveAttribute("href", `${MAIN_SITE}/en/news`);
  await expect(page.getByText("Norway organization no. 920833128")).toBeVisible();
  expect(browserErrors, "desktop flow should not emit browser console/page errors").toEqual([]);
});

test("locale entry routes resolve without a 404 and persist the requested language", async ({ page }) => {
  const browserErrors = monitorBrowserErrors(page);
  await page.goto("/en");
  await expect(page).toHaveURL(/\/\?lang=en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Energy Tenders" })).toBeVisible();

  await page.goto("/ar");
  await expect(page).toHaveURL(/\/\?lang=ar$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "مناقصات الطاقة" })).toBeVisible();
  expect(browserErrors, "locale entry flows should not emit browser console/page errors").toEqual([]);
});

test("tablet shell remains usable and overflow-free", async ({ page }, testInfo) => {
  const browserErrors = monitorBrowserErrors(page);
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "مناقصات الطاقة" })).toBeVisible();
  const menuButton = page.getByRole("button", { name: "فتح القائمة" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const navigation = page.getByRole("navigation", { name: "التنقل الرئيسي" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("button", { name: "أدوات مفيدة" }).click();
  await expect(navigation.getByRole("link", { name: "حاسبة الطاقة الشمسية" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tablet-navigation-ar.png"), fullPage: true });

  await page.keyboard.press("Escape");
  await expect(page.locator("#sr-primary-navigation")).not.toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(browserErrors, "tablet flow should not emit browser console/page errors").toEqual([]);
});

test("mobile menu and filters remain responsive, dismissible and overflow-free", async ({ page }, testInfo) => {
  const browserErrors = monitorBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "فتح القائمة" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const navigation = page.getByRole("navigation", { name: "التنقل الرئيسي" });
  const services = navigation.getByRole("button", { name: "خدماتنا" });
  await expect(services).toBeVisible();
  await services.click();
  const tenderLink = navigation.getByRole("link", { name: "متتبع مناقصات الطاقة" });
  await expect(tenderLink).toBeVisible();
  await expect(tenderLink).toHaveAttribute("href", "https://tender.syrianrenewables.com/");
  await page.screenshot({ path: testInfo.outputPath("mobile-services-ar.png"), fullPage: true });

  await page.keyboard.press("Escape");
  await expect(page.locator("#sr-primary-navigation")).not.toBeVisible();

  await page.getByRole("button", { name: "فلاتر البحث" }).click();
  await expect(page.getByRole("complementary", { name: "فلاتر البحث" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "فلاتر البحث" })).not.toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(browserErrors, "mobile flow should not emit browser console/page errors").toEqual([]);
});

for (const locale of ["ar", "en"] as const) {
  test(`${locale}: every canonical navigation destination, order and same-tab behavior matches`, async ({ page }) => {
    await page.goto(`/?lang=${locale}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const expected = snapshot[locale].flatMap(item => item.href ? [item] : (item.children || []))
      .map(item => ({
        text: item.label[locale],
        href: /^https?:\/\//i.test(item.href!) ? item.href : `${MAIN_SITE}/${locale}${item.href === "/" ? "" : item.href!.replace(/^\/(ar|en)(?=\/|$)/, "")}`,
        target: null,
      }));
    const actual = await page.locator("#sr-primary-navigation a").evaluateAll(links => links.map(link => ({
      text: link.textContent?.trim(), href: link.getAttribute("href"), target: link.getAttribute("target"),
    })));
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(45);
    await expect(page.locator(".sr-platform-footer-links a")).toHaveCount(4);
    await expect(page.locator(".sr-platform-socials a svg path")).toHaveCount(7);
    await expect(page.locator(".sr-platform-footer-links").getByRole("link", { name: locale === "ar" ? "سياسة استخدام البيانات" : "Data Use Policy" })).toHaveAttribute("href", `${MAIN_SITE}/${locale}/data-use-policy`);
  });

  test(`${locale}: embedded newsletter and guest account preserve provider validation and return location`, async ({ page }) => {
    await page.goto(`/?lang=${locale}&view=map#filters`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const newsletter = page.getByRole("form", { name: locale === "ar" ? "نموذج الاشتراك في النشرة البريدية" : "Newsletter subscription form" });
    await expect(newsletter).toBeVisible();
    const email = newsletter.getByRole("textbox", { name: locale === "ar" ? "بريدك الإلكتروني" : "Email address" });
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("dir", "ltr");
    await expect(email).toHaveAttribute("required", "");
    await expect(newsletter.getByRole("button", { name: locale === "ar" ? "اشترك" : "Subscribe", exact: true })).toBeVisible();
    const account = page.locator(".sr-platform-account");
    await expect(account).toContainText(locale === "ar" ? "دخول" : "Sign in");
    const href = new URL((await account.getAttribute("href"))!);
    expect(href.pathname).toBe(`/${locale}/account/login`);
    const returnTo = new URL(href.searchParams.get("returnTo")!);
    expect(returnTo.hostname).toBe("tender.syrianrenewables.com");
    expect(returnTo.searchParams.get("lang")).toBe(locale);
    expect(returnTo.searchParams.get("view")).toBe("map");
    expect(returnTo.hash).toBe("#filters");
    // Intentionally do not submit the provider form.
  });
}

test("signed-in account displays the central member name and Free badge", async ({ page }) => {
  await page.route(`${MAIN_SITE}/api/account/session`, route => route.fulfill({
    headers: { "Access-Control-Allow-Origin": route.request().headers().origin || "http://127.0.0.1:3000", "Access-Control-Allow-Credentials": "true" },
    json: { authenticated: true, displayName: "Test member", plan: "free" },
  }));
  await page.goto("/");
  const account = page.getByRole("link", { name: "فتح حسابي" });
  await expect(account).toContainText("Test member");
  await expect(account).toContainText("Free");
  await expect(account).toHaveAttribute("href", `${MAIN_SITE}/ar/account`);
});

test("newsletter provider failure exposes the canonical subscription fallback", async ({ page }) => {
  await page.route("https://syrian-renewables.kit.com/9aa680b026/index.js", route => route.fulfill({ status: 503, body: "" }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "فتح صفحة الاشتراك" })).toHaveAttribute("href", "https://syrian-renewables.kit.com/newsletterlandpage");
});

test("unconfigured admin stays gated and account return location follows client navigation", async ({ page }) => {
  test.skip(Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY), "This guard covers the configuration-free CI build.");
  const browserErrors = monitorBrowserErrors(page);
  await page.goto("/admin?lang=en&view=map#filters");
  await expect(page.getByRole("heading", { name: "تسجيل دخول لوحة الإدارة" })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveText("لم يتم ضبط إعدادات Firebase بعد.");
  await expect(page.locator("main textarea")).toHaveCount(0);
  const account = page.locator(".sr-platform-account");
  const returnLocation = async () => new URL(new URL((await account.getAttribute("href"))!).searchParams.get("returnTo")!);
  await expect.poll(async () => (await returnLocation()).pathname).toBe("/admin");
  await expect.poll(async () => (await returnLocation()).searchParams.get("view")).toBe("map");
  expect((await returnLocation()).hash).toBe("#filters");
  await page.getByRole("link", { name: "العودة إلى الصفحة العامة" }).click();
  await expect.poll(async () => (await returnLocation()).pathname).toBe("/");
  expect(browserErrors).toEqual([]);
});

test("compact desktop and small mobile retain canonical geometry and accessible menus", async ({ page }, testInfo) => {
  for (const width of [1024, 390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    if (width < 980) {
      await page.getByRole("button", { name: "فتح القائمة" }).click();
      await page.getByRole("button", { name: "أدوات مفيدة", exact: true }).click();
      await expect(page.locator("#sr-primary-navigation").getByRole("link", { name: "مختبر الطاقة", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#sr-primary-navigation")).not.toBeVisible();
    }
    const logo = await page.locator(".sr-platform-footer-logo").boundingBox();
    expect(logo?.width).toBe(width < 650 ? 88 : 96);
    const control = await page.locator(".sr-platform-language").boundingBox();
    expect(control?.width).toBe(width === 1024 ? 34 : 39);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`shell-${width}.png`), fullPage: true });
  }
});

for (const entry of ["/?lang=ar", "/"]) {
test(`language links remain shareable and browser back restores the previous language from ${entry}`, async ({ page }) => {
  await page.goto(entry);
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});
}
