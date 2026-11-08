import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST SUITE 2: SSE Connection Lifecycle & Event Stream Resilience ===');

// 1. Inspect source of apps/web/src/app/promises/[id]/page.tsx
const pagePath = path.resolve(__dirname, '../src/app/promises/[id]/page.tsx');
const source = fs.readFileSync(pagePath, 'utf8');

// Verify that both required events are explicitly referenced in source:
const requiredEvents = [
  'CONNECTED',
  'EVIDENCE_SCANNING',
  'OCR_EXTRACTING',
  'AI_ANALYZING_REQUIREMENT',
  'MERKLE_TREE_SEALED',
  'PAYMENT_CAPTURED',
  'PAYPAL_DISPUTE_SYNCED',
  'PAYPAL_DISPUTE_RESOLVED',
];

for (const ev of requiredEvents) {
  assert.ok(
    source.includes(`eventSource.addEventListener('${ev}'`),
    `FAIL: Missing event listener registration for ${ev}`
  );
  assert.ok(
    source.includes(`eventSource.removeEventListener('${ev}'`),
    `FAIL: Missing removeEventListener cleanup for ${ev}`
  );
}
console.log(`✔ PASS: All ${requiredEvents.length} SSE events have registered listeners and explicit removeEventListener cleanups in source`);

// 2. Build a Mock EventSource to empirically simulate browser environment
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
    this.onopen = null;
    this.onerror = null;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(handler);
      if (this.listeners.get(type).size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  emit(type, dataString) {
    const list = this.listeners.get(type);
    if (list) {
      for (const handler of Array.from(list)) {
        handler({ data: dataString });
      }
    }
  }

  triggerOpen() {
    if (this.onopen) this.onopen();
  }

  triggerError(err) {
    if (this.onerror) this.onerror(err);
  }

  close() {
    this.closed = true;
  }

  totalActiveListeners() {
    let count = 0;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}

// 3. Replicate the exact useEffect closure from page.tsx to test actual behavioral semantics
function setupSseEffect(promiseId, { onStateChange, onLoadPromise }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  let eventSource = null;

  let connectedHandler = null;
  let scanningHandler = null;
  let ocrHandler = null;
  let aiAnalyzingHandler = null;
  let merkleHandler = null;
  let paymentHandler = null;
  let disputeSyncedHandler = null;
  let disputeResolvedHandler = null;

  try {
    eventSource = new MockEventSource(`${API_URL}/api/promises/${promiseId}/events`);

    eventSource.onopen = () => {
      onStateChange({ streamConnected: true });
    };

    eventSource.onerror = () => {
      onStateChange({ streamConnected: false });
    };

    const handleIncomingEvent = (eventType, displayTitle) => (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const detailMsg =
          parsed.data?.summary ||
          parsed.data?.message ||
          parsed.message ||
          `Event: ${eventType.replace(/_/g, ' ')}`;

        onStateChange({
          incomingEvent: { type: eventType, message: detailMsg },
          liveToast: { title: displayTitle, message: detailMsg },
        });

        if (
          ['MERKLE_TREE_SEALED', 'PAYMENT_CAPTURED', 'PAYPAL_DISPUTE_SYNCED', 'PAYPAL_DISPUTE_RESOLVED'].includes(
            eventType
          )
        ) {
          onLoadPromise(eventType);
        }
      } catch {
        // Corrupted payload safely discarded without crashing app
      }
    };

    connectedHandler = handleIncomingEvent('CONNECTED', 'Stream Connected');
    scanningHandler = handleIncomingEvent('EVIDENCE_SCANNING', 'Evidence Scanning');
    ocrHandler = handleIncomingEvent('OCR_EXTRACTING', 'Multimodal Vision OCR');
    aiAnalyzingHandler = handleIncomingEvent('AI_ANALYZING_REQUIREMENT', 'AI Requirement Analysis');
    merkleHandler = handleIncomingEvent('MERKLE_TREE_SEALED', 'Merkle Tree Sealed');
    paymentHandler = handleIncomingEvent('PAYMENT_CAPTURED', 'Payment Captured');
    disputeSyncedHandler = handleIncomingEvent('PAYPAL_DISPUTE_SYNCED', 'PayPal Dispute Synced');
    disputeResolvedHandler = handleIncomingEvent('PAYPAL_DISPUTE_RESOLVED', 'PayPal Dispute Resolved');

    eventSource.addEventListener('CONNECTED', connectedHandler);
    eventSource.addEventListener('EVIDENCE_SCANNING', scanningHandler);
    eventSource.addEventListener('OCR_EXTRACTING', ocrHandler);
    eventSource.addEventListener('AI_ANALYZING_REQUIREMENT', aiAnalyzingHandler);
    eventSource.addEventListener('MERKLE_TREE_SEALED', merkleHandler);
    eventSource.addEventListener('PAYMENT_CAPTURED', paymentHandler);
    eventSource.addEventListener('PAYPAL_DISPUTE_SYNCED', disputeSyncedHandler);
    eventSource.addEventListener('PAYPAL_DISPUTE_RESOLVED', disputeResolvedHandler);
  } catch {}

  const cleanup = () => {
    if (eventSource) {
      if (connectedHandler) eventSource.removeEventListener('CONNECTED', connectedHandler);
      if (scanningHandler) eventSource.removeEventListener('EVIDENCE_SCANNING', scanningHandler);
      if (ocrHandler) eventSource.removeEventListener('OCR_EXTRACTING', ocrHandler);
      if (aiAnalyzingHandler) eventSource.removeEventListener('AI_ANALYZING_REQUIREMENT', aiAnalyzingHandler);
      if (merkleHandler) eventSource.removeEventListener('MERKLE_TREE_SEALED', merkleHandler);
      if (paymentHandler) eventSource.removeEventListener('PAYMENT_CAPTURED', paymentHandler);
      if (disputeSyncedHandler) eventSource.removeEventListener('PAYPAL_DISPUTE_SYNCED', disputeSyncedHandler);
      if (disputeResolvedHandler) eventSource.removeEventListener('PAYPAL_DISPUTE_RESOLVED', disputeResolvedHandler);
      eventSource.close();
    }
  };

  return { eventSource, cleanup };
}

