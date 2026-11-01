import { chromium } from '@playwright/test';

interface PageAuditResult {
  url: string;
  portal: string;
  statusCode: number;
  consoleErrors: string[];
  pageErrors: string[];
  status: 'PASS' | 'FAIL';
}

const routesToAudit = [
  // Buyer Portal (Port 3000)
  { portal: 'Buyer Web', url: 'http://localhost:3000/' },
  { portal: 'Buyer Web', url: 'http://localhost:3000/advisor' },
  { portal: 'Buyer Web', url: 'http://localhost:3000/demo' },
  { portal: 'Buyer Web', url: 'http://localhost:3000/design' },

  // Seller Portal (Port 3001)
  { portal: 'Seller Web', url: 'http://localhost:3001/' },

  // Admin Console (Port 3002)
  { portal: 'Admin Web', url: 'http://localhost:3002/' },
];

async function runBrowserAudit() {
  console.log('=============================================================================');
  console.log('🌐 GroupDrive Browser Console & Route Error Audit');
  console.log('=============================================================================\n');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const results: PageAuditResult[] = [];

  for (const item of routesToAudit) {
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
      }
    });

    page.on('requestfailed', (req) => {
      console.log(`     [FAILED REQ] ${req.url()} (${req.failure()?.errorText})`);
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        console.log(`     [${res.status()}] ${res.request().method()} ${res.url()}`);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    let statusCode = 0;
    try {
      const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      statusCode = response?.status() || 0;
      // Wait for rendering hydration
      await page.waitForTimeout(1000);
    } catch (err: any) {
      pageErrors.push(`Navigation failed: ${err.message}`);
    }

    const isPass = consoleErrors.length === 0 && pageErrors.length === 0 && statusCode === 200;
    results.push({
      portal: item.portal,
      url: item.url,
      statusCode,
      consoleErrors,
      pageErrors,
      status: isPass ? 'PASS' : 'FAIL',
    });

    console.log(
      `  ${isPass ? '✅' : '❌'} [${item.portal}] ${item.url} -> HTTP ${statusCode} (Console errors: ${consoleErrors.length}, Page errors: ${pageErrors.length})`,
    );
    if (consoleErrors.length > 0) {
      console.log('     Console Errors:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('     Page Errors:', pageErrors);
    }

    await page.close();
  }

  await browser.close();

  console.log('\n=============================================================================');
  console.log('📊 BROWSER CONSOLE AUDIT SUMMARY');
  console.log('=============================================================================');
  console.table(
    results.map((r) => ({
      portal: r.portal,
      url: r.url,
      httpStatus: r.statusCode,
      consoleErrors: r.consoleErrors.length,
      pageErrors: r.pageErrors.length,
      status: r.status,
    })),
  );

  const allPassed = results.every((r) => r.status === 'PASS');
  if (allPassed) {
    console.log('\n🎉 ALL ROUTES PASSED! Zero console errors and zero unhandled page errors.');
  } else {
    console.log('\n⚠️ Some routes reported console or page errors.');
  }
}

runBrowserAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
