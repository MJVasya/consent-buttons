/* Consent Buttons — popup logic (MV3, chrome/browser namespace agnostic). */
(() => {
  'use strict';
  const api = (typeof chrome !== 'undefined') ? chrome : browser;
  const $ = (id) => document.getElementById(id);

  const setStatus = (t) => { $('status').textContent = t || ''; };
  const setHint = (t) => { $('hint').textContent = t; };

  async function activeTab() {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0];
  }

  async function send(type, action) {
    const tab = await activeTab();
    if (!tab || !tab.id || !/^https?:\/\//.test(tab.url || '')) {
      const e = new Error('system-page');
      e.code = 'system';
      throw e;
    }
    const msg = action ? { type, action } : { type };
    return api.tabs.sendMessage(tab.id, msg);
  }

  async function run(action) {
    setStatus('Working…');
    try {
      const r = await send('consent-action', action);
      setStatus(r && r.ok ? 'Done ✓' : 'No consent button found on this page.');
    } catch (e) {
      setStatus(e && e.code === 'system'
        ? 'Can’t run here — browser system pages are off-limits.'
        : 'Couldn’t reach the page. Reload it and try again.');
    }
  }

  $('accept').addEventListener('click', () => run('accept'));
  $('reject').addEventListener('click', () => run('reject'));

  // Show a hint about whether a banner was detected.
  (async () => {
    try {
      const st = await send('consent-state');
      setHint(st && st.banner
        ? 'Cookie banner detected on this page.'
        : 'No cookie banner detected on this page.');
    } catch (e) {
      setHint('Open a website, then use the buttons.');
    }
  })();
})();
