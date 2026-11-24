/* ═══════════ Catégories personnalisables — frais fixes, primes, prévu ═══════════ */
export const KINDS = [
  { id: 'fix',  name: 'Frais fixes',              short: 'Frais fixes', icon: '🏠', desc: 'Les sorties qui reviennent chaque mois' },
  { id: 'ext',  name: 'Rentrées exceptionnelles', short: 'Primes',      icon: '✨', desc: 'Les rentrées ponctuelles : primes, ventes, remboursements' },
  { id: 'plan', name: 'Provisions & dépenses',    short: 'Provisions',  icon: '🛒', desc: 'Les dépenses du mois : provisions et rapprochement du réel' },
];

const DEF = {
  fix: [
    { id: 'logement',    label: 'Logement',          e: '🏠', c: '#7fb4e6' },
    { id: 'energie',     label: 'Énergie & eau',     e: '⚡', c: '#e8b44a' },
    { id: 'telecom',     label: 'Internet & mobile', e: '📱', c: '#5b8def' },
    { id: 'abonnements', label: 'Abonnements',       e: '📺', c: '#6fd6c7' },
    { id: 'assurances',  label: 'Assurances',        e: '🛡️', c: '#a78bfa' },
    { id: 'credits',     label: 'Crédits',           e: '🏦', c: '#d4a373' },
    { id: 'impots',      label: 'Impôts & taxes',    e: '🧾', c: '#8fbf9f' },
    { id: 'sante',       label: 'Santé & mutuelle',  e: '💊', c: '#f2705c' },
    { id: 'transport',   label: 'Transport',         e: '🚇', c: '#59d69f' },
    { id: 'education',   label: 'Enfants & études',  e: '🎓', c: '#c0ca6b' },
    { id: 'epargne',     label: 'Épargne',           e: '🐖', c: '#e98ac2' },
    { id: 'autre',       label: 'Autre',             e: '📌', c: '#9db3a6' },
  ],
  ext: [
    { id: 'prime',         label: 'Prime & bonus',     e: '💼', c: '#e8b44a' },
    { id: 'rappel',        label: 'Rappel de salaire', e: '🎁', c: '#d4a373' },
    { id: 'remboursement', label: 'Remboursement',     e: '↩️', c: '#5b8def' },
    { id: 'vente',         label: 'Vente',             e: '🏷️', c: '#6fd6c7' },
    { id: 'cadeau',        label: 'Cadeau & don',      e: '🎀', c: '#e98ac2' },
    { id: 'fiscal',        label: 'Impôts & aides',    e: '🧾', c: '#8fbf9f' },
    { id: 'placement',     label: 'Intérêts & gains',  e: '📈', c: '#59d69f' },
    { id: 'autre',         label: 'Autre',             e: '📌', c: '#9db3a6' },
  ],
  plan: [
    { id: 'alimentation', label: 'Alimentation', e: '🥐', c: '#e2b45a' },
    { id: 'logement',     label: 'Logement',     e: '🏠', c: '#7fb4e6' },
    { id: 'transport',    label: 'Transport',    e: '🚇', c: '#59d69f' },
    { id: 'loisirs',      label: 'Loisirs',      e: '🎬', c: '#e98ac2' },
    { id: 'sante',        label: 'Santé',        e: '💊', c: '#f2705c' },
    { id: 'shopping',     label: 'Shopping',     e: '🛍️', c: '#c9a6ff' },
    { id: 'abonnements',  label: 'Abonnements',  e: '📺', c: '#6fd6c7' },
    { id: 'autre',        label: 'Autre',        e: '🧾', c: '#9db3a6' },
  ],
};
export const DEFAULTS = JSON.parse(JSON.stringify(DEF));

const EMOJI = {
  fix: ['🏠','⚡','📱','📺','🛡️','🏦','🧾','💊','🚇','🎓','🐖','📌','🔥','💧','🗑️','🚗','✈️','🍽️','🛒','🐾','👶','🏋️','🎮','📚','🧹','🔧','🏥','💳','📡','🔒','🎁','🌐','🚿','🛠️','📦','🚌'],
  ext: ['💼','🎁','↩️','🏷️','🎀','🧾','📈','📌','💰','🏆','🎲','🪙','💎','🏛️','🤝','🧧','💵','📊','🎯','🍀','⭐','🔑','🏅','💸','🧮','🎉','📦','🚀'],
  plan: ['🥐','🏠','🚇','🎬','💊','🛍️','📺','🧾','🛒','🍽️','☕','🍕','⛽','🅿️','🎮','🎳','🎨','🎧','📚','✂️','🧴','👕','👟','💄','🐾','🌱','🎂','🍻','🏋️','🚲','🧸','🪴','🧺','🔌','🎫','🏖️'],
};
const SWATCH = ['#e2b45a','#e8b44a','#d4a373','#c2603a','#f2705c','#e98ac2','#a78bfa','#c9a6ff','#5b8def','#7fb4e6','#6fd6c7','#59d69f','#8fbf9f','#c0ca6b','#9db3a6','#c94f4f'];
const LS = 'budget.cats.';
const LSV = 'budget.cats.view';

