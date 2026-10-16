#!/usr/bin/env node
/*
 * Tests for src-web/bb-app-update.js (no dependencies, no device).
 * Run: node scripts/test-app-update.js
 *
 * Part 1: the pure core (compareSemver, evaluate, the 3 day dismissal rule, the
 *         24 h offline cache) with a fake clock.
 * Part 2: the real script booted as an "app" in a tiny fake browser (fake DOM,
 *         fake localStorage, fake Capacitor plugins, fake fetch, fake clock) to
 *         check what the user actually sees: nothing / soft card / force screen,
 *         Later + 3 days, a newer latest, fail open, offline cache, back button.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'src-web', 'bb-app-update.js');
const SRC = fs.readFileSync(FILE, 'utf8');

const failures = [];
let checks = 0;
function assert(ok, msg) { checks += 1; if (!ok) failures.push(msg); return ok; }
function eq(a, b, msg) { return assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

/* ------------------------------------------------------------ part 1: core */

const core = (() => {
  const sb = { window: { IS_BODYBANK_APP: false }, module: { exports: {} } };
  vm.runInNewContext(SRC, sb, { filename: FILE });
  return sb.module.exports;
})();

eq(core.compareSemver('1.0.10', '1.0.9'), 1, '1.0.10 > 1.0.9');
eq(core.compareSemver('1.10', '1.9'), 1, '1.10 > 1.9');
eq(core.compareSemver('1.10.0', '1.9.9'), 1, '1.10.0 > 1.9.9');
eq(core.compareSemver('1.8.7 (117)', '1.8.7'), 0, 'build suffix ignored');
eq(core.compareSemver('v1.2.3', '1.2.3'), 0, 'leading v');
eq(core.compareSemver('1.0', '1.0.0'), 0, '1.0 == 1.0.0');
eq(core.compareSemver('junk', '1.0.0'), 0, 'garbage compares as 0');
eq(core.parseSemver('junk'), null, 'garbage → null');
eq(core.parseSemver('  1.2  '), [1, 2, 0], 'whitespace');

const CFG = {
  enabled: true,
  ios: { latest_version: '1.0.10', min_supported_version: '1.0.6', force: false, app_store_id: '6808102656', store_url: 'https://apps.apple.com/app/id6808102656', release_notes: '' },
  android: { latest_version: '1.8.7', min_supported_version: '1.8.2', force: false, package: 'com.bodybank.app', store_url: 'https://play.google.com/store/apps/details?id=com.bodybank.app', release_notes: '' }
};
eq(core.evaluate('ios', '1.0.5', CFG).status, 'force', 'below min → force');
eq(core.evaluate('ios', '1.0.8', CFG).status, 'soft', 'below latest → soft');
eq(core.evaluate('ios', '1.0.10', CFG).status, 'ok', 'equal → ok');
eq(core.evaluate('ios', 'nope', CFG).status, 'ok', 'garbage → ok');
eq(core.evaluate('android', '1.8.6', Object.assign({}, CFG, { android: Object.assign({}, CFG.android, { force: true }) })).status, 'force', 'force flag');

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 16, 6, 0, 0);
assert(core.shouldShowSoft(null, '1.0.10', T0), 'never dismissed → show');
assert(!core.shouldShowSoft({ version: '1.0.10', at: T0 }, '1.0.10', T0 + 1000), 'just dismissed → hide');
assert(!core.shouldShowSoft({ version: '1.0.10', at: T0 }, '1.0.10', T0 + 3 * DAY - 1), 'just under 3 days → hide');
assert(core.shouldShowSoft({ version: '1.0.10', at: T0 }, '1.0.10', T0 + 3 * DAY), '3 days → show again');
assert(core.shouldShowSoft({ version: '1.0.10', at: T0 }, '1.0.11', T0 + 1000), 'newer latest → show at once');
assert(!core.shouldShowSoft({ version: '1.0.11', at: T0 }, '1.0.10', T0 + 1000), 'older latest than dismissed → hide');
assert(core.shouldShowSoft({ version: '1.0.10', at: 'x' }, '1.0.10', T0), 'corrupt dismissal → show');
assert(core.shouldShowSoft('garbage', '1.0.10', T0), 'non object dismissal → show');

