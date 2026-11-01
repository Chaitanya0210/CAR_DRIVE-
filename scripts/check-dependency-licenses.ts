import * as fs from 'fs';
import * as path from 'path';

interface PkgInfo {
  name: string;
  version: string;
  license: string;
  source: string;
}

const rootDir = process.cwd();
const workspacePkgPaths = [
  'package.json',
  'apps/api/package.json',
  'apps/buyer-web/package.json',
  'apps/seller-web/package.json',
  'apps/admin-web/package.json',
  'apps/mcp-server/package.json',
  'packages/db/package.json',
  'packages/shared/package.json',
  'packages/ui/package.json',
];

const directDeps = new Set<string>();

for (const relPath of workspacePkgPaths) {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (pkg.dependencies) {
      for (const dep of Object.keys(pkg.dependencies)) {
        if (!dep.startsWith('@groupdrive/')) directDeps.add(dep);
      }
    }
    if (pkg.devDependencies) {
      for (const dep of Object.keys(pkg.devDependencies)) {
        if (!dep.startsWith('@groupdrive/')) directDeps.add(dep);
      }
    }
  }
}

const results: PkgInfo[] = [];
const licenseCounts: Record<string, number> = {};

for (const dep of Array.from(directDeps).sort()) {
  let pkgJsonPath: string | null = null;
  const directPath = path.join(rootDir, 'node_modules', dep, 'package.json');

  if (fs.existsSync(directPath)) {
    pkgJsonPath = directPath;
  } else {
    // Search in node_modules/.pnpm
    const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
    if (fs.existsSync(pnpmDir)) {
      const sanitizedName = dep.replace('/', '+');
      const dirs = fs.readdirSync(pnpmDir).filter((d) => d.startsWith(sanitizedName + '@'));
      if (dirs.length > 0) {
        const candidate = path.join(pnpmDir, dirs[0], 'node_modules', dep, 'package.json');
        if (fs.existsSync(candidate)) {
          pkgJsonPath = candidate;
        }
      }
    }
  }

  let lic = 'UNKNOWN';
  let ver = 'unknown';

  if (pkgJsonPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      ver = parsed.version || 'unknown';
      if (typeof parsed.license === 'string') {
        lic = parsed.license;
      } else if (parsed.license && typeof parsed.license === 'object' && parsed.license.type) {
        lic = parsed.license.type;
      } else if (Array.isArray(parsed.licenses) && parsed.licenses[0]?.type) {
        lic = parsed.licenses[0].type;
      }
    } catch {
      lic = 'PARSE_ERROR';
    }
  }

  results.push({
    name: dep,
    version: ver,
    license: lic,
    source: pkgJsonPath ? 'resolved' : 'unresolved',
  });
  licenseCounts[lic] = (licenseCounts[lic] || 0) + 1;
}

console.log('=============================================================================');
console.log('📜 GroupDrive Monorepo Direct Dependency License Audit');
console.log('=============================================================================');
console.log(`Audited ${results.length} direct dependencies across all packages:`);
console.table(licenseCounts);

const unresolved = results.filter((r) => r.source === 'unresolved');
if (unresolved.length > 0) {
  console.log(
    `\nUnresolved dependencies (${unresolved.length}):`,
    unresolved.map((u) => u.name),
  );
}

console.log('\nDetailed Breakdown:');
console.table(results.map((r) => ({ name: r.name, version: r.version, license: r.license })));
