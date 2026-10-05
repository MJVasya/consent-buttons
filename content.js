/* Consent Buttons — content script.
 * Universal MV3: Chrome, Edge, Brave, Firefox, Safari (via converter).
 * No network calls, no analytics, no data leaves the device. Everything below
 * runs locally: it finds the site's own cookie-consent buttons and clicks them.
 */
(() => {
'use strict';

const TOP = window === window.top;
const TEST = new URLSearchParams(location.search).has('consenttest');
const HAS_API = typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.onMessage;

/* ------------------------------- text data ------------------------------ */
/* Normalized (lowercased, single-spaced) button labels, many languages.   */
const WORDS = {
  accept: [
    'accept all', 'accept all cookies', 'accept cookies', 'accept', 'agree',
    'agree and continue', 'allow all', 'allow all cookies', 'ok', 'okay',
    'got it', 'i agree', 'i accept', 'consent',
    'alle akzeptieren', 'akzeptieren', 'alle zulassen', 'zustimmen', 'einverstanden',
    'tout accepter', 'accepter', "j'accepte", "d'accord",
    'aceptar todo', 'aceptar todas', 'aceptar', 'de acuerdo',
    'accetta tutto', 'accetta', 'accetto',
    'alles accepteren', 'accepteren', 'accepteer alles', 'akkoord',
    'aceitar tudo', 'aceitar', 'concordo',
    'akceptuj wszystkie', 'akceptuj', 'zgadzam się',
    'acceptera alla', 'acceptera', 'godkänn',
    'accepter alle', 'accepter',
    'godta alle', 'godta', 'aksepter alle',
    'hyväksy kaikki', 'hyväksy',
    'принять все', 'принять', 'согласен',
    'tümünü kabul et', 'kabul et',
    'αποδοχή όλων', 'αποδοχή',
    'összes elfogadása', 'elfogadom',
    'přijmout vše', 'přijmout', 'prijať všetko',
    'acceptă tot', 'accept',
    '全部接受', '接受全部', '接受', '同意',
    'すべて許可', '同意する', '承諾',
    '모두 수락', '수락', '동의'
  ],
  reject: [
    'reject all', 'reject all cookies', 'reject', 'decline', 'decline all',
    'deny all', 'deny', 'refuse', 'refuse all',
    'essential only', 'necessary only', 'only necessary', 'only essential',
    'reject non-essential', 'reject optional',
    'alle ablehnen', 'ablehnen', 'nur notwendige', 'nur essenzielle',
    'tout refuser', 'refuser', 'décliner', 'uniquement nécessaires', 'nécessaires uniquement',
    'rechazar todo', 'rechazar', 'solo necesarias', 'solo esenciales',
    'rifiuta tutto', 'rifiuta', 'solo necessari',
    'alles weigeren', 'weigeren', 'alleen noodzakelijk', 'alleen noodzakelijke',
    'rejeitar tudo', 'rejeitar', 'apenas necessários',
    'odrzuć wszystkie', 'odrzuć', 'tylko niezbędne',
    'avböj alla', 'neka alla', 'endast nödvändiga',
    'afvis alle', 'afvis', 'kun nødvendige',
    'avvis alle', 'avvis', 'kun nødvendige',
    'hylkää kaikki', 'hylkää', 'vain välttämättömät',
    'отклонить все', 'отклонить', 'только необходимые',
    'tümünü reddet', 'reddet', 'yalnızca gerekli',
    'απόρριψη όλων', 'απόρριψη', 'μόνο απαραίτητα',
    'az összes elutasítása', 'elutasítom', 'csak szükséges',
    'odmítnout vše', 'odmítnout', 'pouze nezbytné',
    'respinge tot', 'respinge', 'doar necesare',
    '全部拒绝', '拒绝全部', '拒绝', '仅必要', '仅限必要',
    'すべて拒否', '拒否', '必須のみ',
    '모두 거부', '거부', '필수만'
  ],
  prefs: [ /* open the "customize / manage preferences" view */
    'manage', 'customize', 'customise', 'settings', 'preferences',
    'cookie settings', 'cookie preferences', 'details', 'learn more', 'options',
    'manage preferences', 'manage cookies', 'choose', 'select',
    'einstellungen', 'anpassen', 'details', 'mehr erfahren', 'auswählen',
    'personnaliser', 'paramètres', 'préférences', 'en savoir plus',
    'configurar', 'personalizar', 'ajustes', 'más información', 'elegir',
    'personalizza', 'impostazioni', 'preferenze',
    'instellingen', 'aanpassen', 'voorkeuren',
    'personalizar', 'configurações', 'preferências',
    'dostosuj', 'ustawienia',
    'настроить', 'настройки',
    '设置', '管理', '自定义', '了解更多',
    '設定', 'カスタマイズ', '詳細',
    '설정', '맞춤설정', '자세히'
  ],
  save: [ /* confirm button inside a preferences view */
    'save', 'confirm', 'save settings', 'save my preferences', 'save selection',
    'save choices', 'apply', 'apply selection', 'confirm choices', 'confirm my choices',
    'speichern', 'auswahl speichern', 'einstellungen speichern', 'bestätigen',
    'enregistrer', 'sauvegarder', 'confirmer',
    'guardar', 'confirmar', 'guardar selección',
    'salva', 'conferma', 'salva preferenze',
    'opslaan', 'bevestigen',
    'salvar', 'guardar', 'confirmar',
    'zapisz', 'potwierdź',
    'сохранить', 'подтвердить',
    '保存', '确认',
    '保存', '確認',
    '저장', '확인'
  ]
};

/* Known consent-management platforms: [banner, accept, reject, prefs, save] */
const KNOWN = [
  { banner: ['#onetrust-banner-sdk', '#onetrust-consent-sdk'],
    accept: ['#onetrust-accept-btn-handler'], reject: ['#onetrust-reject-all-handler'],
    prefs: ['#onetrust-pc-btn-handler'] },
  { banner: ['#CybotCookiebotDialog'],
    accept: ['#CybotCookiebotDialogBodyButtonAccept'], reject: ['#CybotCookiebotDialogBodyButtonDecline'],
    prefs: ['#CybotCookiebotDialogBodyButtonDetails'] },
  { banner: ['.qc-cmp2-container'],
    accept: ['.qc-cmp2-summary-buttons button[mode="primary"]'],
    reject: ['.qc-cmp2-summary-buttons button[mode="secondary"]'] },
  { banner: ['#didomi-host'],
    accept: ['#didomi-notice-agree-button'], reject: ['#didomi-notice-disagree-button'],
    prefs: ['#didomi-notice-learn-more-button'] },
  { banner: ['#usercentrics-root'],
    accept: ['[data-testid="uc-accept-all-button"]'], reject: ['[data-testid="uc-deny-all-button"]'],
    prefs: ['[data-testid="uc-customize-button"]'], save: ['[data-testid="uc-save-button"]'] },
  { banner: ['.osano-cm-window'],
    accept: ['.osano-cm-accept-all'], reject: ['.osano-cm-deny-all'],
    prefs: ['.osano-cm-manage'], save: ['.osano-cm-save'] },
  { banner: ['#cmplz-cookiebanner-container'],
    accept: ['#cmplz-accept', '.cmplz-accept'], reject: ['#cmplz-deny', '.cmplz-deny'],
    prefs: ['#cmplz-view-preferences', '.cmplz-view-preferences'],
    save: ['#cmplz-save-preferences', '.cmplz-save-preferences'] },
  { banner: ['.fc-consent-root'],
    accept: ['.fc-cta-consent'], reject: ['.fc-cta-do-not-consent'],
    prefs: ['.fc-cta-manage-settings'] },
  { banner: ['#sp_message_container'],
    accept: ['.sp_choice_type_11'], reject: ['.sp_choice_type_13'],
    prefs: ['.sp_choice_type_12'] },
  { banner: ['#cookie-law-info-bar'],
    accept: ['#cookie_action_close_header'], reject: ['#cookie_action_close_header_reject'],
    prefs: ['.cli_settings_button'] }
];
const KNOWN_BANNER_SEL = KNOWN.flatMap((k) => k.banner);
const KNOWN_SEL = { accept: [], reject: [], prefs: [], save: [] };
for (const k of KNOWN) for (const kind of ['accept', 'reject', 'prefs', 'save'])
  if (k[kind]) KNOWN_SEL[kind].push(...k[kind]);

/* Labels that mark a cookie category as mandatory (never toggle these off). */
const NECESSARY_RX = /necessary|essenti|required|strictly|obligat|notwendig|erforderlich|n[eé]cessaire|necesari|obbligatori|noodzakelijk|vereist|niezb[eę]dn|n[oö]dv[eä]ndig|v[aä]ltt[aä]m[aä]t|nezbytn|neophodn|nepieciešam|必须|必要|필수|必須/;

/* Words that suggest a cookie/consent context (container heuristic). */
const COOKIE_RX = /cookie|consent|privacy|gdpr|tracking|datenschutz|confidentialit|politica|dati|traking|використання файлів/i;

/* -------------------------------- helpers ------------------------------- */
const norm = (s) => (s || '').replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function isVisible(el) {
  if (!el || el.nodeType !== 1) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width >= 2 && r.height >= 2;
}

function labelOf(el) {
  if (!el || el.nodeType !== 1) return '';
  const tag = el.tagName;
  if (tag === 'INPUT') return el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '';
  return el.getAttribute('aria-label') || el.textContent || '';
}

/* True if el sits inside a cookie-consent container (not just any button). */
function inBanner(el) {
  let n = el.parentElement;
  for (let i = 0; i < 5 && n; i++) {
    if (n.matches) {
      for (const s of KNOWN_BANNER_SEL) {
        try { if (n.matches(s)) return true; } catch (e) { /* bad selector */ }
      }
    }
    const t = norm(n.textContent || '');
    if (t.length > 25 && t.length < 4000 && COOKIE_RX.test(t)) return true;
    n = n.parentElement;
  }
  return false;
}

function fixedAncestor(el) {
  let n = el;
  for (let i = 0; i < 6 && n; i++) {
    const p = getComputedStyle(n).position;
    if (p === 'fixed' || p === 'sticky') return true;
    n = n.parentElement;
  }
  return false;
}

/* Score a text-matched button. Short single words need banner/fixed context. */
function scoreCandidate(el, t) {
  const distinctive = /\s/.test(t) || t.length > 7;
  let s = distinctive ? 2 : 0;
  if (inBanner(el)) s += 2;
  if (fixedAncestor(el)) s += 1;
  return s;
}

const CLICKABLE = 'button, input[type="button"], input[type="submit"], a[href], [role="button"]';

function textCandidates(kind) {
  const list = WORDS[kind];
  const out = [];
  const els = document.querySelectorAll(CLICKABLE);
  for (const el of els) {
    if (!isVisible(el)) continue;
    const t = norm(labelOf(el));
    if (!t || t.length > 60) continue;
    if (kind === 'accept' && WORDS.prefs.includes(t)) continue; /* settings ≠ accept */
    if (kind === 'prefs' && WORDS.accept.includes(t)) continue;
    let score = -1;
    if (list.includes(t)) {
      score = scoreCandidate(el, t);
    } else {
      const hit = list.find((w) => w.length >= 6 && t.includes(w));
      if (hit) score = scoreCandidate(el, t) - 0.5;
    }
    if (score >= 2) out.push({ el, score, t });
  }
  return out;
}

function best(cands) {
  let top = null;
  for (const c of cands) {
    if (!top || c.score > top.score ||
        (c.score === top.score && area(c.el) > area(top.el))) top = c;
  }
  return top;
}
function area(el) {
  const r = el.getBoundingClientRect();
  return r.width * r.height;
}

function clickEl(el) {
  try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) { /* noop */ }
  el.click();
}

function clickFirstVisible(selectors) {
  for (const s of selectors) {
    let el = null;
    try { el = document.querySelector(s); } catch (e) { continue; }
    if (el && isVisible(el)) { clickEl(el); return true; }
  }
  return false;
}

/* ------------------------------ core actions ---------------------------- */
async function acceptAll() {
  if (clickFirstVisible(KNOWN_SEL.accept)) return { ok: true, how: 'cmp-accept' };
  const c = best(textCandidates('accept'));
  if (c) { clickEl(c.el); return { ok: true, how: 'text-accept', label: c.t }; }
  return { ok: false };
}

/* The label text belonging to THIS toggle only — never the parent container's
 * text, which would include sibling options (e.g. a "Strictly Necessary"
 * label next to "Analytics" would otherwise make everything look mandatory). */
function ownLabel(el) {
  const aria = norm(el.getAttribute('aria-label') || '');
  if (aria) return aria;
  if (el.id) {
    try {
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l) return norm(l.textContent);
    } catch (e) { /* noop */ }
  }
  const wrap = el.closest('label');
  if (wrap) return norm(wrap.textContent);
  const lb = el.getAttribute('aria-labelledby');
  if (lb) {
    const t = lb.split(/\s+/).map((id) => {
      try {
        const n = document.getElementById(id);
        return n ? norm(n.textContent) : '';
      } catch (e) { return ''; }
    }).join(' ').trim();
    if (t) return t;
  }
  const p = el.parentElement;
  if (p) {
    let t = norm(p.textContent);
    /* Strip text that belongs to sibling toggles sharing the same parent. */
    p.querySelectorAll('input[type="checkbox"], [role="switch"], [role="checkbox"]')
      .forEach((o) => {
        if (o === el) return;
        const ow = o.closest('label');
        const ot = norm((ow ? ow.textContent : o.getAttribute('aria-label')) || '');
        if (ot) t = t.split(ot).join(' ');
      });
    return t.slice(0, 200);
  }
  return '';
}

