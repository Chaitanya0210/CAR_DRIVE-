import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GroupDriveMcpServer } from './server.js';

export * from './server.js';
export * from './auth/tokens.js';
export * from './security/confirmation.js';
export * from './security/rate-limiter.js';
export * from './security/cost-budget.js';
export * from './security/idempotency.js';
export * from './security/injection-detector.js';
export * from './security/audit-logger.js';
export * from './store/platform-store.js';
export * from './agents/buyer-agent.js';
export * from './agents/seller-agent.js';
export * from './agents/admin-agent.js';

// If run directly as a CLI process (e.g. via tsx src/index.ts)
async function runStdioServer() {
  const token = process.env.GD_MCP_TOKEN || 'demo-buyer-token';
  const serverInstance = new GroupDriveMcpServer({ authToken: token });
  const transport = new StdioServerTransport();

  await serverInstance.server.connect(transport);
  console.error(
    `[GroupDrive MCP] Server initialized over STDIO with token: ${token.substring(0, 10)}...`,
  );
}

// Only launch stdio if executed as main
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  runStdioServer().catch((err) => {
    console.error('[GroupDrive MCP] Fatal startup error:', err);
    process.exit(1);
  });
}
