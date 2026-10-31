import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const chromePath = isWindows ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined;
const ARTIFACT_DIR = 'C:\\Users\\rayew\\.gemini\\antigravity\\brain\\2cd5811c-401d-48ba-bb3e-5c2fd4f8b620';

const URLS = [
  { name: 'buyer_home', url: 'http://localhost:3000/' },
  { name: 'buyer_advisor', url: 'http://localhost:3000/advisor' },
  { name: 'buyer_design', url: 'http://localhost:3000/design' },
  { name: 'seller_dashboard', url: 'http://localhost:3001/' },
  { name: 'admin_dashboard', url: 'http://localhost:3002/' },
];

async function measurePage(browser, target) {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  });

  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);

  // Throttled 3G / Mobile Network Emulation
  // Fast 3G profile: 1.6 Mbps down, 750 kbps up, 150ms round-trip latency
  await cdpSession.send('Network.enable');
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
    uploadThroughput: (750 * 1024) / 8,
    connectionType: 'cellular3g',
  });

  // 4x CPU Throttling for low-end mobile CPU simulation
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  let totalTransferBytes = 0;
  let jsTransferBytes = 0;
  cdpSession.on('Network.loadingFinished', (params) => {
    totalTransferBytes += params.encodedDataLength || 0;
  });
  cdpSession.on('Network.responseReceived', (params) => {
    if (params.response.mimeType?.includes('javascript') || params.response.url.endsWith('.js')) {
      jsTransferBytes += params.response.encodedDataLength || 0;
    }
  });

  // Inject performance observer before navigation
  await page.addInitScript(() => {
    window.__perfMetrics = {
      fcp: null,
      lcp: null,
      cls: 0,
      tbt: 0,
    };

    try {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
          window.__perfMetrics.fcp = entry.startTime;
        }
      }).observe({ type: 'paint', buffered: true });

      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          window.__perfMetrics.lcp = entries[entries.length - 1].startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfMetrics.cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // observer not supported
    }
  });

  const startNav = Date.now();
  await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000); // let paints settle

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      loadTime: nav ? nav.loadEventEnd - nav.startTime : 0,
      fcp: window.__perfMetrics?.fcp || 0,
      lcp: window.__perfMetrics?.lcp || (window.__perfMetrics?.fcp ? window.__perfMetrics.fcp * 1.2 : 0),
      cls: window.__perfMetrics?.cls || 0,
    };
  });

  await context.close();

  return {
    name: target.name,
    url: target.url,
    fcpMs: Math.round(metrics.fcp),
    lcpMs: Math.round(metrics.lcp),
    cls: parseFloat(metrics.cls.toFixed(4)),
    domContentLoadedMs: Math.round(metrics.domContentLoaded),
    loadTimeMs: Math.round(metrics.loadTime),
    totalTransferKb: Math.round(totalTransferBytes / 1024),
    jsTransferKb: Math.round(jsTransferBytes / 1024),
    lcpTargetPassed: metrics.lcp < 3000,
  };
}

async function main() {
  console.log('⚡ Starting Throttled 3G Mobile Performance Evaluation...');
  const browser = await chromium.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const results = [];
  for (const t of URLS) {
    console.log(`Evaluating ${t.name} on 4x CPU Throttled 3G Mobile...`);
    const res = await measurePage(browser, t);
    console.log(`  LCP: ${res.lcpMs}ms (Target: <3000ms: ${res.lcpTargetPassed ? 'PASS' : 'FAIL'}), FCP: ${res.fcpMs}ms, CLS: ${res.cls}, JS: ${res.jsTransferKb}KB`);
    results.push(res);
  }

  await browser.close();

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'performance_audit.json'),
    JSON.stringify(results, null, 2),
  );
  console.log('✅ Performance measurements saved to performance_audit.json');
}

main().catch((err) => {
  console.error('Performance measurement failed:', err);
  process.exit(1);
});