/* Uncheck every optional (non-necessary) toggle/checkbox currently on. */
function uncheckOptional() {
  const boxes = document.querySelectorAll('input[type="checkbox"], [role="switch"], [role="checkbox"]');
  let n = 0;
  for (const b of boxes) {
    if (!isVisible(b) || b.disabled) continue;
    const on = b.type === 'checkbox' ? b.checked : b.getAttribute('aria-checked') === 'true';
    if (!on) continue;
    if (NECESSARY_RX.test(ownLabel(b))) continue;
    b.click();
    n++;
  }
  return n;
}

async function rejectEssential() {
  /* 1. Known CMP "reject all" buttons. */
  if (clickFirstVisible(KNOWN_SEL.reject)) return { ok: true, how: 'cmp-reject' };
  /* 2. Text-matched reject buttons. */
  let c = best(textCandidates('reject'));
  if (c) { clickEl(c.el); return { ok: true, how: 'text-reject', label: c.t }; }
  /* 3. Open preferences, then reject-all / uncheck-optional / save. */
  const p = best(textCandidates('prefs'));
  if (p) {
    clickEl(p.el);
    await wait(1500);
    if (clickFirstVisible(KNOWN_SEL.reject)) return { ok: true, how: 'prefs-cmp-reject' };
    c = best(textCandidates('reject'));
    if (c) { clickEl(c.el); return { ok: true, how: 'prefs-text-reject', label: c.t }; }
    const toggled = uncheckOptional();
    await wait(400);
    if (clickFirstVisible(KNOWN_SEL.save)) return { ok: true, how: 'prefs-cmp-save', toggled };
    const s = best(textCandidates('save'));
    if (s) { clickEl(s.el); return { ok: true, how: 'prefs-text-save', label: s.t, toggled }; }
    return { ok: false, how: 'prefs-no-save', toggled };
  }
  return { ok: false };
}

