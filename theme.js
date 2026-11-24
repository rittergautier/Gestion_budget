/* ═══════════ Thèmes personnalisables, enregistrés par profil ═══════════ */
export const THEMES = [
  { id: 'chaleureux', name: 'Chaleureux', hint: 'terre cuite & miel', sw: ['#C2603A', '#E8B98A', '#6B4A38', '#F7EFE6'] },
  { id: 'soleil',     name: 'Soleil',     hint: 'ambre & blé',        sw: ['#C98A16', '#E8CE8A', '#6B5628', '#FBF3E1'] },
  { id: 'ocean',      name: 'Océan',      hint: 'turquoise & ardoise',sw: ['#0B6E6E', '#9CCFCB', '#12262B', '#EEF3F4'] },
  { id: 'foret',      name: 'Forêt',      hint: 'mousse & sous-bois', sw: ['#2F6B3F', '#A9C9A0', '#23392A', '#EDF3EC'] },
  { id: 'prune',      name: 'Prune',      hint: 'prune & rose',       sw: ['#8E3B6B', '#D9A6C4', '#4A2A40', '#F6EEF3'] },
  { id: 'ardoise',    name: 'Ardoise',    hint: 'bleu nuit & lin',    sw: ['#3A5A8C', '#A9BAD4', '#2A3646', '#EFF2F6'] },
];
export const DEFAULTS = { theme: 'chaleureux', mode: 'auto', accent: null, radius: 12, density: 'normal', text: 'm', contrast: false };

