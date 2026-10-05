/* QA harness for Consent Buttons content.js.
 *
 * Loads the real test page (cmps.html) + the real content.js into jsdom,
 * patching only layout-dependent browser APIs (getBoundingClientRect /
 * getComputedStyle) that jsdom can't compute, then drives the banner scenarios.
 *
 * Usage:  npm install jsdom && node test/run-tests.js   (from the repo root)
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'test', 'cmps.html'), 'utf8');
const contentJs = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/test/cmps.html?consenttest=1',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});
const { window } = dom;

function hiddenByStyle(el) {
  let n = el;
  while (n && n.nodeType === 1) {
    if (n.style && n.style.display === 'none') return true;
    n = n.parentElement;
  }
  return false;
}

const rect = (w, h) => ({ width: w, height: h, top: 100, left: 100, right: 100 + w, bottom: 100 + h, x: 100, y: 100, toJSON() {} });
window.Element.prototype.getBoundingClientRect = function () {
  return hiddenByStyle(this) ? rect(0, 0) : rect(120, 40);
};

const origGCS = window.getComputedStyle.bind(window);
window.getComputedStyle = function (el) {
  const cs = origGCS(el);
  return new Proxy(cs, {
    get(t, prop) {
      if (prop === 'display') return hiddenByStyle(el) ? 'none' : 'block';
      if (prop === 'visibility') return 'visible';
      if (prop === 'opacity') return '1';
      if (prop === 'position') return (el.style && el.style.position) || 'static';
      const v = t[prop];
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
};

// Inject the extension script under test.
const s = window.document.createElement('script');
s.textContent = contentJs;
window.document.head.appendChild(s);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, cond, extra = '') => {
  results.push([cond ? 'PASS' : 'FAIL', name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '   [' + extra + ']' : ''}`);
};

const logLines = () => window.__testLog.slice();
const pillVisible = () => {
  const host = window.document.getElementById('consent-buttons-host');
  if (!host || !host.shadowRoot) return 'no-host';
  return host.shadowRoot.querySelector('.cb-wrap').style.display !== 'none';
};
async function reset() {
  window.__testHelpers.resetAll();
  window.sessionStorage.clear();
  await sleep(700);
}

(async () => {
  await sleep(600);

  // T1: plain page, no banner → pill must stay hidden
  check('T1 pill hidden with no banner', pillVisible() === false, String(pillVisible()));

  // T2: generic banner B → pill appears → "Essential only" rejects
  window.__testHelpers.showB();
  await sleep(700);
  check('T2 pill visible with banner B', pillVisible() === true, String(pillVisible()));
  const r2 = await window.__consent.rejectEssential();
  await sleep(300);
  check('T2 rejectEssential ok', r2 && r2.ok === true, JSON.stringify(r2));
  check('T2 clicked B:reject', logLines().some((l) => l.startsWith('clicked: B:reject')), logLines().join(' | '));
  await reset();

  // T3: OneTrust banner A → click "Accept all" IN THE PILL (real panel UI path)
  window.__testHelpers.showA();
  await sleep(700);
  const host = window.document.getElementById('consent-buttons-host');
  const acceptBtn = host.shadowRoot.querySelector('[data-act="accept"]');
  acceptBtn.click();
  await sleep(900);
  check('T3 pill Accept-all clicked A:accept', logLines().some((l) => l.startsWith('clicked: A:accept')), logLines().join(' | '));
  check('T3 pill shows Done and hides', acceptBtn.textContent.includes('Done'), acceptBtn.textContent);
  await reset();

  // T4: prefs-only banner C → Customize → uncheck optional → save
  window.__testHelpers.showC();
  await sleep(700);
  const r4 = await window.__consent.rejectEssential();
  await sleep(500);
  const L = logLines();
  const q = (sel) => window.document.querySelector(sel);
  check('T4 opened prefs (C:prefs)', L.some((l) => l.startsWith('clicked: C:prefs')), L.join(' | '));
  check('T4 analytics unchecked', q('[data-log="C:cb-analytics"]').checked === false);
  check('T4 marketing unchecked', q('[data-log="C:cb-marketing"]').checked === false);
  check('T4 necessary untouched', q('[data-log="C:cb-necessary"]').checked === true);
  check('T4 save clicked (C:save)', L.some((l) => l.startsWith('clicked: C:save')), L.join(' | '));
  check('T4 dialog hidden after save', q('#prefsDialog').style.display === 'none');
  check('T4 result ok', r4 && r4.ok === true, JSON.stringify(r4));
  await reset();

  // T5: Cookiebot banner D → reject via known selector
  window.__testHelpers.showD();
  await sleep(700);
  const r5 = await window.__consent.rejectEssential();
  await sleep(300);
  check('T5 clicked D:reject (known selector)', logLines().some((l) => l.startsWith('clicked: D:reject')), logLines().join(' | ') + ' ' + JSON.stringify(r5));
  await reset();

  // T6: after reset, pill hidden again
  check('T6 pill hidden after reset', pillVisible() === false, String(pillVisible()));

  // T7: rejectAll on generic banner B → direct reject click
  window.__testHelpers.showB();
  await sleep(700);
  const r7 = await window.__consent.rejectAll();
  await sleep(300);
  check('T7 rejectAll ok on banner B', r7 && r7.ok === true, JSON.stringify(r7));
  check('T7 clicked B:reject', logLines().some((l) => l.startsWith('clicked: B:reject')), logLines().join(' | '));
  await reset();

  // T8: rejectAll on prefs-only banner C → honestly reports no reject button
  window.__testHelpers.showC();
  await sleep(700);
  const r8 = await window.__consent.rejectAll();
  await sleep(300);
  check('T8 rejectAll fails gracefully on banner C', r8 && r8.ok === false, JSON.stringify(r8));
  check('T8 did not touch prefs dialog', !logLines().some((l) => l.startsWith('clicked: C:')), logLines().join(' | ') || '(empty log)');
  await reset();

  // T9: pill exposes all three action buttons
  window.__testHelpers.showB();
  await sleep(700);
  const acts = [...window.document.getElementById('consent-buttons-host')
    .shadowRoot.querySelectorAll('button[data-act]')].map((b) => b.getAttribute('data-act'));
  check('T9 pill has accept/reject/essential/hide', ['accept', 'reject', 'essential', 'hide'].every((a) => acts.includes(a)), acts.join(','));
  await reset();

  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