/* --------------------------- banner + floating UI ----------------------- */
function findBanner() {
  for (const s of KNOWN_BANNER_SEL) {
    let el = null;
    try { el = document.querySelector(s); } catch (e) { continue; }
    if (el && isVisible(el)) return true;
  }
  const cands = textCandidates('accept').concat(textCandidates('reject'));
  return cands.some((c) => c.score >= 3);
}

let panelHost = null, panelVisible = false;

function ensurePanel() {
  if (panelHost) return panelHost;
  panelHost = document.createElement('div');
  panelHost.id = 'consent-buttons-host';
  const shadow = panelHost.attachShadow({ mode: 'open' });
  shadow.innerHTML =
    '<style>' +
    '.cb-wrap{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);' +
    'z-index:2147483647;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}' +
    '.cb-bar{display:flex;align-items:center;gap:8px;background:rgba(28,28,30,.96);' +
    'color:#fff;padding:8px 10px 8px 14px;border-radius:999px;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);}' +
    '.cb-label{font-size:12px;opacity:.75;white-space:nowrap;}' +
    '.cb-bar button{border:0;border-radius:999px;padding:8px 14px;font-size:13px;' +
    'font-weight:700;cursor:pointer;white-space:nowrap;}' +
    '.cb-accept{background:#30d158;color:#fff;}' +
    '.cb-reject{background:#48484a;color:#fff;}' +
    '.cb-x{background:transparent;color:#aaa;font-size:16px;padding:8px 10px;}' +
    '.cb-bar button:active{transform:scale(.96);}' +
    '</style>' +
    '<div class="cb-wrap" style="display:none"><div class="cb-bar">' +
    '<span class="cb-label">🍪 Cookies?</span>' +
    '<button class="cb-accept" data-act="accept">Accept all</button>' +
    '<button class="cb-reject" data-act="reject">Essential only</button>' +
    '<button class="cb-x" data-act="hide" aria-label="Dismiss">×</button>' +
    '</div></div>';
  const wrap = shadow.querySelector('.cb-wrap');
  shadow.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const act = b.getAttribute('data-act');
      if (act === 'hide') {
        try { sessionStorage.setItem('cb-dismissed', '1'); } catch (e) { /* noop */ }
        wrap.style.display = 'none';
        panelVisible = false;
        return;
      }
      b.textContent = '…';
      const r = act === 'accept' ? await acceptAll() : await rejectEssential();
      b.textContent = r.ok ? 'Done ✓' : 'Not found';
      try { sessionStorage.setItem('cb-done', '1'); } catch (e) { /* noop */ }
      setTimeout(() => { wrap.style.display = 'none'; panelVisible = false; }, 1100);
    });
  });
  document.documentElement.appendChild(panelHost);
  return panelHost;
}