assert(core.cacheUsable({ at: T0, data: CFG }, T0 + DAY - 1), 'cache under 24 h usable');
assert(!core.cacheUsable({ at: T0, data: CFG }, T0 + DAY), 'cache at 24 h stale');
assert(!core.cacheUsable({ at: T0, data: { enabled: false } }, T0 + 1), 'disabled cache unusable');
assert(!core.cacheUsable({ at: T0 + 5000, data: CFG }, T0), 'cache from the future unusable');
assert(!core.cacheUsable(null, T0), 'no cache');

/* ------------------------------------------------------------ part 2: fake app */

// Minimal DOM: enough for createElement / getElementById / querySelector(All) /
// classList / innerHTML with data-act buttons, getComputedStyle and click events.
function makeDom() {
  const byId = new Map();
  class El {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.attrs = {}; this.children = []; this.parentNode = null; this.style = {}; this.hidden = false; this._html = ''; this.listeners = {}; this.classes = new Set(); this.id = ''; }
    get classList() { const c = this.classes; return { add: (x) => c.add(x), remove: (x) => c.delete(x), contains: (x) => c.has(x) }; }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') { this.id = String(v); byId.set(this.id, this); } }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    appendChild(c) { c.parentNode = this; this.children.push(c); if (c.id) byId.set(c.id, c); return c; }
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; if (c.id) byId.delete(c.id); return c; }
    set innerHTML(h) { this._html = h; }
    get innerHTML() { return this._html; }
    get textContent() { return this._html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
    set textContent(t) { this._html = String(t); }
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
    getClientRects() { return this.isConnected() && !this.hidden ? [1] : []; }
    getBoundingClientRect() { return { top: 700, bottom: 770, left: 0, right: 390, width: 390, height: 70 }; }
    isConnected() { let n = this; while (n) { if (n === doc.body || n === doc.head) return true; n = n.parentNode; } return false; }
    querySelector(sel) {
      const m = /^\[data-act="([^"]+)"\]$/.exec(sel) || /^\.(bbau-offline)$/.exec(sel);
      if (m && /data-act/.test(sel)) return this._html.includes('data-act="' + m[1] + '"') ? fakeButton(this, m[1]) : null;
      if (m) return this._offline || (this._offline = { hidden: true });
      return null;
    }
    focus() {}
    blur() {}
    click(act) { (this.listeners.click || []).forEach((fn) => fn({ target: fakeButton(this, act) })); }
  }
  function fakeButton(host, act) { return { closest: (s) => (s === '[data-act]' || s === '[data-act="' + act + '"]' ? { getAttribute: () => act } : null), focus() {} }; }
  const doc = {
    readyState: 'loading',
    listeners: {},
    head: new El('head'),
    body: new El('body'),
    activeElement: null,
    createElement: (t) => new El(t),
    getElementById: (id) => byId.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    fire(t) { (this.listeners[t] || []).forEach((fn) => fn()); }
  };
  return { doc, El, byId };
}

function makeStorage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