const KEY = 'budget.prefs.last';
const TEXT = { s: 0.94, m: 1, l: 1.08 };
const HUES = [18, 40, 96, 150, 178, 212, 268, 325];
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let current = { ...DEFAULTS };
let onChange = null;
let ui = null;

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${s}% ${l}%)`;

function inkFor(h, s, l) {
  const S = s / 100, L = l / 100;
  const k = n => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const ch = n => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * lin(ch(0)) + 0.7152 * lin(ch(8)) + 0.0722 * lin(ch(4));
  return lum > 0.42 ? '#17110E' : '#FFFFFF';
}

export function readCache() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULTS };
}
export function getPrefs() { return { ...current }; }

export function applyPrefs(p, { notify = true, cache = true } = {}) {
  const next = { ...DEFAULTS, ...(p || {}) };
  if (!THEMES.some(t => t.id === next.theme)) next.theme = DEFAULTS.theme;
  if (!['auto', 'light', 'dark'].includes(next.mode)) next.mode = 'auto';
  if (!['compact', 'normal', 'large'].includes(next.density)) next.density = 'normal';
  if (!['s', 'm', 'l'].includes(next.text)) next.text = 'm';
  next.radius = clamp(Math.round(+next.radius || 0), 0, 22);
  next.contrast = !!next.contrast;
  next.accent = next.accent == null || next.accent === '' ? null : clamp(Math.round(+next.accent), 0, 360);
  current = next;

  const root = document.documentElement;
  const dark = next.mode === 'dark' || (next.mode === 'auto' && mq.matches);
  root.dataset.theme = next.theme;
  root.dataset.mode = dark ? 'dark' : 'light';
  root.dataset.density = next.density;
  root.dataset.contrast = next.contrast ? 'high' : 'normal';
  root.style.setProperty('--r', next.radius + 'px');
  root.style.setProperty('--ts', String(TEXT[next.text]));

  ['--accent', '--accent-ink', '--soft', '--c2'].forEach(v => root.style.removeProperty(v));
  if (next.accent != null) {
    const l = dark ? 64 : 38;
    root.style.setProperty('--accent', hsl(next.accent, 62, l));
    root.style.setProperty('--accent-ink', inkFor(next.accent, 62, l));
    root.style.setProperty('--soft', dark ? hsl(next.accent, 26, 21) : hsl(next.accent, 56, 92));
    root.style.setProperty('--c2', hsl(next.accent, 62, l));
  }

  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  let meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  if (bg) meta.content = bg;

  if (cache) { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {} }
  syncUI();
  if (notify && onChange) onChange({ ...next });
}

export function setSaveState(txt) {
  const el = document.getElementById('td-saved');
  if (el) el.textContent = txt;
}

/* ---------- panneau ---------- */
function build() {
  if (ui) return ui;
  const scrim = document.createElement('div');
  scrim.className = 'theme-scrim';
  scrim.id = 'theme-scrim';

  const el = document.createElement('aside');
  el.className = 'theme-drawer';
  el.id = 'theme-drawer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', "Apparence de l'application");
  el.setAttribute('inert', '');
  el.innerHTML = `
    <div class="td-head">
      <h2>🎨 Apparence<span class="sub">Réglages enregistrés sur votre profil</span></h2>
      <button class="ghost" type="button" id="td-close" aria-label="Fermer">✕</button>
    </div>
    <div class="td-body">
      <div class="td-preview">
        <div class="td-donut">
          <svg viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--soft)" stroke-width="6"/>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--c1)" stroke-width="6" stroke-dasharray="38 62" stroke-dashoffset="25"/>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--c2)" stroke-width="6" stroke-dasharray="27 73" stroke-dashoffset="-13"/>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--c3)" stroke-width="6" stroke-dasharray="35 65" stroke-dashoffset="-40"/>
          </svg>
          <div class="td-mid"><span>Reste à vivre</span><b>412 €</b></div>
        </div>
        <div class="td-side">
          <span class="td-chip pos">+ 120 € d’économie</span>
          <span class="td-chip neg">− 45 € de dépassement</span>
          <span class="td-chip gold">✉️ invitation en attente</span>
        </div>
      </div>

      <div class="td-sec">
        <h3>Palette</h3>
        <div class="td-themes" id="td-themes">
          ${THEMES.map(t => `
            <button type="button" class="td-theme" data-theme-id="${t.id}" aria-pressed="false">
              <span class="nm">${t.name}<span class="tick"></span></span>
              <span class="td-sw">${t.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span>
              <span class="hint">${t.hint}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="td-sec">
        <h3>Luminosité</h3>
        <div class="seg" id="td-mode">
          <button type="button" data-mode="light">☀️ Clair</button>
          <button type="button" data-mode="auto">🌗 Auto</button>
          <button type="button" data-mode="dark">🌙 Sombre</button>
        </div>
      </div>

      <div class="td-sec">
        <h3>Couleur d’accent</h3>
        <div class="td-row">
          <input type="range" id="td-hue" min="0" max="360" step="1" value="18" aria-label="Teinte de l'accent">
          <span class="td-val" id="td-hue-val">Auto</span>
        </div>
        <div class="td-hues" id="td-hues">
          <button type="button" class="td-auto" id="td-accent-auto" aria-pressed="true">Auto</button>
          ${HUES.map(h => `<button type="button" class="td-hue" data-hue="${h}" style="background:hsl(${h} 62% 45%)" aria-label="Teinte ${h}" aria-pressed="false"></button>`).join('')}
        </div>
      </div>

      <div class="td-sec">
        <h3>Formes</h3>
        <div class="td-row">
          <label for="td-radius">Arrondi</label>
          <input type="range" id="td-radius" min="0" max="22" step="1" value="12">
          <span class="td-val" id="td-radius-val">12 px</span>
        </div>
      </div>

      <div class="td-sec">
        <h3>Lecture</h3>
        <div class="seg" id="td-density">
          <button type="button" data-density="compact">Compact</button>
          <button type="button" data-density="normal">Normal</button>
          <button type="button" data-density="large">Aéré</button>
        </div>
        <div class="seg" id="td-text">
          <button type="button" data-text="s">A−</button>
          <button type="button" data-text="m">A</button>
          <button type="button" data-text="l">A+</button>
        </div>
        <label class="switch">Contraste renforcé
          <input type="checkbox" id="td-contrast">
          <span class="track"></span>
        </label>
      </div>
    </div>
    <div class="td-foot">
      <button class="ghost" type="button" id="td-reset">↺ Réinitialiser</button>
      <span class="td-saved" id="td-saved">Prêt</span>
    </div>`;

  document.body.append(scrim, el);
  ui = { el, scrim };

  const set = patch => applyPrefs({ ...current, ...patch });

  el.querySelector('#td-close').addEventListener('click', close);
  scrim.addEventListener('click', close);
  el.querySelector('#td-reset').addEventListener('click', () => applyPrefs({ ...DEFAULTS }));
  el.querySelector('#td-themes').addEventListener('click', e => {
    const b = e.target.closest('[data-theme-id]'); if (b) set({ theme: b.dataset.themeId });
  });
  el.querySelector('#td-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (b) set({ mode: b.dataset.mode });
  });
  el.querySelector('#td-density').addEventListener('click', e => {
    const b = e.target.closest('[data-density]'); if (b) set({ density: b.dataset.density });
  });
  el.querySelector('#td-text').addEventListener('click', e => {
    const b = e.target.closest('[data-text]'); if (b) set({ text: b.dataset.text });
  });
  el.querySelector('#td-hue').addEventListener('input', e => set({ accent: +e.target.value }));
  el.querySelector('#td-accent-auto').addEventListener('click', () => set({ accent: null }));
  el.querySelector('#td-hues').addEventListener('click', e => {
    const b = e.target.closest('[data-hue]'); if (b) set({ accent: +b.dataset.hue });
  });
  el.querySelector('#td-radius').addEventListener('input', e => set({ radius: +e.target.value }));
  el.querySelector('#td-contrast').addEventListener('change', e => set({ contrast: e.target.checked }));

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('open')) close(); });
  document.addEventListener('click', e => {
    if (!el.classList.contains('open')) return;
    if (e.target.closest('#theme-drawer') || e.target.closest('[data-theme-open]')) return;
    close();
  });
  mq.addEventListener('change', () => { if (current.mode === 'auto') applyPrefs(current, { notify: false }); });
  return ui;
}

