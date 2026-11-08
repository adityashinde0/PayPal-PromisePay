import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('======================================================================');
console.log('   EMPIRICAL CHALLENGER: FRONTEND UI/UX, ROUTING & SSE TEST HARNESS   ');
console.log('======================================================================\n');

const suites = [
  { name: '1. App Router Error Boundary (error.tsx)', script: 'test_error_boundary.mjs' },
  { name: '2. SSE Connection Lifecycle & Event Stream Resilience', script: 'test_sse_lifecycle.mjs' },
  { name: '3. App Router 8 Routes, Static Assets & Build Traces', script: 'test_routes_and_assets.mjs' },
  { name: '4. AG Grid Table Responsiveness & Bryntum Schedule Engine', script: 'test_grid_and_bryntum.mjs' },
];

let allPassed = true;
const results = [];

for (const suite of suites) {
  const scriptPath = path.join(__dirname, suite.script);
  const startTime = Date.now();
  try {
    const output = execSync(`node "${scriptPath}"`, { encoding: 'utf8' });
    const duration = Date.now() - startTime;
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}ms` });
    console.log(output);
  } catch (err) {
    allPassed = false;
    const duration = Date.now() - startTime;
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}ms` });
    console.error(`FAILED: ${suite.name}\n`, err.stdout || err.message);
  }
}

console.log('\n======================================================================');
console.log('                       CHALLENGE TEST SUMMARY                         ');
console.log('======================================================================');
for (const r of results) {
  const icon = r.status === 'PASSED' ? '✔' : '✖';
  console.log(`${icon} [${r.status}] ${r.name} (${r.duration})`);
}
console.log('======================================================================');
if (allPassed) {
  console.log('FINAL VERDICT: ALL EMPIRICAL CHALLENGES PASSED (VERDICT: APPROVE)\n');
  process.exit(0);
} else {
  console.error('FINAL VERDICT: FAILURES DETECTED (VERDICT: REQUEST_CHANGES)\n');
  process.exit(1);
}