/* ---------- outils ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const deacc = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slug = s => deacc(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'cat';
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function hexToHsl(h) {
  const [r, g, b] = hexToRgb(h).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  let hh = 0;
  if (d) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
  return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const fn = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(fn(0) * 255, fn(8) * 255, fn(4) * 255);
}
function inkOn(h) {
  const [r, g, b] = hexToRgb(h).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.42 ? '#17110e' : '#ffffff';
}

/* ---------- état ---------- */
let sets = clone(DEF);
let onChange = null, usageFn = () => ({ n: 0, total: 0 }), itemsFn = () => [], reassignFn = null, canEditFn = () => true;
let ui = null, cur = 'fix', sel = null, q = '', sort = 'manual', selection = new Set(), dragId = null, undoSnap = null, undoLabel = '';

function normSet(arr, def) {
  const out = [], seen = new Set();
  (Array.isArray(arr) ? arr : []).forEach(c => {
    if (!c || typeof c !== 'object') return;
    const label = String(c.label || '').trim().slice(0, 32);
    let id = String(c.id || slug(label || 'cat')).slice(0, 32);
    if (!id || seen.has(id)) return;
    out.push({ id, label: label || id, e: String(c.e || '🏷️').trim().slice(0, 4) || '🏷️', c: isHex(c.c) ? String(c.c).toLowerCase() : '#9db3a6' });
    seen.add(id);
  });
  return out.length ? out : clone(def);
}

export function readCache(key) {
  try { const r = localStorage.getItem(LS + key); if (r) return JSON.parse(r); } catch (e) {}
  return null;
}
export function getSets() { return clone(sets); }
export function list(kind) { return clone(sets[kind] || []); }
export function fallback(kind) {
  const a = sets[kind] || [];
  return a.find(c => c.id === 'autre') || a[a.length - 1] || { id: 'autre', label: 'Autre', e: '📌', c: '#9db3a6' };
}
export function resolve(kind, value) {
  const a = sets[kind] || [];
  if (!a.length) return { id: 'autre', label: 'Autre', e: '📌', c: '#9db3a6' };
  const v = String(value == null ? '' : value);
  return a.find(c => c.id === v) || a.find(c => deacc(c.label) === deacc(v)) || fallback(kind);
}
export function applySets(raw, { notify = true, cacheKey = null } = {}) {
  sets = {
    fix: normSet(raw && raw.fix, DEF.fix),
    ext: normSet(raw && raw.ext, DEF.ext),
    plan: normSet(raw && raw.plan, DEF.plan),
  };
  try { localStorage.setItem(LS + 'last', JSON.stringify(sets)); } catch (e) {}
  if (cacheKey) { try { localStorage.setItem(LS + cacheKey, JSON.stringify(sets)); } catch (e) {} }
  if (sel && !sets[cur].some(c => c.id === sel)) sel = null;
  selection = new Set([...selection].filter(id => sets[cur].some(c => c.id === id)));
  syncUI();
  if (notify && onChange) onChange(clone(sets));
}
export function refreshCatsUI() { if (ui && ui.panel.classList.contains('open')) { renderRail(); renderList(); patchDetail(); } }