function syncUI() {
  if (!ui) return;
  const el = ui.el;
  el.querySelectorAll('[data-theme-id]').forEach(b => {
    const on = b.dataset.themeId === current.theme;
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.tick').textContent = on ? '✓' : '';
  });
  el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === current.mode));
  el.querySelectorAll('[data-density]').forEach(b => b.classList.toggle('on', b.dataset.density === current.density));
  el.querySelectorAll('[data-text]').forEach(b => b.classList.toggle('on', b.dataset.text === current.text));
  const hue = el.querySelector('#td-hue');
  hue.value = String(current.accent == null ? 18 : current.accent);
  el.querySelector('#td-hue-val').textContent = current.accent == null ? 'Auto' : current.accent + '°';
  el.querySelector('#td-accent-auto').setAttribute('aria-pressed', String(current.accent == null));
  el.querySelectorAll('[data-hue]').forEach(b => b.setAttribute('aria-pressed', String(current.accent != null && +b.dataset.hue === current.accent)));
  const rad = el.querySelector('#td-radius');
  rad.value = String(current.radius);
  el.querySelector('#td-radius-val').textContent = current.radius + ' px';
  el.querySelector('#td-contrast').checked = current.contrast;
}

let lastTrigger = null;
function open(trigger) {
  build();
  lastTrigger = trigger || null;
  ui.el.classList.add('open');
  ui.scrim.classList.add('open');
  ui.el.removeAttribute('inert');
  syncUI();
  const first = ui.el.querySelector('.td-theme[aria-pressed="true"]') || ui.el.querySelector('#td-close');
  setTimeout(() => { try { first.focus(); } catch (e) {} }, 60);
}
function close() {
  if (!ui) return;
  ui.el.classList.remove('open');
  ui.scrim.classList.remove('open');
  ui.el.setAttribute('inert', '');
  if (lastTrigger) { try { lastTrigger.focus(); } catch (e) {} lastTrigger = null; }
}

export function initThemeUI(opts = {}) {
  onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
  build();
  syncUI();
  document.querySelectorAll('[data-theme-open]').forEach(b => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', e => { e.stopPropagation(); open(b); });
  });
  setSaveState(opts.saveHint || 'Prêt');
}