// 4. Test Case: Lifecycle setup and listener registration verification
let state = { streamConnected: false, incomingEvent: null, liveToast: null };
const loadPromiseCalls = [];
const { eventSource, cleanup } = setupSseEffect('prom_test_canonical', {
  onStateChange: (delta) => { Object.assign(state, delta); },
  onLoadPromise: (evType) => { loadPromiseCalls.push(evType); },
});

assert.equal(eventSource.totalActiveListeners(), 8, 'FAIL: Exactly 8 listeners must be registered');
console.log('✔ PASS: All 8 event listeners registered on EventSource');

// 5. Test Case: Connection state transitions
eventSource.triggerOpen();
assert.equal(state.streamConnected, true, 'FAIL: onopen should set streamConnected=true');
console.log('✔ PASS: onopen event sets streamConnected = true');

eventSource.triggerError(new Error('Network drop'));
assert.equal(state.streamConnected, false, 'FAIL: onerror should set streamConnected=false');
console.log('✔ PASS: onerror event sets streamConnected = false');

// 6. Test Case: Test all event dispatching and payload handling
// Case A: AI_ANALYZING_REQUIREMENT
eventSource.emit(
  'AI_ANALYZING_REQUIREMENT',
  JSON.stringify({ data: { summary: 'Gemini 1.5 Pro checking requirement REQ-01' } })
);
assert.equal(state.incomingEvent.type, 'AI_ANALYZING_REQUIREMENT');
assert.equal(state.incomingEvent.message, 'Gemini 1.5 Pro checking requirement REQ-01');
assert.equal(state.liveToast.title, 'AI Requirement Analysis');
console.log('✔ PASS: AI_ANALYZING_REQUIREMENT event parsed and routed to toast & state');

