import { chromium, type Page } from "playwright";

/**
 * Responsive audit.
 *
 * Section 6 of the spec is unambiguous: "Everything must work at 390px wide."
 * That cannot be typechecked and it cannot be eyeballed reliably, so this walks
 * every public route at three widths in a real browser and fails on:
 *
 *   - horizontal overflow (the page scrolls sideways)
 *   - any element wider than the viewport
 *   - interactive targets under 44px on touch
 *   - console errors
 *
 * Usage: pnpm check:responsive   (needs the app running on PORT)
 */

const BASE = process.env.RESPONSIVE_BASE ?? "http://localhost:3319";

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "desktop", width: 1440, height: 900, touch: false },
];

const ROUTES = [
  "/",
  "/kitchen-sink",
  "/arena",
  "/atlas",
  "/tech",
  "/events",
  "/fairplay",
  "/guild",
  "/signin",
];

type Finding = { route: string; viewport: string; kind: string; detail: string };

async function auditPage(page: Page, width: number): Promise<Omit<Finding, "route" | "viewport">[]> {
  return page.evaluate((viewportWidth) => {
    const found: { kind: string; detail: string }[] = [];

    // 1. Does the document scroll sideways at all?
    const docWidth = document.documentElement.scrollWidth;
    if (docWidth > viewportWidth + 1) {
      found.push({
        kind: "horizontal-overflow",
        detail: `document scrollWidth ${docWidth} exceeds viewport ${viewportWidth}`,
      });
    }

    // 2. Which elements stick out? Skip anything inside a deliberate
    //    horizontal scroller, since those are allowed to be wider.
    const offenders = new Set<string>();
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position === "fixed") continue;

      let inScroller = false;
      let parent = element.parentElement;
      while (parent) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.overflowX === "auto" || parentStyle.overflowX === "scroll") {
          inScroller = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (inScroller) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0) continue;

      // A few px of slack for subpixel rounding and decorative glows.
      if (rect.right > viewportWidth + 2 || rect.left < -2) {
        const id = `${element.tagName.toLowerCase()}${element.className ? "." + String(element.className).split(/\s+/).slice(0, 2).join(".") : ""}`;
        offenders.add(`${id} (${Math.round(rect.left)}..${Math.round(rect.right)})`);
      }
    }
    for (const offender of Array.from(offenders).slice(0, 5)) {
      found.push({ kind: "element-overflow", detail: offender });
    }

    return found;
  }, width);
}

async function auditTouchTargets(page: Page): Promise<{ kind: string; detail: string }[]> {
  return page.evaluate(() => {
    const small: string[] = [];
    const selector = "a[href], button, input, select, textarea, [role='button']";

    for (const element of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Inline links inside a paragraph are text, not targets.
      const isInlineLink =
        element.tagName === "A" &&
        (style.display === "inline" || element.closest("p,li,pre,code") !== null);
      if (isInlineLink) continue;

      if (rect.height < 44 - 0.5) {
        const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 24) ?? "";
        small.push(`${element.tagName.toLowerCase()} "${label}" is ${Math.round(rect.height)}px tall`);
      }
    }

    return Array.from(new Set(small)).slice(0, 6).map((detail) => ({ kind: "touch-target", detail }));
  });
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const findings: Finding[] = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
      deviceScaleFactor: 2,
    });

    for (const route of ROUTES) {
      const page = await context.newPage();
      const consoleErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 140));
      });
      page.on("pageerror", (error) => consoleErrors.push(String(error).slice(0, 140)));

      try {
        const response = await page.goto(`${BASE}${route}`, {
          waitUntil: "networkidle",
          timeout: 30_000,
        });

        if (!response || response.status() >= 400) {
          findings.push({
            route,
            viewport: viewport.name,
            kind: "status",
            detail: `HTTP ${response?.status() ?? "none"}`,
          });
        }

        for (const finding of await auditPage(page, viewport.width)) {
          findings.push({ route, viewport: viewport.name, ...finding });
        }

        if (viewport.touch) {
          for (const finding of await auditTouchTargets(page)) {
            findings.push({ route, viewport: viewport.name, ...finding });
          }
        }

        for (const error of consoleErrors) {
          findings.push({ route, viewport: viewport.name, kind: "console-error", detail: error });
        }
      } catch (error) {
        findings.push({
          route,
          viewport: viewport.name,
          kind: "navigation",
          detail: String(error).slice(0, 160),
        });
      }

      await page.close();
    }

    await context.close();
    console.log(`  checked ${ROUTES.length} routes at ${viewport.width}px`);
  }

  await browser.close();

  if (findings.length === 0) {
    console.log(`\nNo responsive issues across ${ROUTES.length} routes x ${VIEWPORTS.length} widths.`);
    return;
  }

  console.error(`\n${findings.length} finding(s):\n`);
  for (const finding of findings) {
    console.error(`  [${finding.viewport}] ${finding.route}`);
    console.error(`      ${finding.kind}: ${finding.detail}`);
  }
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
