import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  match: string;
  type: string;
  isIntentional: boolean;
  explanation: string;
}

const rootDir = process.cwd();
const findings: Finding[] = [];

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  '.pgdata',
  'build',
  '.turbo',
]);

const secretPatterns: Array<{
  name: string;
  regex: RegExp;
  checkIntentional: (file: string, match: string) => { intentional: boolean; reason: string };
}> = [
  {
    name: 'TODO/FIXME Security',
    regex: /(TODO|FIXME|HACK)[\s\-_:]*(security|vuln|auth|sanitize|injection)/i,
    checkIntentional: () => ({ intentional: false, reason: 'Pending security item' }),
  },
  {
    name: 'AWS Access Key',
    regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
    checkIntentional: () => ({ intentional: false, reason: 'AWS Key pattern' }),
  },
  {
    name: 'Private Key Block',
    regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PRIVATE)\s+KEY-----/,
    checkIntentional: () => ({ intentional: false, reason: 'Private key file' }),
  },
  {
    name: 'Live Razorpay Key',
    regex: /rzp_live_[a-zA-Z0-9]{14}/,
    checkIntentional: () => ({ intentional: false, reason: 'Live Razorpay secret' }),
  },
  {
    name: 'Hardcoded Password/Secret in Code',
    regex: /(password|secret|jwt_secret|private_key)\s*[:=]\s*['"][a-zA-Z0-9_!@#$%^&*]{8,}['"]/i,
    checkIntentional: (file, match) => {
      if (
        file.includes('.example') ||
        file.includes('test') ||
        file.includes('spec') ||
        file.includes('mock') ||
        file.includes('seed')
      ) {
        return { intentional: true, reason: 'Test, mock, or example template credentials' };
      }
      if (
        match.includes('postgres:postgres') ||
        match.includes('change-me') ||
        match.includes('demo') ||
        match.includes('test-jwt-secret')
      ) {
        return { intentional: true, reason: 'Default development/demo placeholder secret' };
      }
      return { intentional: false, reason: 'Potential hardcoded production credential' };
    },
  },
];

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      // Only check text / source files
      if (/\.(ts|tsx|js|jsx|py|json|md|env|yml|yaml|sh)$/i.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const pat of secretPatterns) {
              const m = line.match(pat.regex);
              if (m) {
                const { intentional, reason } = pat.checkIntentional(relPath, m[0]);
                findings.push({
                  file: relPath,
                  line: i + 1,
                  match: m[0].substring(0, 80),
                  type: pat.name,
                  isIntentional: intentional,
                  explanation: reason,
                });
              }
            }
          }
        } catch {
          // ignore unreadable
        }
      }
    }
  }
}

scanDir(rootDir);

console.log('=============================================================================');
console.log('🔒 GroupDrive Security & Secrets Scan');
console.log('=============================================================================');
console.log(`Total Findings: ${findings.length}`);

const realAlerts = findings.filter((f) => !f.isIntentional);
const intentional = findings.filter((f) => f.isIntentional);

console.log(`\n❌ Actionable / Unintentional Secrets (${realAlerts.length}):`);
if (realAlerts.length > 0) {
  console.table(realAlerts);
} else {
  console.log('Zero actionable secrets found in codebase.');
}

console.log(`\nℹ️ Intentional Demo / Test Credentials (${intentional.length}):`);
console.table(
  intentional.map((i) => ({
    file: i.file,
    line: i.line,
    type: i.type,
    explanation: i.explanation,
  })),
);