/* ---------- mutations ---------- */
function commit(msg) {
  try { localStorage.setItem(LS + 'last', JSON.stringify(sets)); } catch (e) {}
  renderRail(); renderList();
  if (msg) setState(msg);
  if (onChange) onChange(clone(sets));
}
function snapshot(label) { undoSnap = clone(sets); undoLabel = label; renderUndo(); }
function uniqueId(kind, base) {
  const a = sets[kind]; let id = slug(base), n = 2;
  while (a.some(c => c.id === id)) id = slug(base) + '-' + (n++);
  return id;
}
function addCat(kind) {
  const h = Math.round(Math.random() * 360);
  const c = { id: uniqueId(kind, 'nouvelle'), label: 'Nouvelle catégorie', e: '🏷️', c: hslToHex(h, 60, 58) };
  sets[kind].push(c); sel = c.id; commit('Catégorie créée ✦'); renderDetail();
  setTimeout(() => { const el = document.getElementById('cs-label'); if (el) { el.focus(); el.select(); } }, 40);
}
function updateCat(kind, id, patch) {
  const c = sets[kind].find(x => x.id === id); if (!c) return;
  if (patch.label != null) c.label = String(patch.label).slice(0, 32);
  if (patch.e != null) c.e = String(patch.e).trim().slice(0, 4) || '🏷️';
  if (patch.c != null && isHex(patch.c)) c.c = String(patch.c).toLowerCase();
  commit();
}
function removeCats(kind, ids) {
  const keep = sets[kind].filter(c => !ids.includes(c.id));
  if (!keep.length) { setState('Impossible : gardez au moins une catégorie.'); return false; }
  sets[kind] = keep;
  ids.forEach(id => selection.delete(id));
  if (ids.includes(sel)) sel = null;
  return true;
}
function move(kind, id, dir) {
  const a = sets[kind], i = a.findIndex(c => c.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= a.length) return;
  const [x] = a.splice(i, 1); a.splice(j, 0, x);
  sort = 'manual'; saveView(); commit('Ordre mis à jour');
}
function reorder(kind, fromId, toId, after) {
  const a = sets[kind], i = a.findIndex(c => c.id === fromId);
  if (i < 0 || fromId === toId) return;
  const [x] = a.splice(i, 1);
  let j = a.findIndex(c => c.id === toId);
  if (j < 0) j = a.length - 1;
  a.splice(after ? j + 1 : j, 0, x);
  sort = 'manual'; saveView(); commit('Ordre mis à jour ✦');
}

/* ---------- vue ---------- */
function saveView() { try { localStorage.setItem(LSV, JSON.stringify({ cur, sort })); } catch (e) {} }
function loadView() {
  try { const v = JSON.parse(localStorage.getItem(LSV) || 'null'); if (v) { if (KINDS.some(k => k.id === v.cur)) cur = v.cur; if (v.sort) sort = v.sort; } } catch (e) {}
}
function setState(t) { const el = document.getElementById('cs-state'); if (el) el.textContent = t; }
function renderUndo() {
  const b = document.getElementById('cs-undo');
  if (!b) return;
  b.hidden = !undoSnap;
  b.textContent = undoSnap ? '↩ Annuler : ' + undoLabel : '';
}
function visible() {
  let a = sets[cur].slice();
  if (q.trim()) { const s = deacc(q); a = a.filter(c => deacc(c.label).includes(s) || deacc(c.id).includes(s)); }
  if (sort === 'label') a.sort((x, y) => x.label.localeCompare(y.label, 'fr'));
  else if (sort === 'usage') a.sort((x, y) => usageFn(cur, y.id).n - usageFn(cur, x.id).n);
  else if (sort === 'amount') a.sort((x, y) => usageFn(cur, y.id).total - usageFn(cur, x.id).total);
  return a;
}

function renderRail() {
  if (!ui) return;
  const rail = document.getElementById('cs-rail');
  rail.innerHTML = KINDS.map(k => {
    const n = sets[k.id].length;
    const used = sets[k.id].reduce((s, c) => s + usageFn(k.id, c.id).n, 0);
    return '<button type="button" class="cs-kind' + (k.id === cur ? ' on' : '') + '" data-kind="' + k.id + '">' +
      '<span class="cs-kind-ico">' + k.icon + '</span><span class="cs-kind-txt"><b>' + esc(k.short) + '</b>' +
      '<small>' + n + ' catégorie' + (n > 1 ? 's' : '') + ' · ' + used + ' ligne' + (used > 1 ? 's' : '') + '</small></span></button>';
  }).join('') + '<p class="cs-rail-note">' + esc(KINDS.find(k => k.id === cur).desc) + '</p>';
}

