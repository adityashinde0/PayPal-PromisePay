import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { transform } from 'sucrase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');

console.log('=== TEST SUITE 3: App Router Routes, Static Assets & Build Traces Empirical Verification ===');

// 1. Static Link Crawl across all TSX source files
console.log('Step 1: Auditing static route links across apps/web/src...');
const tsxFiles = [];
function findTsxFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        findTsxFiles(full);
      }
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      tsxFiles.push(full);
    }
  }
}
findTsxFiles(path.join(webRoot, 'src'));

function isRouteValid(href) {
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) return true;
  if (href.startsWith('/#') || href === '#') return true;
  if (href === '/') return true;
  if (href === '/create') return true;
  if (href === '/login') return true;
  if (href === '/signup') return true;
  if (href === '/settings') return true;
  if (href.startsWith('/promises/')) return true;
  if (href.startsWith('/api/')) return true;
  return false;
}

const foundHrefs = [];
const hrefRegex = /href=[\'\"]([^\'\"]+)[\'\"]/g;
const routerPushRegex = /router\.push\([\'\"]([^\'\"]+)[\'\"]\)/g;

for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    foundHrefs.push({ href: match[1], file: path.relative(webRoot, file) });
  }
  while ((match = routerPushRegex.exec(content)) !== null) {
    foundHrefs.push({ href: match[1], file: path.relative(webRoot, file) });
  }
}

let brokenHrefs = 0;
for (const item of foundHrefs) {
  if (!isRouteValid(item.href)) {
    console.error(`❌ Broken link discovered: ${item.href} in ${item.file}`);
    brokenHrefs++;
  }
}
assert.equal(brokenHrefs, 0, `FAIL: Found ${brokenHrefs} broken link targets`);
console.log(`✔ PASS: All ${foundHrefs.length} static link references point to valid App Router destinations (0 broken links)`);

// 2. Verify all 8 App Router Route Definitions & Compiled Artifacts in .next
console.log('\nStep 2: Verifying compiled route manifests and build traces in .next/server/app...');
const expectedRoutes = [
  { name: 'Root Dashboard', file: 'page.js', route: '/' },
  { name: 'Create Promise', file: 'create/page.js', route: '/create' },
  { name: 'Login Page', file: 'login/page.js', route: '/login' },
  { name: 'Signup Page', file: 'signup/page.js', route: '/signup' },
  { name: 'Settings Page', file: 'settings/page.js', route: '/settings' },
  { name: 'Promise Detail Dynamic Route', file: 'promises/[id]/page.js', route: '/promises/[id]' },
  { name: 'Health API Route', file: 'api/health/route.js', route: '/api/health' },
  { name: 'Not Found Page (404)', file: '_not-found/page.js', route: '/_not-found' },
];

const nextServerAppDir = path.join(webRoot, '.next/server/app');
assert.ok(fs.existsSync(nextServerAppDir), 'FAIL: .next/server/app does not exist. Run next build first.');

for (const r of expectedRoutes) {
  const fullPath = path.join(nextServerAppDir, r.file);
  assert.ok(fs.existsSync(fullPath), `FAIL: Missing compiled build artifact for route ${r.route} (${r.file})`);
  const stat = fs.statSync(fullPath);
  assert.ok(stat.size > 0, `FAIL: Build artifact for route ${r.route} is 0 bytes`);
  console.log(`✔ PASS: [Compiled] ${r.name} -> ${r.route} (${stat.size} bytes in ${r.file})`);
}

// 3. Empirically execute and verify Health API route in-process
console.log('\nStep 3: Empirically testing /api/health route handler in-process...');
const healthSource = fs.readFileSync(path.join(webRoot, 'src/app/api/health/route.ts'), 'utf8');
const transformedHealth = transform(healthSource, {
  transforms: ['jsx', 'typescript', 'imports'],
}).code;

const mockNextResponse = {
  json: (data, init) => ({
    status: init?.status || 200,
    headers: init?.headers || {},
    json: async () => data,
  }),
};

const healthModule = {};
const customRequire = (id) => {
  if (id === 'next/server') return { NextResponse: mockNextResponse, __esModule: true };
  throw new Error(`Unknown require: ${id}`);
};

new Function('require', 'exports', transformedHealth)(customRequire, healthModule);
assert.equal(typeof healthModule.GET, 'function', 'FAIL: Health route must export async function GET()');

const response = await healthModule.GET();
assert.equal(response.status, 200, 'FAIL: Health route status must be 200');
const responseJson = await response.json();
assert.equal(responseJson.status, 'ok', 'FAIL: Health route JSON status must be "ok"');
assert.equal(responseJson.service, 'promisepay-web', 'FAIL: Health route service must be "promisepay-web"');
assert.ok(responseJson.timestamp, 'FAIL: Health route must include ISO timestamp');
console.log('✔ PASS: Health API route GET handler executed successfully ->', responseJson);

// 4. Verify Static Assets in public/ (0 404 assets requirement)
console.log('\nStep 4: Probing public static assets on filesystem (0 404 assets requirement)...');
const requiredAssets = [
  { path: 'favicon.ico', minSize: 100, type: 'icon' },
  { path: 'paypal.svg', minSize: 1000, type: 'svg' },
  { path: 'assets/paypal_promisepay_reference.jpg', minSize: 50000, type: 'jpeg' },
  { path: 'assets/promisepay_hero_dashboard.jpg', minSize: 50000, type: 'jpeg' },
  { path: 'assets/promisepay_dark_executive_dashboard.jpg', minSize: 50000, type: 'jpeg' },
  { path: 'assets/promisepay_escrow_audit_studio.jpg', minSize: 50000, type: 'jpeg' },
  { path: 'assets/promisepay_modern_clean_fintech.jpg', minSize: 50000, type: 'jpeg' },
];

const publicDir = path.join(webRoot, 'public');
for (const asset of requiredAssets) {
  const full = path.join(publicDir, asset.path);
  assert.ok(fs.existsSync(full), `FAIL: 404 Asset Not Found: /${asset.path}`);
  const stat = fs.statSync(full);
  assert.ok(
    stat.size >= asset.minSize,
    `FAIL: Asset /${asset.path} size is ${stat.size} bytes, expected at least ${asset.minSize}`
  );

  // Validate magic bytes / content
  const buf = fs.readFileSync(full);
  if (asset.type === 'svg') {
    const text = buf.toString('utf8');
    assert.ok(text.includes('<svg') && text.includes('</svg>'), `FAIL: /${asset.path} is not valid SVG`);
  } else if (asset.type === 'jpeg') {
    assert.equal(buf[0], 0xff, `FAIL: /${asset.path} invalid JPEG SOI marker`);
    assert.equal(buf[1], 0xd8, `FAIL: /${asset.path} invalid JPEG SOI marker`);
  }

  console.log(`✔ PASS: [200 OK Asset] /${asset.path} (${stat.size} bytes, valid ${asset.type})`);
}

// 5. Verify Next.js layout metadata icons reference
console.log('\nStep 5: Verifying layout.tsx metadata icon link...');
const layoutSource = fs.readFileSync(path.join(webRoot, 'src/app/layout.tsx'), 'utf8');
assert.ok(
  layoutSource.includes("icon: '/paypal.svg'") || layoutSource.includes('icon: "/paypal.svg"') || layoutSource.includes("icon: '/favicon.ico'"),
  'FAIL: layout.tsx must specify valid icon metadata'
);
console.log('✔ PASS: Root layout correctly binds icon to valid public asset');

console.log('=== All App Router routes and static asset tests passed! ===\n');
