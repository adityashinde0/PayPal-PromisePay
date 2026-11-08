import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { transform } from 'sucrase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST SUITE 1: apps/web/src/app/error.tsx Empirical Verification ===');

// 1. Read source
const errorPath = path.resolve(__dirname, '../src/app/error.tsx');
const source = fs.readFileSync(errorPath, 'utf8');

// Check Next.js 15 requirements in source code:
// A. 'use client' directive
assert.ok(source.startsWith("'use client'") || source.startsWith('"use client"'), 
  "FAIL: error.tsx must start with 'use client'");
console.log('✔ PASS: "use client" directive present at top of file');

// B. Next.js 15 prop typing interface
assert.ok(source.includes('error: Error & { digest?: string }'), 
  "FAIL: error prop must match Next.js 15 type 'Error & { digest?: string }'");
assert.ok(source.includes('reset: () => void'), 
  "FAIL: reset prop must match type '() => void'");
console.log('✔ PASS: Next.js 15 prop typings match official App Router specifications');

// Transform using sucrase (stripping TS, converting JSX and ESM imports to CJS)
const transformed = transform(source, {
  transforms: ['jsx', 'typescript', 'imports'],
  jsxPragma: 'React.createElement',
  jsxFragmentPragma: 'React.Fragment'
}).code;

// Create mocked module execution environment
const mockLink = ({ href, children, className }) => React.createElement('a', { href, className }, children);
const mockIcon = (props) => React.createElement('svg', props);

// Prepare module evaluation
const moduleExports = {};
const customRequire = (id) => {
  if (id === 'react') return React;
  if (id === 'next/link') return { default: mockLink, __esModule: true };
  if (id === 'lucide-react') {
    return {
      AlertCircle: mockIcon,
      RefreshCw: mockIcon,
      Home: mockIcon,
    };
  }
  throw new Error(`Unknown require in test: ${id}`);
};

const fn = new Function('require', 'exports', 'React', transformed);
fn(customRequire, moduleExports, React);
const ErrorBoundary = moduleExports.default;

assert.equal(typeof ErrorBoundary, 'function', 'FAIL: ErrorBoundary must export default a React component function');
console.log('✔ PASS: ErrorBoundary default export is a valid React component');

// 2. Test Case 1: Standard Error without digest
let resetCalled = false;
const standardError = new Error('Standard database failure connection refused');
const html1 = ReactDOMServer.renderToString(
  React.createElement(ErrorBoundary, {
    error: standardError,
    reset: () => { resetCalled = true; }
  })
);

assert.ok(html1.includes('Something Went Wrong'), 'FAIL: Expected "Something Went Wrong" heading');
assert.ok(html1.includes('Standard database failure connection refused'), 'FAIL: Expected error message to be rendered');
assert.ok(html1.includes('Try Again'), 'FAIL: Expected "Try Again" retry button');
assert.ok(html1.includes('Dashboard'), 'FAIL: Expected "Dashboard" navigation link');
assert.ok(html1.includes('href="/"'), 'FAIL: Expected link href="/"');
console.log('✔ PASS: Standard error renders headline, message, retry button, and dashboard link');

// 3. Test Case 2: Error with digest (Next.js server-side error digest)
const digestError = new Error('Server action invocation failed');
digestError.digest = 'NEXT_DIGEST_492048201';
const html2 = ReactDOMServer.renderToString(
  React.createElement(ErrorBoundary, {
    error: digestError,
    reset: () => { resetCalled = true; }
  })
);
console.log('HTML2 output:', html2);

assert.ok(html2.includes('Server action invocation failed'), 'FAIL: Error message missing');
assert.ok(html2.includes('NEXT_DIGEST_492048201'), 'FAIL: Error digest missing from rendered output');
console.log('✔ PASS: Error digest correctly rendered when present');

// 4. Test Case 3: Error with empty message
const emptyError = new Error('');
const html3 = ReactDOMServer.renderToString(
  React.createElement(ErrorBoundary, {
    error: emptyError,
    reset: () => { resetCalled = true; }
  })
);
assert.ok(html3.includes('Something Went Wrong'), 'FAIL: Empty error message must still render boundary safely');
assert.ok(!html3.includes('Digest:'), 'FAIL: Digest should not render when undefined');
console.log('✔ PASS: Empty error message handled gracefully without rendering empty container');

// 5. Test Case 4: XSS attack payload inside error message (HTML injection stress test)
const xssError = new Error('<script>alert("pwned")</script><img src=x onerror=alert(1)>');
const html4 = ReactDOMServer.renderToString(
  React.createElement(ErrorBoundary, {
    error: xssError,
    reset: () => { resetCalled = true; }
  })
);
assert.ok(!html4.includes('<script>alert("pwned")</script>'), 'FAIL: React DOM should escape raw script tags');
assert.ok(html4.includes('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;'), 'FAIL: Expected HTML-escaped string');
console.log('✔ PASS: XSS payloads in error.message properly escaped by React DOM');

// 6. Test Case 5: Verify reset() handler execution
// To test component logic without full DOM, mock React.useEffect during direct execution
let testResetCount = 0;
const testReset = () => { testResetCount++; };

const originalUseEffect = React.useEffect;
try {
  React.useEffect = (cb, deps) => { /* noop during non-DOM unit test */ };
  const rendered = ErrorBoundary({ error: standardError, reset: testReset });
  assert.ok(rendered, 'FAIL: ErrorBoundary should return a React element');

  // Traverse rendered tree to find the retry button onClick
  function findOnClick(node) {
    if (!node || typeof node !== 'object') return null;
    if (typeof node.props?.onClick === 'function') {
      return node.props.onClick;
    }
    if (Array.isArray(node.props?.children)) {
      for (const child of node.props.children) {
        const found = findOnClick(child);
        if (found) return found;
      }
    } else if (node.props?.children) {
      return findOnClick(node.props.children);
    }
    return null;
  }

  const onClickHandler = findOnClick(rendered);
  assert.ok(onClickHandler, 'FAIL: Could not locate retry button with onClick handler in ErrorBoundary');
  onClickHandler();
  assert.equal(testResetCount, 1, 'FAIL: Calling button onClick did not trigger reset()');
  console.log('✔ PASS: Retry button onClick handler triggers reset() handler');
} finally {
  React.useEffect = originalUseEffect;
}

console.log('=== All error.tsx tests passed! ===\n');