function renderList() {
  if (!ui) return;
  const editable = canEditFn();
  const a = visible();
  const el = document.getElementById('cs-list');
  const addBtn = document.getElementById('cs-add');
  if (addBtn) addBtn.hidden = !editable;
  const bulk = document.getElementById('cs-bulk');
  bulk.hidden = !editable || selection.size === 0;
  if (!bulk.hidden) document.getElementById('cs-bulk-n').textContent = selection.size + ' sélectionnée' + (selection.size > 1 ? 's' : '');

  if (!a.length) {
    el.innerHTML = '<p class="cs-empty">' + (q ? 'Aucune catégorie ne correspond à « ' + esc(q) + ' ».' : 'Aucune catégorie dans cette famille.') + '</p>';
    return;
  }
  el.innerHTML = a.map(c => {
    const u = usageFn(cur, c.id);
    const drag = editable && sort === 'manual' && !q.trim();
    return '<div class="cs-row' + (c.id === sel ? ' on' : '') + '" data-id="' + esc(c.id) + '"' + (drag ? ' draggable="true"' : '') + '>' +
      '<span class="cs-grip" title="' + (drag ? 'Glisser pour réordonner' : 'Tri manuel indisponible dans cette vue') + '">' + (drag ? '⠿' : '·') + '</span>' +
      (editable ? '<input type="checkbox" class="cs-check" data-check="' + esc(c.id) + '"' + (selection.has(c.id) ? ' checked' : '') + ' aria-label="Sélectionner ' + esc(c.label) + '">' : '') +
      '<button type="button" class="cs-name" data-pick="' + esc(c.id) + '"><span class="cs-emo">' + esc(c.e) + '</span><span class="cs-lab">' + esc(c.label) + '</span></button>' +
      '<span class="cs-use" title="' + eur.format(u.total) + ' cumulés">' + u.n + ' ligne' + (u.n > 1 ? 's' : '') + '</span>' +
      '<span class="cs-dot" style="background:' + c.c + '"></span>' +
      (editable ? '<span class="cs-move"><button type="button" data-up="' + esc(c.id) + '" title="Monter" aria-label="Monter">▲</button><button type="button" data-down="' + esc(c.id) + '" title="Descendre" aria-label="Descendre">▼</button></span>' +
        '<button type="button" class="cs-del" data-del="' + esc(c.id) + '" title="Supprimer" aria-label="Supprimer ' + esc(c.label) + '">✕</button>' : '') +
      '</div>';
  }).join('');
}

function patchDetail() {
  if (!ui) return;
  const c = sets[cur].find(x => x.id === sel);
  const pv = document.getElementById('cs-preview');
  if (!c || !pv) return;
  pv.style.background = c.c; pv.style.color = inkOn(c.c);
  pv.textContent = c.e + '  ' + (c.label || 'Sans nom');
  const hx = document.getElementById('cs-hex');
  if (hx && document.activeElement !== hx) hx.value = c.c;
  const nat = document.getElementById('cs-native');
  if (nat && document.activeElement !== nat) nat.value = c.c;
  const [h, s, l] = hexToHsl(c.c);
  [['cs-h', h], ['cs-s', s], ['cs-l', l]].forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = String(v);
    const out = document.getElementById(id + '-out');
    if (out) out.textContent = id === 'cs-h' ? v + '°' : v + ' %';
  });
  const em = document.getElementById('cs-emoji');
  if (em && document.activeElement !== em) em.value = c.e;
  document.querySelectorAll('#cs-swatches [data-sw]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sw === c.c)));
  const st = document.getElementById('cs-stats');
  if (st) {
    const u = usageFn(cur, c.id);
    st.innerHTML = '<b>' + u.n + '</b> ligne' + (u.n > 1 ? 's' : '') + ' · <b>' + eur.format(u.total) + '</b> cumulés';
  }
  const il = document.getElementById('cs-items');
  if (il) {
    const rows = itemsFn(cur, c.id).slice(0, 8);
    il.innerHTML = rows.length
      ? rows.map(r => '<div class="cs-item"><span>' + esc(r.name) + '</span><small>' + esc(r.sub || '') + '</small><b>' + eur.format(r.amount) + '</b></div>').join('')
      : '<p class="cs-empty small">Aucune ligne n’utilise cette catégorie pour l’instant.</p>';
  }
}

