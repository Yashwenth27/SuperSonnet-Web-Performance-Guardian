// ComplianceAgent AI — Drop-in Performance Monitoring SDK
// This script can be loaded via <script> tag on ANY webpage.
// It passively monitors Web Vitals and JS errors, then posts
// telemetry to the ComplianceAgent backend without ever
// reloading, navigating, or interfering with the host page.

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  const BACKEND = 'http://localhost:8000';
  const SYNC_INTERVAL = 3000;       // batch-sync every 3 s
  const MAX_ERRORS_PER_PAGE = 50;   // cap to avoid flooding
  const ERROR_DEDUP_WINDOW = 5000;  // ignore same error within 5 s

  // ── Internal state ─────────────────────────────────────────
  const metrics = { lcp: null, cls: 0, fid: null, fcp: null, loadTime: null };
  const capturedErrors = [];
  const seenErrorKeys = new Map();   // key → timestamp (for dedup)
  const pageUrl = window.location.href;
  let metricsDirty = false;

  console.log('🛡️ ComplianceAgent AI: Performance Monitoring Active.');

  // ── 1. LCP ────────────────────────────────────────────────
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) {
        metrics.lcp = entries[entries.length - 1].startTime;
        metricsDirty = true;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) { /* unsupported */ }

  // ── 2. CLS ────────────────────────────────────────────────
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          metrics.cls += entry.value;
          metricsDirty = true;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) { /* unsupported */ }

  // ── 3. FID ────────────────────────────────────────────────
  try {
    new PerformanceObserver((list) => {
      const first = list.getEntries()[0];
      if (first) {
        metrics.fid = first.processingStart - first.startTime;
        metricsDirty = true;
      }
    }).observe({ type: 'first-input', buffered: true });
  } catch (_) { /* unsupported */ }

  // ── 4. FCP ────────────────────────────────────────────────
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = entry.startTime;
          metricsDirty = true;
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (_) { /* unsupported */ }

  // ── 5. Page Load Time ─────────────────────────────────────
  window.addEventListener('load', function () {
    setTimeout(function () {
      try {
        var nav = performance.getEntriesByType('navigation')[0];
        metrics.loadTime = nav ? nav.duration : performance.now();
        metricsDirty = true;
      } catch (_) { /* unsupported */ }
    }, 500);
  });

  // ── 6. JS Error Capture (with dedup + cap) ────────────────
  function handleError(msg, source, lineno, colno, stack) {
    if (capturedErrors.length >= MAX_ERRORS_PER_PAGE) return;

    var key = msg + '|' + (source || '') + '|' + lineno;
    var now = Date.now();
    if (seenErrorKeys.has(key) && (now - seenErrorKeys.get(key)) < ERROR_DEDUP_WINDOW) {
      return; // duplicate within window — skip
    }
    seenErrorKeys.set(key, now);

    var errorObj = {
      message: msg,
      source: source || pageUrl,
      lineno: lineno || 0,
      colno: colno || 0,
      stack: stack || null,
      timestamp: new Date().toISOString()
    };
    capturedErrors.push(errorObj);
    pushError(errorObj);
  }

  window.addEventListener('error', function (event) {
    handleError(
      event.message,
      event.filename,
      event.lineno,
      event.colno,
      event.error ? event.error.stack : null
    );
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    handleError(
      reason ? (reason.message || String(reason)) : 'Unhandled promise rejection',
      pageUrl,
      0,
      0,
      reason && reason.stack ? reason.stack : null
    );
  });

  // ── Sync helpers (fire-and-forget, never throw) ───────────
  function pushMetrics() {
    if (!metricsDirty) return;
    metricsDirty = false;

    var payload = {
      url: pageUrl,
      lcp: metrics.lcp,
      cls: metrics.cls,
      fid: metrics.fid,
      fcp: metrics.fcp,
      load_time: metrics.loadTime
    };

    try {
      fetch(BACKEND + '/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () { /* backend offline — silent */ });
    } catch (_) { /* fetch not available */ }
  }

  function pushError(errObj) {
    var payload = {
      url: pageUrl,
      message: errObj.message,
      stack_trace: errObj.stack || ('Error at ' + errObj.source + ':' + errObj.lineno + ':' + errObj.colno),
      browser_info: navigator.userAgent
    };

    try {
      fetch(BACKEND + '/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () { /* backend offline — silent */ });
    } catch (_) { /* fetch not available */ }
  }

  // ── Periodic batch sync (instead of on every observer tick) ─
  setInterval(pushMetrics, SYNC_INTERVAL);
  // Also push once shortly after load
  setTimeout(pushMetrics, 2000);

  // ── Chrome Extension bridge (only when running as extension) ─
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    try {
      chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === 'get_metrics') {
          sendResponse({ metrics: metrics, errors: capturedErrors });
        }
        return true;
      });
    } catch (_) { /* not in extension context */ }
  }

})();
