import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('Launching Chrome for 360px mobile viewport verification...');

  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const artifactDir = 'C:\\Users\\rayew\\.gemini\\antigravity\\brain\\2cd5811c-401d-48ba-bb3e-5c2fd4f8b620';
  const artifactScreenshot = path.join(artifactDir, 'design_mobile_360px.png');
  const localScreenshot = path.join(process.cwd(), 'design_mobile_360px.png');

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    // 360px width viewport (standard compact mobile, e.g. Samsung Galaxy S8/S9/A-series)
    await page.setViewport({
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    console.log('Navigating to http://localhost:3000/design...');
    await page.goto('http://localhost:3000/design', { waitUntil: 'networkidle0', timeout: 30000 });

    // Ensure the main header and components are rendered
    await page.waitForSelector('header', { timeout: 5000 });
    console.log('Design system page loaded successfully on 360px viewport!');

    // Inject axe-core script into browser to perform real in-browser accessibility audit
    const axePath = path.resolve('node_modules/axe-core/axe.min.js');
    if (fs.existsSync(axePath)) {
      const axeSource = fs.readFileSync(axePath, 'utf8');
      await page.evaluate(axeSource);

      const results = await page.evaluate(async () => {
        // @ts-ignore
        return await window.axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
          },
        });
      });

      console.log(`In-browser Axe Audit: ${results.violations.length} violations found.`);
      if (results.violations.length > 0) {
        console.warn('Axe violations:', JSON.stringify(results.violations, null, 2));
      } else {
        console.log('SUCCESS: In-browser page passed all WCAG 2.2 AA Axe accessibility checks with 0 violations!');
      }
    }

    // Capture full-page screenshot of the 360px mobile view
    await page.screenshot({ path: localScreenshot, fullPage: true });
    await page.screenshot({ path: artifactScreenshot, fullPage: true });
    console.log(`Saved screenshot to: ${localScreenshot}`);
    console.log(`Saved screenshot to artifact: ${artifactScreenshot}`);

  } catch (err) {
    console.error('Error during browser verification:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
