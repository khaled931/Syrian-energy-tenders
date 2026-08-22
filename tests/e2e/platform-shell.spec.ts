import { expect, test } from "@playwright/test";

const MAIN_SITE = "https://syrianrenewables.com";

test("desktop shell, navigation, locale and theme controls", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  await expect(page.locator(".sr-platform-header")).toBeVisible();
  await expect(page.getByRole("heading", { name: "مناقصات الطاقة" })).toBeVisible();
  await expect(page.getByAltText("Syrian Renewables — بوابة الطاقة المتجددة في سورية").first()).toHaveAttribute(
    "src",
    `${MAIN_SITE}/brand/syrian-renewables-logo-fixed.svg`,
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

  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(html).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Energy Tenders" })).toBeVisible();

  const englishNavigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(englishNavigation.getByRole("link", { name: "Syria Energy News" })).toHaveAttribute("href", `${MAIN_SITE}/en/news`);
  await expect(page.getByText("Norway organization no. 920833128")).toBeVisible();
});

test("locale entry routes resolve without a 404 and persist the requested language", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Energy Tenders" })).toBeVisible();

  await page.goto("/ar");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "مناقصات الطاقة" })).toBeVisible();
});

test("mobile menu and filters remain responsive, dismissible and overflow-free", async ({ page }, testInfo) => {
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
});