function dismissed() {
  try {
    return sessionStorage.getItem('cb-dismissed') === '1' ||
           sessionStorage.getItem('cb-done') === '1';
  } catch (e) { return false; }
}

function refreshPanel() {
  if (!TOP) return;
  const host = ensurePanel();
  const wrap = host.shadowRoot.querySelector('.cb-wrap');
  const show = !dismissed() && findBanner();
  wrap.style.display = show ? '' : 'none';
  panelVisible = show;
}

let refreshTimer = null;
function refreshSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshPanel, 350);
}

if (TOP && document.documentElement) {
  refreshSoon();
  new MutationObserver(refreshSoon).observe(document.documentElement, {
    childList: true, subtree: true
  });
}

/* ------------------------------- messaging ------------------------------ */
if (HAS_API) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== 'string') return false;
    if (msg.type === 'consent-state') {
      if (TOP) sendResponse({ banner: findBanner() });
      return true;
    }
    if (msg.type === 'consent-action') {
      const run = msg.action === 'accept' ? acceptAll() : rejectEssential();
      run.then((r) => {
        refreshSoon();
        if (TOP) sendResponse(r);
      });
      return true;
    }
    return false;
  });
}

/* Test hook: only exposed on ?consenttest=1 pages (dev/QA only). */
if (TEST) {
  window.__consent = { acceptAll, rejectEssential, banner: findBanner, textCandidates };
}
})();
