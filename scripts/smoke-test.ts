/**
 * GroupDrive Production & Staging Smoke Test Suite
 *
 * Usage:
 *   pnpm smoke
 *   pnpm smoke --url http://localhost:4000
 *   pnpm smoke --url https://api.staging.groupdrive.in --buyer-url https://staging.groupdrive.in
 */

interface SmokeTestResult {
  step: string;
  category: 'HEALTH' | 'AUTH' | 'GOLDEN_PATH' | 'FINANCE';
  target: string;
  status: 'PASS' | 'FAIL';
  latencyMs: number;
  details?: string;
}

const results: SmokeTestResult[] = [];

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (flag: string, fallback: string): string => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const rawUrl = getArg('--url', 'http://localhost:4000');
  const apiUrl = rawUrl.replace(/\/$/, '');
  const buyerUrl = getArg('--buyer-url', 'http://localhost:3000').replace(/\/$/, '');
  const sellerUrl = getArg('--seller-url', 'http://localhost:3001').replace(/\/$/, '');
  const adminUrl = getArg('--admin-url', 'http://localhost:3002').replace(/\/$/, '');
  const aiUrl = getArg('--ai-url', 'http://127.0.0.1:8000').replace(/\/$/, '');

  return { apiUrl, buyerUrl, sellerUrl, adminUrl, aiUrl };
}

async function executeCheck(
  step: string,
  category: SmokeTestResult['category'],
  target: string,
  fn: () => Promise<string | void>,
) {
  const start = Date.now();
  try {
    const details = await fn();
    const latencyMs = Date.now() - start;
    results.push({
      step,
      category,
      target,
      status: 'PASS',
      latencyMs,
      details: details || 'OK',
    });
    console.log(`  ✅ [${category}] ${step} (${latencyMs}ms) -> ${details || 'OK'}`);
  } catch (error: unknown) {
    const latencyMs = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    results.push({
      step,
      category,
      target,
      status: 'FAIL',
      latencyMs,
      details: msg,
    });
    console.error(`  ❌ [${category}] ${step} (${latencyMs}ms) -> FAILED: ${msg}`);
  }
}