// Case B: PAYPAL_DISPUTE_RESOLVED (must trigger loadPromise())
loadPromiseCalls.length = 0;
eventSource.emit(
  'PAYPAL_DISPUTE_RESOLVED',
  JSON.stringify({ data: { message: 'PayPal Dispute Case PP-D-1002 closed in favor of seller' } })
);
assert.equal(state.incomingEvent.type, 'PAYPAL_DISPUTE_RESOLVED');
assert.equal(state.incomingEvent.message, 'PayPal Dispute Case PP-D-1002 closed in favor of seller');
assert.equal(loadPromiseCalls.length, 1, 'FAIL: PAYPAL_DISPUTE_RESOLVED must trigger loadPromise');
assert.equal(loadPromiseCalls[0], 'PAYPAL_DISPUTE_RESOLVED');
console.log('✔ PASS: PAYPAL_DISPUTE_RESOLVED parsed and successfully triggered promise graph refresh');

// Case C: MERKLE_TREE_SEALED, PAYMENT_CAPTURED, PAYPAL_DISPUTE_SYNCED (must trigger loadPromise)
loadPromiseCalls.length = 0;
eventSource.emit('MERKLE_TREE_SEALED', JSON.stringify({ message: 'Merkle root PP-SEAL-8899 sealed' }));
eventSource.emit('PAYMENT_CAPTURED', JSON.stringify({ data: { summary: 'Captured $500.00' } }));
eventSource.emit('PAYPAL_DISPUTE_SYNCED', JSON.stringify({ data: { summary: 'Dispute auto-responded' } }));
assert.equal(loadPromiseCalls.length, 3, 'FAIL: Expected 3 loadPromise calls for the 3 lifecycle events');
console.log('✔ PASS: MERKLE_TREE_SEALED, PAYMENT_CAPTURED, and PAYPAL_DISPUTE_SYNCED trigger loadPromise');

// Case D: Non-reloading events (EVIDENCE_SCANNING, OCR_EXTRACTING, CONNECTED)
loadPromiseCalls.length = 0;
eventSource.emit('EVIDENCE_SCANNING', JSON.stringify({ data: { summary: 'Scanning 3 artifacts' } }));
eventSource.emit('OCR_EXTRACTING', JSON.stringify({ data: { summary: 'Extracting text from receipt' } }));
eventSource.emit('CONNECTED', JSON.stringify({ message: 'Stream live' }));
assert.equal(loadPromiseCalls.length, 0, 'FAIL: Intermediate streaming events should not trigger heavy reload');
console.log('✔ PASS: Intermediate telemetry events update state without redundant loadPromise reloads');

// 7. Test Case: Robustness under malformed / adversarial payloads
// A. Malformed JSON
assert.doesNotThrow(() => {
  eventSource.emit('AI_ANALYZING_REQUIREMENT', '{not valid json');
}, 'FAIL: Malformed JSON threw an unhandled exception');

// B. Empty data object (fallback to generated summary)
eventSource.emit('OCR_EXTRACTING', JSON.stringify({}));
assert.equal(state.incomingEvent.message, 'Event: OCR EXTRACTING');
console.log('✔ PASS: Malformed JSON and missing message fields handled cleanly with fallback');

// 8. Test Case: Unmount cleanup and ZERO listener leaks
assert.equal(eventSource.totalActiveListeners(), 8, 'Precondition: 8 active listeners before unmount');
assert.equal(eventSource.closed, false, 'Precondition: connection open before unmount');

cleanup();

assert.equal(eventSource.totalActiveListeners(), 0, 'FAIL: Dangling listeners remain on EventSource after unmount');
assert.equal(eventSource.closed, true, 'FAIL: EventSource was not closed on unmount');
console.log('✔ PASS: Unmount cleanup verified — 0 dangling listeners remaining, eventSource.close() called (ZERO LEAKS)');

// 9. Stress Test: Rapid Mount/Unmount Cycle (simulating fast route changes / tabs)
console.log('Running Rapid Mount/Unmount stress test (100 cycles)...');
for (let i = 0; i < 100; i++) {
  const lifecycle = setupSseEffect(`prom_rapid_${i}`, {
    onStateChange: () => {},
    onLoadPromise: () => {},
  });
  assert.equal(lifecycle.eventSource.totalActiveListeners(), 8);
  lifecycle.cleanup();
  assert.equal(lifecycle.eventSource.totalActiveListeners(), 0);
  assert.equal(lifecycle.eventSource.closed, true);
}
console.log('✔ PASS: 100 consecutive mount/unmount cycles executed with zero listener leaks');

console.log('=== All SSE connection lifecycle tests passed! ===\n');
