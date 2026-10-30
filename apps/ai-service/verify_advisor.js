const path = require('path');
const fs = require('fs');

const WORKSPACE_DIR = 'c:\\Users\\rayew\\Desktop\\Major project';
const puppeteerPath = require.resolve('puppeteer-core', { paths: [WORKSPACE_DIR] });
const puppeteer = require(puppeteerPath);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR =
  'C:\\Users\\rayew\\.gemini\\antigravity\\brain\\2cd5811c-401d-48ba-bb3e-5c2fd4f8b620';

async function main() {
  console.log('Launching Chrome for Car Advisor verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 950 },
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // 1. Navigate to Buyer Web homepage
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Click the Hinglish Preset Question (12 lakh diesel SUV Baramati)
    console.log('Clicking preset Hinglish question button...');
    const presetBtn = await page.waitForSelector('[data-testid="preset-query-0"]', {
      timeout: 10000,
    });
    await presetBtn.click();
    console.log('Clicked! Waiting for cited advisor response...');

    // 3. Wait for response to appear with citation
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('nexon') && text.includes('verified sources');
      },
      { timeout: 15000 },
    );
    console.log('Cited answer received on homepage!');

    // 4. Scroll chat container to bottom so response and citations are fully visible
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="advisor-chat-modal"] .overflow-y-auto');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await new Promise((r) => setTimeout(r, 600));

    // Click the last citations accordion header
    const citationHeaders = await page.$$('[data-testid="citations-container"] > div > div');
    if (citationHeaders.length > 0) {
      await citationHeaders[citationHeaders.length - 1].click();
      await new Promise((r) => setTimeout(r, 600));
    }

    // Scroll to bottom again after expanding citation
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="advisor-chat-modal"] .overflow-y-auto');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await new Promise((r) => setTimeout(r, 600));

    // 5. Capture screenshot of Hinglish chat on homepage
    const screenshotPath = path.join(ARTIFACT_DIR, 'car_advisor_hinglish_chat.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // 6. Also take screenshot of dedicated /advisor page
    console.log('Navigating to http://localhost:3000/advisor...');
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000/advisor', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Click preset query on advisor page too
    const presetBtn2 = await page2.waitForSelector('[data-testid="preset-query-0"]', {
      timeout: 10000,
    });
    await presetBtn2.click();
    await page2.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('nexon') && text.includes('verified sources');
      },
      { timeout: 15000 },
    );
    await new Promise((r) => setTimeout(r, 800));

    // Scroll and expand citation on page2 as well
    await page2.evaluate(() => {
      const el = document.querySelector('[data-testid="advisor-chat-modal"] .overflow-y-auto');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await new Promise((r) => setTimeout(r, 600));

    const citationHeaders2 = await page2.$$('[data-testid="citations-container"] > div > div');
    if (citationHeaders2.length > 0) {
      await citationHeaders2[citationHeaders2.length - 1].click();
      await new Promise((r) => setTimeout(r, 600));
    }

    await page2.evaluate(() => {
      const el = document.querySelector('[data-testid="advisor-chat-modal"] .overflow-y-auto');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await new Promise((r) => setTimeout(r, 600));

    const screenshotPath2 = path.join(ARTIFACT_DIR, 'car_advisor_dedicated_page.png');
    await page2.screenshot({ path: screenshotPath2 });
    console.log(`Saved screenshot: ${screenshotPath2}`);

    console.log('All verification screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