function renderDetail() {
  if (!ui) return;
  const box = document.getElementById('cs-detail');
  const c = sets[cur].find(x => x.id === sel);
  const editable = canEditFn();
  box.classList.toggle('open', !!c);
  if (!c) {
    box.innerHTML = '<div class="cs-detail-inner"><p class="cs-empty">Choisissez une catégorie pour la modifier : nom, emoji, couleur, position.<br><br>Ou créez-en une nouvelle avec <b>＋ Nouvelle</b>.</p></div>';
    return;
  }
  const u = usageFn(cur, c.id);
  const others = sets[cur].filter(x => x.id !== c.id);
  const [h, s, l] = hexToHsl(c.c);
  const dis = editable ? '' : ' disabled';
  box.innerHTML = '<div class="cs-detail-inner">' +
    '<button type="button" class="ghost cs-back" id="cs-back">← Retour à la liste</button>' +
    '<div class="cs-preview" id="cs-preview" style="background:' + c.c + ';color:' + inkOn(c.c) + '">' + esc(c.e) + '  ' + esc(c.label) + '</div>' +

    '<label class="cs-field">Nom<input type="text" id="cs-label" maxlength="32" value="' + esc(c.label) + '"' + dis + '></label>' +

    '<div class="cs-field"><span>Emoji</span><div class="cs-emoji-row">' +
    '<input type="text" id="cs-emoji" maxlength="4" value="' + esc(c.e) + '" aria-label="Emoji"' + dis + '>' +
    '<button type="button" class="ghost" id="cs-emoji-rand" title="Emoji au hasard"' + dis + '>🎲</button></div>' +
    '<div class="cs-emojis">' + EMOJI[cur].map(e => '<button type="button" data-emo="' + esc(e) + '"' + dis + '>' + e + '</button>').join('') + '</div></div>' +

    '<div class="cs-field"><span>Couleur</span>' +
    '<div class="cs-color-row"><input type="color" id="cs-native" value="' + c.c + '" aria-label="Sélecteur de couleur"' + dis + '>' +
    '<input type="text" id="cs-hex" value="' + c.c + '" spellcheck="false" aria-label="Code hexadécimal"' + dis + '>' +
    '<button type="button" class="ghost" id="cs-color-rand" title="Couleur au hasard"' + dis + '>🎲</button></div>' +
    '<div class="cs-swatches" id="cs-swatches">' + SWATCH.map(v => '<button type="button" data-sw="' + v + '" style="background:' + v + '" aria-pressed="' + (v === c.c) + '" aria-label="Couleur ' + v + '"' + dis + '></button>').join('') + '</div>' +
    '<label class="cs-slider">Teinte<input type="range" id="cs-h" min="0" max="360" value="' + h + '"' + dis + '><output id="cs-h-out">' + h + '°</output></label>' +
    '<label class="cs-slider">Saturation<input type="range" id="cs-s" min="0" max="100" value="' + s + '"' + dis + '><output id="cs-s-out">' + s + ' %</output></label>' +
    '<label class="cs-slider">Luminosité<input type="range" id="cs-l" min="18" max="82" value="' + l + '"' + dis + '><output id="cs-l-out">' + l + ' %</output></label>' +
    '<button type="button" class="ghost cs-wide" id="cs-harmonize"' + dis + '>🌈 Harmoniser toute la famille</button></div>' +

    '<div class="cs-field"><span>Position</span><div class="cs-pos">' +
    '<button type="button" class="ghost" data-pos="first"' + dis + '>⤒ Premier</button>' +
    '<button type="button" class="ghost" data-pos="up"' + dis + '>▲</button>' +
    '<button type="button" class="ghost" data-pos="down"' + dis + '>▼</button>' +
    '<button type="button" class="ghost" data-pos="last"' + dis + '>⤓ Dernier</button></div></div>' +

    '<div class="cs-field"><span>Utilisation</span><p class="cs-stats" id="cs-stats"><b>' + u.n + '</b> ligne' + (u.n > 1 ? 's' : '') + ' · <b>' + eur.format(u.total) + '</b> cumulés</p><div class="cs-items" id="cs-items"></div></div>' +

    (editable ? '<div class="cs-field"><span>Actions</span>' +
      '<button type="button" class="ghost cs-wide" id="cs-dup">⧉ Dupliquer cette catégorie</button>' +
      (u.n > 0 && others.length
        ? '<label class="cs-reassign">Réaffecter les ' + u.n + ' ligne' + (u.n > 1 ? 's' : '') + ' vers<select id="cs-target">' + others.map(o => '<option value="' + esc(o.id) + '">' + esc(o.e) + ' ' + esc(o.label) + '</option>').join('') + '</select></label>'
        : '') +
      '<button type="button" class="ghost cs-wide danger" id="cs-delete">🗑 Supprimer la catégorie</button></div>' : '<p class="cs-empty small">Lecture seule : vous ne pouvez pas modifier les catégories de ce budget.</p>') +
    '</div>';
  patchDetail();

  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  on('cs-back', 'click', () => { sel = null; renderDetail(); renderList(); });
  on('cs-label', 'input', e => { updateCat(cur, c.id, { label: e.target.value }); patchDetail(); });
  on('cs-emoji', 'input', e => { updateCat(cur, c.id, { e: e.target.value }); patchDetail(); });
  on('cs-emoji-rand', 'click', () => { const a = EMOJI[cur]; updateCat(cur, c.id, { e: a[Math.floor(Math.random() * a.length)] }); renderDetail(); });
  on('cs-native', 'input', e => { updateCat(cur, c.id, { c: e.target.value }); patchDetail(); });
  on('cs-hex', 'input', e => { const v = e.target.value.trim(); if (isHex(v)) { updateCat(cur, c.id, { c: v }); patchDetail(); } });
  on('cs-color-rand', 'click', () => { updateCat(cur, c.id, { c: hslToHex(Math.random() * 360, 52 + Math.random() * 28, 46 + Math.random() * 18) }); renderDetail(); });
  ['cs-h', 'cs-s', 'cs-l'].forEach(id => on(id, 'input', () => {
    const g = i => +document.getElementById(i).value;
    updateCat(cur, c.id, { c: hslToHex(g('cs-h'), g('cs-s'), g('cs-l')) }); patchDetail();
  }));
  on('cs-harmonize', 'click', () => {
    snapshot('harmonisation');
    const a = sets[cur], n = a.length, base = hexToHsl(c.c)[0];
    a.forEach((x, i) => { const [, ss, ll] = hexToHsl(x.c); x.c = hslToHex((base + i * 360 / n) % 360, Math.max(45, ss), clamp(ll, 42, 66)); });
    commit('Couleurs harmonisées ✦'); renderDetail();
  });
  on('cs-dup', 'click', () => {
    const nc = { id: uniqueId(cur, c.label), label: (c.label + ' (copie)').slice(0, 32), e: c.e, c: c.c };
    sets[cur].splice(sets[cur].findIndex(x => x.id === c.id) + 1, 0, nc);
    sel = nc.id; commit('Catégorie dupliquée ✦'); renderDetail();
  });
  on('cs-delete', 'click', async () => {
    const tgt = document.getElementById('cs-target');
    if (sets[cur].length <= 1) { setState('Impossible : gardez au moins une catégorie.'); return; }
    snapshot('suppression de « ' + c.label + ' »');
    if (tgt && reassignFn) { setState('Réaffectation…'); try { await reassignFn(cur, c.id, tgt.value); } catch (e) { setState('Réaffectation impossible.'); return; } }
    if (removeCats(cur, [c.id])) { commit('Catégorie supprimée'); renderDetail(); }
  });
  box.querySelectorAll('[data-emo]').forEach(b => b.addEventListener('click', () => { updateCat(cur, c.id, { e: b.dataset.emo }); renderDetail(); }));
  box.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => { updateCat(cur, c.id, { c: b.dataset.sw }); renderDetail(); }));
  box.querySelectorAll('[data-pos]').forEach(b => b.addEventListener('click', () => {
    const a = sets[cur], i = a.findIndex(x => x.id === c.id); const [x] = a.splice(i, 1);
    const p = b.dataset.pos;
    if (p === 'first') a.unshift(x); else if (p === 'last') a.push(x);
    else a.splice(clamp(i + (p === 'up' ? -1 : 1), 0, a.length), 0, x);
    sort = 'manual'; saveView(); commit('Position mise à jour'); renderDetail();
  }));
}