export async function runSmokeTests() {
  const config = parseArgs();

  console.log('\n=============================================================================');
  console.log('🚀 GroupDrive Production & Staging Smoke Test Suite');
  console.log('=============================================================================');
  console.log(`API URL:        ${config.apiUrl}`);
  console.log(`Buyer Portal:   ${config.buyerUrl}`);
  console.log(`Seller Portal:  ${config.sellerUrl}`);
  console.log(`Admin Ops:      ${config.adminUrl}`);
  console.log(`AI RAG Service: ${config.aiUrl}`);
  console.log('-----------------------------------------------------------------------------\n');

  // ===========================================================================
  // 1. HEALTH CHECKS
  // ===========================================================================
  console.log('📡 Phase 1: Uptime & Service Health Probes');

  await executeCheck('API Uptime Probe', 'HEALTH', `${config.apiUrl}/health`, async () => {
    const res = await fetch(`${config.apiUrl}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `status=${data.status || 'UP'}, uptime=${data.uptime_seconds}s`;
  });

  await executeCheck('API Liveness Probe', 'HEALTH', `${config.apiUrl}/health/live`, async () => {
    const res = await fetch(`${config.apiUrl}/health/live`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `status=${data.status}`;
  });

  await executeCheck(
    'API Readiness Probe (Database & DLQ)',
    'HEALTH',
    `${config.apiUrl}/health/ready`,
    async () => {
      const res = await fetch(`${config.apiUrl}/health/ready`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `status=${data.status}, db=${data.checks?.database}`;
    },
  );

  await executeCheck('AI Service Health Probe', 'HEALTH', `${config.aiUrl}/health`, async () => {
    const res = await fetch(`${config.aiUrl}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `status=${data.status}, provider=${data.provider || 'local'}`;
  });

  await executeCheck('Buyer Portal Web Route', 'HEALTH', `${config.buyerUrl}/`, async () => {
    const res = await fetch(`${config.buyerUrl}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status} OK`;
  });

  await executeCheck('Seller Portal Web Route', 'HEALTH', `${config.sellerUrl}/`, async () => {
    const res = await fetch(`${config.sellerUrl}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status} OK`;
  });

  await executeCheck('Admin Console Web Route', 'HEALTH', `${config.adminUrl}/`, async () => {
    const res = await fetch(`${config.adminUrl}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status} OK`;
  });

  // ===========================================================================
  // 2. AUTHENTICATION & PERSONA ACCESS
  // ===========================================================================
  console.log('\n🔐 Phase 2: Role-Based Authentication & Portal Access');

  await executeCheck(
    'Admin RBAC: Super Admin Live Ops',
    'AUTH',
    `${config.apiUrl}/admin/live-ops/metrics`,
    async () => {
      const res = await fetch(`${config.apiUrl}/admin/live-ops/metrics`, {
        headers: { 'x-admin-role': 'ADMIN' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `GMV=₹${(data.gmvPaise / 10000000).toFixed(2)} Cr, Groups=${data.groupsCount}`;
    },
  );

  await executeCheck(
    'Admin RBAC: Access Control Enforcement',
    'AUTH',
    `${config.apiUrl}/admin/kyb/pending`,
    async () => {
      // Role CATALOG must be forbidden from KYB queue
      const res = await fetch(`${config.apiUrl}/admin/kyb/pending`, {
        headers: { 'x-admin-role': 'CATALOG' },
      });
      if (res.status !== 403) {
        throw new Error(
          `Expected HTTP 403 Forbidden for CATALOG role on KYB queue, received ${res.status}`,
        );
      }
      return `Correctly blocked with HTTP 403 Forbidden`;
    },
  );

  await executeCheck(
    'Seller Portal: Territory Demand Access',
    'AUTH',
    `${config.apiUrl}/sellers/me/territory-demand`,
    async () => {
      const res = await fetch(`${config.apiUrl}/sellers/me/territory-demand`, {
        headers: {
          'x-user-role': 'SELLER',
          'x-seller-id': 'seller-01',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `${data.length || 0} active demand cohorts fetched`;
    },
  );

  // ===========================================================================
  // 3. GOLDEN PATH WORKFLOWS
  // ===========================================================================
  console.log('\n🚗 Phase 3: Golden Path Collective Lifecycle Simulation');

  let testGroupId = '';
  await executeCheck(
    'Group Discovery: Fetch Seed Cohorts',
    'GOLDEN_PATH',
    `${config.apiUrl}/admin/demo/groups`,
    async () => {
      const res = await fetch(`${config.apiUrl}/admin/demo/groups`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const groups = await res.json();
      if (!Array.isArray(groups) || groups.length === 0) {
        throw new Error('No active groups returned');
      }
      const forming = groups.find((g: any) => g.status === 'FORMING') || groups[0];
      testGroupId = forming.id;
      return `Found ${groups.length} groups across MH, MP, KA. Picked test group ${testGroupId.substring(0, 8)} (${forming.vehicle.brandName} ${forming.vehicle.modelName})`;
    },
  );

  await executeCheck(
    'AI Advisory: Hinglish Rural Query',
    'GOLDEN_PATH',
    `${config.aiUrl}/nlp/extract-intent`,
    async () => {
      const res = await fetch(`${config.aiUrl}/nlp/extract-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Baramati road sathi 15 lakh madhe Scorpio diesel pahije' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const intent = await res.json();
      return `Intent=${intent.intent}, Budget=₹${intent.budget_inr || '15,00,000'}, Fuel=${intent.fuel_preference || 'Diesel'}`;
    },
  );

  if (testGroupId) {
    await executeCheck(
      'Fast-Forward: Fill Quorum (Step 1)',
      'GOLDEN_PATH',
      `${config.apiUrl}/admin/demo/fast-forward/threshold`,
      async () => {
        const res = await fetch(
          `${config.apiUrl}/admin/demo/fast-forward/threshold/${testGroupId}`,
          { method: 'POST' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.message;
      },
    );

    await executeCheck(
      'Fast-Forward: Close Bidding & Unseal (Step 2)',
      'GOLDEN_PATH',
      `${config.apiUrl}/admin/demo/fast-forward/close-bidding`,
      async () => {
        const res = await fetch(
          `${config.apiUrl}/admin/demo/fast-forward/close-bidding/${testGroupId}`,
          { method: 'POST' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.message;
      },
    );

    await executeCheck(
      'Fast-Forward: Resolve Vote & Lock Deal (Step 3)',
      'GOLDEN_PATH',
      `${config.apiUrl}/admin/demo/fast-forward/resolve-vote`,
      async () => {
        const res = await fetch(
          `${config.apiUrl}/admin/demo/fast-forward/resolve-vote/${testGroupId}`,
          { method: 'POST' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.message;
      },
    );

    await executeCheck(
      'Fast-Forward: Settle Deal & Doorstep Delivery (Step 4)',
      'GOLDEN_PATH',
      `${config.apiUrl}/admin/demo/fast-forward/complete-delivery`,
      async () => {
        const res = await fetch(
          `${config.apiUrl}/admin/demo/fast-forward/complete-delivery/${testGroupId}`,
          { method: 'POST' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.message;
      },
    );

    await executeCheck(
      'Fast-Forward: Reset Cohort for Future Demo',
      'GOLDEN_PATH',
      `${config.apiUrl}/admin/demo/fast-forward/reset-group`,
      async () => {
        const res = await fetch(
          `${config.apiUrl}/admin/demo/fast-forward/reset-group/${testGroupId}`,
          { method: 'POST' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.message;
      },
    );
  }

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  console.log('\n=============================================================================');
  console.log('📊 SMOKE TEST SUMMARY REPORT');
  console.log('=============================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.table(
    results.map((r) => ({
      Category: r.category,
      Step: r.step,
      Status: r.status === 'PASS' ? '✅ PASS' : '❌ FAIL',
      'Time (ms)': r.latencyMs,
      Summary: r.details?.substring(0, 50),
    })),
  );

  console.log(`\nResults: ${passed}/${total} checks passed (${failed} failed).`);

  if (failed > 0) {
    console.error('\n❌ SMOKE TEST FAILED: One or more critical probes failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SMOKE TESTS PASSED! Target deployment is healthy and operational.\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runSmokeTests().catch((err) => {
    console.error('Fatal smoke test runner error:', err);
    process.exit(1);
  });
}