// Boots the script in a fresh fake app. Returns handles to drive and inspect it.
async function bootApp(opts) {
  const o = Object.assign({ platform: 'ios', version: '1.0.10', response: CFG, now: T0, storage: null, appPlugin: true, appUpdate: null }, opts || {});
  const { doc } = makeDom();
  let now = o.now;
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }
  const events = [];
  const opened = [];
  const appListeners = {};
  const removed = [];
  let response = o.response;
  let fetches = 0;
  const win = {
    IS_BODYBANK_APP: true,
    API_BASE: 'https://www.bodybank.fit',
    innerHeight: 844,
    Capacitor: {
      getPlatform: () => o.platform,
      Plugins: {
        App: o.appPlugin ? {
          getInfo: async () => ({ version: o.version, build: '1' }),
          addListener: (name, fn) => {
            (appListeners[name] = appListeners[name] || []).push(fn);
            const h = { remove: () => { removed.push(name); appListeners[name] = appListeners[name].filter((f) => f !== fn); } };
            return Promise.resolve(h);
          }
        } : undefined,
        AppUpdate: o.appUpdate || { openAppStore: async (x) => { opened.push(x); } }
      }
    },
    gtag: (kind, name, params) => events.push({ name, params }),
    open: (url) => { opened.push(url); return null; },
    addEventListener: () => {},
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' })
  };
  const sb = {
    window: win,
    document: doc,
    navigator: { onLine: true },
    location: { pathname: o.path || '/', href: '' },
    localStorage: o.storage || makeStorage(),
    console: { log() {}, warn() {} },
    Date: FakeDate,
    setTimeout, clearTimeout,
    setInterval: () => 1, clearInterval: () => {},
    requestAnimationFrame: (fn) => fn(),
    Promise,
    AbortController,
    JSON, Math, Number, String, Array, Object, RegExp, Error, isFinite,
    fetch: async () => {
      fetches += 1;
      if (response instanceof Error) throw response;
      if (response && response.__status) return { ok: false, status: response.__status, json: async () => ({}) };
      if (response === 'badjson') return { ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } };
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(response)) };
    }
  };
  vm.runInNewContext(SRC, sb, { filename: FILE });
  doc.fire('DOMContentLoaded');
  await settle();
  return {
    win, doc, sb, events, opened, appListeners, removed,
    get fetches() { return fetches; },
    setNow: (t) => { now = t; },
    setResponse: (r) => { response = r; },
    card: () => { const c = doc.getElementById('bb-app-update-card'); return c && !c.hidden && c.isConnected() ? c : null; },
    force: () => { const f = doc.getElementById('bb-app-force'); return f && f.isConnected() ? f : null; },
    resume: async () => { (appListeners.resume || []).forEach((fn) => fn()); await settle(); }
  };
}
function settle() { return new Promise((r) => setTimeout(r, 15)); }