function syncUI() { if (!ui) return; renderRail(); renderList(); renderDetail(); renderUndo(); }

/* ---------- panneau ---------- */
function build() {
  if (ui) return ui;
  const scrim = document.createElement('div');
  scrim.className = 'cs-scrim'; scrim.id = 'cs-scrim';
  const panel = document.createElement('section');
  panel.className = 'cs-panel'; panel.id = 'cs-panel';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Paramètres des catégories');
  panel.setAttribute('inert', '');
  panel.innerHTML =
    '<header class="cs-head"><div class="cs-title"><h2>⚙️ Paramètres</h2>' +
    '<span class="cs-sub">Catégories du budget — nom, emoji, couleur, ordre</span></div>' +
    '<div class="cs-head-actions">' +
    '<button type="button" class="ghost" id="cs-export" title="Exporter en JSON">⤓ Exporter</button>' +
    '<button type="button" class="ghost" id="cs-import" title="Importer un fichier JSON">⤒ Importer</button>' +
    '<input type="file" id="cs-file" accept="application/json,.json" hidden>' +
    '<button type="button" class="ghost" id="cs-close" aria-label="Fermer">✕</button></div></header>' +
    '<div class="cs-body">' +
    '<nav class="cs-rail" id="cs-rail" aria-label="Familles de catégories"></nav>' +
    '<div class="cs-main">' +
    '<div class="cs-tools">' +
    '<input type="search" id="cs-q" placeholder="Rechercher une catégorie…" aria-label="Rechercher une catégorie">' +
    '<select id="cs-sort" aria-label="Trier">' +
    '<option value="manual">Ordre manuel</option><option value="label">Nom A→Z</option>' +
    '<option value="usage">Les plus utilisées</option><option value="amount">Montant cumulé</option></select>' +
    '<button type="button" id="cs-add">＋ Nouvelle</button></div>' +
    '<div class="cs-bulk" id="cs-bulk" hidden><span id="cs-bulk-n"></span>' +
    '<input type="color" id="cs-bulk-color" value="#c2603a" aria-label="Couleur à appliquer">' +
    '<button type="button" class="ghost" id="cs-bulk-apply">Appliquer la couleur</button>' +
    '<button type="button" class="ghost" id="cs-bulk-spread">🌈 Dégradé</button>' +
    '<button type="button" class="ghost danger" id="cs-bulk-del">🗑 Supprimer</button>' +
    '<button type="button" class="ghost" id="cs-bulk-clear">Effacer</button></div>' +
    '<div class="cs-list" id="cs-list"></div></div>' +
    '<aside class="cs-detail" id="cs-detail"></aside></div>' +
    '<footer class="cs-foot">' +
    '<button type="button" class="ghost" id="cs-reset-kind">↺ Réinitialiser cette famille</button>' +
    '<button type="button" class="ghost" id="cs-undo" hidden></button>' +
    '<span class="cs-state" id="cs-state">Prêt</span></footer>';
  document.body.append(scrim, panel);
  ui = { panel, scrim };
  loadView();

  const qEl = document.getElementById('cs-q'), sEl = document.getElementById('cs-sort');
  sEl.value = sort;
  qEl.addEventListener('input', e => { q = e.target.value; renderList(); });
  sEl.addEventListener('change', e => { sort = e.target.value; saveView(); renderList(); });
  document.getElementById('cs-add').addEventListener('click', () => addCat(cur));
  document.getElementById('cs-close').addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.getElementById('cs-rail').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]'); if (!b) return;
    cur = b.dataset.kind; sel = null; selection.clear(); q = ''; qEl.value = ''; saveView(); syncUI();
  });

  const listEl = document.getElementById('cs-list');
  listEl.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { sel = pick.dataset.pick; renderList(); renderDetail(); return; }
    const up = e.target.closest('[data-up]'); if (up) { move(cur, up.dataset.up, -1); renderDetail(); return; }
    const dn = e.target.closest('[data-down]'); if (dn) { move(cur, dn.dataset.down, 1); renderDetail(); return; }
    const del = e.target.closest('[data-del]');
    if (del) {
      const id = del.dataset.del;
      if (sets[cur].length <= 1) { setState('Impossible : gardez au moins une catégorie.'); return; }
      sel = id; renderList(); renderDetail();
      setState('Choisissez la réaffectation puis « Supprimer la catégorie ».');
    }
  });
  listEl.addEventListener('change', e => {
    const cb = e.target.closest('[data-check]'); if (!cb) return;
    if (cb.checked) selection.add(cb.dataset.check); else selection.delete(cb.dataset.check);
    renderList();
  });
  listEl.addEventListener('dragstart', e => {
    const r = e.target.closest('.cs-row'); if (!r) return;
    dragId = r.dataset.id; r.classList.add('dragging');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } catch (err) {}
  });
  listEl.addEventListener('dragend', () => { dragId = null; listEl.querySelectorAll('.cs-row').forEach(r => r.classList.remove('dragging', 'over-top', 'over-bot')); });
  listEl.addEventListener('dragover', e => {
    if (!dragId) return;
    const r = e.target.closest('.cs-row'); if (!r || r.dataset.id === dragId) return;
    e.preventDefault();
    const b = r.getBoundingClientRect(), after = (e.clientY - b.top) > b.height / 2;
    listEl.querySelectorAll('.cs-row').forEach(x => x.classList.remove('over-top', 'over-bot'));
    r.classList.add(after ? 'over-bot' : 'over-top');
  });
  listEl.addEventListener('drop', e => {
    if (!dragId) return;
    const r = e.target.closest('.cs-row'); if (!r) return;
    e.preventDefault();
    const b = r.getBoundingClientRect(), after = (e.clientY - b.top) > b.height / 2;
    reorder(cur, dragId, r.dataset.id, after); dragId = null; renderDetail();
  });

  document.getElementById('cs-bulk-clear').addEventListener('click', () => { selection.clear(); renderList(); });
  document.getElementById('cs-bulk-apply').addEventListener('click', () => {
    snapshot('couleur groupée');
    const col = document.getElementById('cs-bulk-color').value;
    sets[cur].forEach(c => { if (selection.has(c.id)) c.c = col; });
    commit(selection.size + ' catégories recolorées ✦'); renderDetail();
  });
  document.getElementById('cs-bulk-spread').addEventListener('click', () => {
    snapshot('dégradé groupé');
    const ids = sets[cur].filter(c => selection.has(c.id)).map(c => c.id);
    const start = hexToHsl(sets[cur].find(c => c.id === ids[0]).c)[0];
    ids.forEach((id, i) => { sets[cur].find(c => c.id === id).c = hslToHex((start + i * 300 / Math.max(1, ids.length)) % 360, 62, 58); });
    commit('Dégradé appliqué ✦'); renderDetail();
  });
  document.getElementById('cs-bulk-del').addEventListener('click', async () => {
    const ids = [...selection];
    if (sets[cur].length - ids.length < 1) { setState('Impossible : gardez au moins une catégorie.'); return; }
    const target = sets[cur].find(c => !selection.has(c.id));
    if (!confirm('Supprimer ' + ids.length + ' catégorie(s) ? Les lignes seront réaffectées vers « ' + target.label + ' ».')) return;
    snapshot('suppression groupée');
    if (reassignFn) for (const id of ids) { try { await reassignFn(cur, id, target.id); } catch (e) {} }
    if (removeCats(cur, ids)) { commit(ids.length + ' catégories supprimées'); renderDetail(); }
  });

  document.getElementById('cs-reset-kind').addEventListener('click', () => {
    snapshot('réinitialisation de ' + KINDS.find(k => k.id === cur).short);
    sets[cur] = clone(DEF[cur]); sel = null; selection.clear();
    commit('Famille réinitialisée'); renderDetail();
  });
  document.getElementById('cs-undo').addEventListener('click', () => {
    if (!undoSnap) return;
    sets = undoSnap; undoSnap = null; undoLabel = '';
    commit('Action annulée ✦'); syncUI();
  });
  document.getElementById('cs-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(sets, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'categories-budget.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    setState('Fichier exporté ✦');
  });
  document.getElementById('cs-import').addEventListener('click', () => { if (canEditFn()) document.getElementById('cs-file').click(); else setState('Lecture seule : import impossible.'); });
  document.getElementById('cs-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const raw = JSON.parse(String(rd.result));
        snapshot('import'); applySets(raw, { notify: true });
        setState('Catégories importées ✦'); syncUI();
      } catch (err) { setState('Fichier illisible : JSON attendu.'); }
    };
    rd.readAsText(file); e.target.value = '';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) { if (sel) { sel = null; renderDetail(); renderList(); } else close(); }
  });
  return ui;
}

export function openCats(kind) {
  build();
  if (kind && KINDS.some(k => k.id === kind)) cur = kind;
  ui.panel.classList.add('open'); ui.scrim.classList.add('open'); ui.panel.removeAttribute('inert');
  document.getElementById('cs-sort').value = sort;
  syncUI();
  setState(canEditFn() ? 'Modifications enregistrées sur le budget' : 'Lecture seule');
  setTimeout(() => { try { document.getElementById('cs-q').focus(); } catch (e) {} }, 80);
}
function close() {
  if (!ui) return;
  ui.panel.classList.remove('open'); ui.scrim.classList.remove('open'); ui.panel.setAttribute('inert', '');
}
export function initCatsUI(opts = {}) {
  onChange = opts.onChange || null;
  usageFn = typeof opts.usage === 'function' ? opts.usage : usageFn;
  itemsFn = typeof opts.items === 'function' ? opts.items : itemsFn;
  reassignFn = typeof opts.onReassign === 'function' ? opts.onReassign : null;
  canEditFn = typeof opts.canEdit === 'function' ? opts.canEdit : canEditFn;
  build(); syncUI();
  document.querySelectorAll('[data-cats-open]').forEach(b => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', e => { e.stopPropagation(); openCats(); });
  });
}
