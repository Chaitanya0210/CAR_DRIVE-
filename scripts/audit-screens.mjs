import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const chromePath = isWindows ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined;
const axePath = 'C:\\Users\\rayew\\Desktop\\Major project\\node_modules\\.pnpm\\axe-core@4.14.0\\node_modules\\axe-core\\axe.min.js';
const axeSource = fs.readFileSync(axePath, 'utf8');

const ARTIFACT_DIR = 'C:\\Users\\rayew\\.gemini\\antigravity\\brain\\2cd5811c-401d-48ba-bb3e-5c2fd4f8b620';

const SCREENS = [
  { name: 'buyer_home', url: 'http://localhost:3000/' },
  { name: 'buyer_design', url: 'http://localhost:3000/design' },
  { name: 'buyer_advisor', url: 'http://localhost:3000/advisor' },
  { name: 'seller_dashboard', url: 'http://localhost:3001/' },
  { name: 'admin_dashboard', url: 'http://localhost:3002/' },
];

const BREAKPOINTS = [
  { name: 'mobile_360', width: 360, height: 740 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'desktop_1280', width: 1280, height: 800 },
];

async function main() {
  console.log('🚀 Starting Baseline Visual & Accessibility Audit across 360px, 768px, 1280px...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const auditResults = [];

  for (const screen of SCREENS) {
    for (const bp of BREAKPOINTS) {
      const page = await browser.newPage({
        viewport: { width: bp.width, height: bp.height },
      });

      console.log(`Checking ${screen.name} at ${bp.name} (${bp.width}x${bp.height})...`);
      try {
        await page.goto(screen.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (e) {
        console.warn(`Timeout/network error on ${screen.url}`);
      }

      await page.waitForTimeout(1000);

      // If buyer_home, capture onboarding tour screenshot & dismiss
      if (screen.name === 'buyer_home') {
        let tourModal = page.locator('[role="dialog"][aria-modal="true"]');
        // If not open yet, click How It Works
        if (!(await tourModal.isVisible())) {
          const howItWorks = page.getByText(/How It Works/i).first();
          if (await howItWorks.isVisible()) {
            await howItWorks.click();
            await page.waitForTimeout(400);
          }
        }

        if (await tourModal.isVisible()) {
          const tourScreenshot = `polished_buyer_onboarding_tour_${bp.name}.png`;
          await page.screenshot({ path: path.join(ARTIFACT_DIR, tourScreenshot), fullPage: false });
          // Press Escape to dismiss dialog cleanly
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
        }
      }

      // Check horizontal overflow (horizontal scrollbar bug on mobile/tablet)
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          hasOverflow: docWidth > winWidth,
          docWidth,
          winWidth,
          delta: docWidth - winWidth,
        };
      });

      // Inject and run axe-core
      await page.evaluate(axeSource);
      const axeResult = await page.evaluate(async () => {
        // @ts-ignore
        return await axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
          },
        });
      });

      const violations = axeResult.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodesCount: v.nodes.length,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary,
        })),
        helpUrl: v.helpUrl,
      }));

      const screenshotName = `polished_${screen.name}_${bp.name}.png`;
      const screenshotPath = path.join(ARTIFACT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      auditResults.push({
        screen: screen.name,
        breakpoint: bp.name,
        width: bp.width,
        overflow,
        violationsCount: violations.length,
        criticalCount: violations.filter((v) => v.impact === 'critical').length,
        seriousCount: violations.filter((v) => v.impact === 'serious').length,
        violations,
        screenshot: screenshotName,
      });

      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'polished_audit.json'),
    JSON.stringify(auditResults, null, 2),
  );

  console.log('✅ Polished Audit complete! Results saved to polished_audit.json');
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