async function part2() {
  // iOS on latest → nothing
  let a = await bootApp({ version: '1.0.10' });
  assert(!a.card() && !a.force(), 'iOS on latest: nothing shown');
  assert(a.events.some((e) => e.name === 'app_update_check' && e.params.status === 'ok'), 'check event with status ok');

  // latest 1.0.11 → soft card; Later hides it; +3 days → back; latest 1.0.12 → at once
  const store = makeStorage();
  const v11 = JSON.parse(JSON.stringify(CFG)); v11.ios.latest_version = '1.0.11'; v11.ios.release_notes = 'Coach Mode is here.';
  a = await bootApp({ version: '1.0.10', response: v11, storage: store });
  assert(a.card(), 'soft card shown when below latest');
  assert(a.card() && /A new version is ready/.test(a.card().textContent), 'soft card title');
  assert(a.card() && /Coach Mode is here\./.test(a.card().textContent), 'soft card shows release notes');
  assert(a.card() && !/[–—]/.test(a.card().textContent), 'no dashes in soft card copy');
  assert(a.events.some((e) => e.name === 'app_update_prompt_shown' && e.params.type === 'soft'), 'prompt_shown soft');
  a.card().click('later');
  assert(!a.card(), 'Later hides the card');
  const dismissed = JSON.parse(store.getItem('bb_update_dismissed'));
  eq(dismissed && dismissed.version, '1.0.11', 'dismissal stores latest version');
  assert(a.events.some((e) => e.name === 'app_update_dismissed'), 'dismissed event');

  a = await bootApp({ version: '1.0.10', response: v11, storage: store, now: T0 + DAY });
  assert(!a.card(), 'still hidden one day later');
  a = await bootApp({ version: '1.0.10', response: v11, storage: store, now: T0 + 3 * DAY + 1000 });
  assert(a.card(), 'back after 3 days');
  const v12 = JSON.parse(JSON.stringify(v11)); v12.ios.latest_version = '1.0.12';
  a = await bootApp({ version: '1.0.10', response: v12, storage: store, now: T0 + 1000 });
  assert(a.card(), 'newer latest shows immediately despite dismissal');

  // Update on iOS opens the App Store page for the configured id
  a.card().click('update');
  await settle();
  eq(a.opened[0], { appId: '6808102656' }, 'iOS update opens App Store id6808102656');
  assert(a.events.some((e) => e.name === 'app_update_clicked' && e.params.type === 'soft'), 'clicked event');

  // min 1.0.11 → force screen, not dismissible, back blocked, button opens store
  const min11 = JSON.parse(JSON.stringify(v11)); min11.ios.min_supported_version = '1.0.11';
  a = await bootApp({ version: '1.0.10', response: min11 });
  assert(a.force(), 'force screen when below minimum');
  assert(!a.card(), 'no soft card under the force screen');
  assert(a.force() && /Update required/.test(a.force().textContent) && /no longer supported/.test(a.force().textContent), 'force copy');
  assert(a.force() && /Bodybank%20logo\.png/.test(a.force().innerHTML), 'force screen uses the real logo');
  assert(a.force() && !/data-act="later"/.test(a.force().innerHTML), 'force screen has no Later');
  assert((a.appListeners.backButton || []).length === 1, 'back button captured while forced');
  a.force().click('force-update');
  await settle();
  eq(a.opened[a.opened.length - 1], { appId: '6808102656' }, 'Update now opens the App Store');
  // force re-checks on resume even inside the throttle; admin lowers min → force goes away
  const f0 = a.fetches;
  a.setResponse(CFG);
  await a.resume();
  assert(a.fetches === f0 + 1, 'force check re-runs on resume');
  assert(!a.force(), 'force screen removed once no longer required');
  assert(a.removed.includes('backButton'), 'back button released');

  // soft resume is throttled to once per 30 minutes
  a = await bootApp({ version: '1.0.10', response: v11 });
  const f1 = a.fetches;
  a.setNow(T0 + 10 * 60 * 1000); await a.resume();
  eq(a.fetches, f1, 'resume inside 30 min does not refetch');
  a.setNow(T0 + 31 * 60 * 1000); await a.resume();
  eq(a.fetches, f1 + 1, 'resume after 30 min refetches');

  // fail open: network error, 500, bad JSON, enabled:false, unknown version, no App plugin
  for (const [label, resp] of [['network error', new Error('offline')], ['500', { __status: 500 }], ['bad JSON', 'badjson'], ['enabled false', { enabled: false }]]) {
    a = await bootApp({ version: '1.0.1', response: resp });
    assert(!a.card() && !a.force(), 'fail open on ' + label);
  }
  a = await bootApp({ version: '1.0.1', response: new Error('offline') });
  assert(a.events.some((e) => e.name === 'app_update_check_failed'), 'check_failed event');
  a = await bootApp({ version: 'unknown', response: min11 });
  assert(!a.card() && !a.force(), 'unparseable installed version → nothing');
  a = await bootApp({ version: '1.0.1', response: min11, appPlugin: false });
  assert(!a.card() && !a.force(), 'no App plugin → nothing');

  // offline cache: soft only, never a new block
  const cached = makeStorage({ bb_app_version_cache: JSON.stringify({ at: T0 - 60 * 1000, data: min11 }) });
  a = await bootApp({ version: '1.0.10', response: new Error('offline'), storage: cached });
  assert(!a.force(), 'offline: cached force never blocks');
  assert(a.card(), 'offline: cached config still shows the soft card');
  const stale = makeStorage({ bb_app_version_cache: JSON.stringify({ at: T0 - 25 * 60 * 60 * 1000, data: v11 }) });
  a = await bootApp({ version: '1.0.10', response: new Error('offline'), storage: stale });
  assert(!a.card(), 'offline: cache older than 24 h ignored');

  // force decided online stays when the device goes offline
  a = await bootApp({ version: '1.0.10', response: min11 });
  a.setResponse(new Error('offline'));
  await a.resume();
  assert(a.force(), 'force screen stays when offline after being decided online');

  // not on signin / signup pages
  a = await bootApp({ version: '1.0.10', response: v11, path: '/signin.html' });
  assert(!a.card(), 'no soft card on signin page');
  a = await bootApp({ version: '1.0.10', response: v11, path: '/signup.html' });
  assert(!a.card(), 'no soft card on signup page');

  // web / PWA → no-op
  {
    const { doc } = makeDom();
    let fetched = 0;
    const sb = { window: { IS_BODYBANK_APP: false }, document: doc, localStorage: makeStorage(), fetch: async () => { fetched += 1; } };
    vm.runInNewContext(SRC, sb, { filename: FILE });
    doc.fire('DOMContentLoaded');
    await settle();
    eq(fetched, 0, 'web: no network call');
    assert(!sb.window.bbAppUpdate, 'web: no bbAppUpdate global');
  }

  // Android: Play immediate update on force, flexible on soft, store fallback when Play has nothing
  const calls = [];
  const playYes = {
    getAppUpdateInfo: async () => { calls.push('info'); return { updateAvailability: 2, immediateUpdateAllowed: true, flexibleUpdateAllowed: true, installStatus: 0 }; },
    performImmediateUpdate: async () => { calls.push('immediate'); return { code: 1 }; },
    startFlexibleUpdate: async () => { calls.push('flexible'); return { code: 0 }; },
    completeFlexibleUpdate: async () => { calls.push('complete'); },
    addListener: (n, fn) => { calls.push('listen:' + n); playYes._flex = fn; return Promise.resolve({ remove() {} }); },
    openAppStore: async (x) => { calls.push('store:' + JSON.stringify(x)); }
  };
  const minA = JSON.parse(JSON.stringify(CFG)); minA.android.min_supported_version = '1.8.8'; minA.android.latest_version = '1.8.8';
  a = await bootApp({ platform: 'android', version: '1.8.7', response: minA, appUpdate: playYes });
  assert(a.force(), 'android force screen');
  assert(calls.includes('immediate'), 'android force starts the Play immediate update');
  assert(a.force(), 'force screen stays after the user cancels Play');

  calls.length = 0;
  const softA = JSON.parse(JSON.stringify(CFG)); softA.android.latest_version = '1.8.8';
  a = await bootApp({ platform: 'android', version: '1.8.7', response: softA, appUpdate: playYes });
  assert(a.card(), 'android soft card');
  a.card().click('update');
  await settle();
  assert(calls.includes('flexible'), 'android Update starts a flexible Play update');
  assert(!calls.some((c) => c.startsWith('store:')), 'no store fallback when Play handles it');
  playYes._flex({ installStatus: 11 });
  assert(a.card() && /Update downloaded/.test(a.card().textContent) && /Restart/.test(a.card().innerHTML), 'downloaded card with Restart');
  a.card().click('restart');
  await settle();
  assert(calls.includes('complete'), 'Restart completes the flexible update');

  calls.length = 0;
  const playNo = Object.assign({}, playYes, { getAppUpdateInfo: async () => { calls.push('info'); return { updateAvailability: 1 }; } });
  a = await bootApp({ platform: 'android', version: '1.8.7', response: softA, appUpdate: playNo });
  a.card().click('update');
  await settle();
  assert(calls.includes('store:{"androidPackageName":"com.bodybank.app"}'), 'sideloaded / Play has nothing → Play store link');

  calls.length = 0;
  const playThrows = Object.assign({}, playYes, { getAppUpdateInfo: async () => { throw new Error('not from play'); } });
  a = await bootApp({ platform: 'android', version: '1.8.7', response: softA, appUpdate: playThrows });
  assert(a.card(), 'plugin error still shows the soft card');
  a.card().click('update');
  await settle();
  assert(calls.some((c) => c.startsWith('store:')), 'plugin error → store link');
}

part2()
  .catch((e) => failures.push('crashed: ' + (e && e.stack || e)))
  .then(() => {
    if (failures.length) {
      console.error(`\ntest-app-update: ${failures.length} of ${checks} checks FAILED`);
      failures.forEach((f) => console.error('  x ' + f));
      process.exit(1);
    }
    console.log(`test-app-update: ${checks} passed, 0 failed`);
  });
