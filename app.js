/* ═══════════ Mon budget mensuel — logique applicative ═══════════ */
import { FIREBASE_CONFIG } from './firebase-config.js';
import { initThemeUI, applyPrefs, getPrefs, readCache, setSaveState } from './theme.js';
import { KINDS, DEFAULTS as CAT_DEFAULTS, initCatsUI, applySets, getSets, readCache as readCatsCache,
         list as catList, resolve as catResolve, refreshCatsUI, openCats } from './cats.js';

/* ---------- petits outils ---------- */
const $ = s => document.querySelector(s);
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const fc0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const f = n => eur.format(n || 0);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sum = (a, k) => a.reduce((t, x) => t + (+x[k] || 0), 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const low = s => String(s || '').trim().toLowerCase();
const deacc = s => low(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ---------- mois ---------- */
const MMIN = '0000-01', MMAX = '9999-12';
const mkey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const prevMonth = k => { const p = k.split('-'); const d = new Date(+p[0], +p[1] - 2, 1); return mkey(d.getFullYear(), d.getMonth() + 1); };
const mlabel = k => { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); };
const fromOf = it => it.from || MMIN;
const toOf = it => it.to || MMAX;
const applies = (it, k) => fromOf(it) <= k && toOf(it) >= k;
const MN_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/* ---------- familles de catégories ---------- */
const CK = { income: null, fixed: 'fix', extra: 'ext', plans: 'plan', reals: 'plan' };
const appKind = k => k === 'fix' ? 'fixed' : k === 'ext' ? 'extra' : 'plans';
const catsOf = kind => CK[kind] ? catList(CK[kind]) : null;

const FIX_HINTS = [
  ['epargne', ['assurance vie', 'livret', 'ldd', 'pel', 'pea', 'epargne', 'placement', 'investissement']],
  ['logement', ['loyer', 'location', 'bail', 'credit immo', 'pret immo', 'hypotheque', 'copro', 'syndic', 'logement', 'residence', 'charges']],
  ['energie', ['edf', 'engie', 'electricite', 'energie', 'gaz', 'eau', 'chauffage', 'veolia', 'suez', 'fioul', 'fuel']],
  ['telecom', ['internet', 'box', 'fibre', 'adsl', 'forfait', 'mobile', 'telephone', 'orange', 'sfr', 'bouygues', 'free', 'sosh', 'red by']],
  ['abonnements', ['netflix', 'spotify', 'disney', 'prime video', 'canal', 'deezer', 'apple music', 'youtube', 'streaming', 'abonnement', 'presse', 'magazine', 'journal', 'xbox', 'playstation', 'nintendo', 'icloud', 'google one', 'dropbox', 'adobe', 'microsoft', 'logiciel']],
  ['assurances', ['assurance', 'maif', 'macif', 'axa', 'allianz', 'groupama', 'matmut', 'mma', 'gmf', 'maaf', 'prevoyance', 'responsabilite civile']],
  ['credits', ['credit', 'pret', 'mensualite', 'emprunt', 'revolving', 'sofinco', 'cetelem', 'cofidis', 'franfinance']],
  ['impots', ['impot', 'taxe', 'fonciere', 'dgfip', 'tresor public', 'redevance', 'habitation']],
  ['sante', ['mutuelle', 'sante', 'pharmacie', 'medecin', 'dentiste', 'kine', 'osteo', 'optique', 'harmonie', 'mgen', 'alan', 'april']],
  ['transport', ['navigo', 'sncf', 'ratp', 'metro', 'bus', 'train', 'essence', 'carburant', 'gazole', 'peage', 'parking', 'leasing', 'loa', 'lld', 'velo', 'transport', 'autoroute']],
  ['education', ['ecole', 'scolaire', 'scolarite', 'cantine', 'garderie', 'creche', 'nounou', 'periscolaire', 'soutien', 'universite', 'formation', 'garde', 'etude']],
];
function inferFixCat(name) {
  const n = deacc(name);
  for (const [id, words] of FIX_HINTS) if (words.some(w => n.includes(w))) return id;
  return 'autre';
}
function catFor(kind, it) {
  const k = CK[kind];
  if (!k) return { id: '', label: '', e: '💶', c: 'var(--pos)' };
  const v = kind === 'fixed' ? (it.cat || inferFixCat(it.name)) : it.cat;
  return catResolve(k, v);
}

/* ---------- Firebase ---------- */
let USE_FIREBASE = /^AIza/.test(FIREBASE_CONFIG.apiKey || '');
const F = {};
if (USE_FIREBASE) {
  try {
    const v = '10.12.5';
    const [appM, authM, fsM] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`),
    ]);
    const app = appM.initializeApp(FIREBASE_CONFIG);
    F.authM = authM; F.fsM = fsM;
    F.auth = authM.getAuth(app);
    F.db = fsM.getFirestore(app);
  } catch (err) {
    console.error('Firebase indisponible, repli en mode local.', err);
    USE_FIREBASE = false;
  }
}

/* ---------- état ---------- */
const now0 = new Date();
let data = { income: [], fixed: [], plans: {}, extra: [], reals: {} };
let ym = mkey(now0.getFullYear(), now0.getMonth() + 1);
let tab = 'fixes';
let editing = null;
let detail = null;

const SORTS = [['amount-desc', 'Montant ↓'], ['amount-asc', 'Montant ↑'], ['name', 'Nom A→Z'], ['cat', 'Catégorie'], ['recent', 'Ajout récent']];
let listView = {
  income: { group: false, sort: 'amount-desc', filter: 'all', q: '' },
  fixed:  { group: true,  sort: 'amount-desc', filter: 'all', q: '' },
  extra:  { group: true,  sort: 'amount-desc', filter: 'all', q: '' },
};
const LIST_META = {
  income: { title: 'Revenus', ph: 'Ex. Salaire', versioned: true,
    note: 'Ce qui rentre chaque mois. Un nouveau montant s’applique à partir du mois affiché et des suivants — jamais des précédents.' },
  fixed:  { title: 'Frais fixes', ph: 'Ex. Loyer, Netflix, assurance auto…', versioned: true,
    note: 'Ce qui sort chaque mois, classé par catégorie. Un nouveau montant s’applique à partir du mois affiché et des suivants.' },
  extra:  { title: 'Rentrées exceptionnelles', ph: 'Ex. Prime de fin d’année, vente, remboursement…', versioned: false,
    note: 'Une rentrée ponctuelle : un libellé, une catégorie, un montant. Elle ne compte que sur le mois affiché, sans prévu ni réel.' },
};

/* plans = provisions du mois ; reals = dépenses réelles du mois (rapprochées via planId) */
const plans = () => data.plans[ym] || (data.plans[ym] = []);
const reals = () => data.reals[ym] || (data.reals[ym] = []);
const realsAt = k => data.reals[k] || [];
const incomeAt = k => data.income.filter(it => applies(it, k));
const fixedAt = k => data.fixed.filter(it => applies(it, k));
const extraAt = k => data.extra.filter(it => it.month === k);
const incAt = k => sum(incomeAt(k), 'amount') + sum(extraAt(k), 'amount');
const fixAt = k => sum(fixedAt(k), 'amount');
const extAt = k => sum(extraAt(k), 'amount');
/* Dépenses réelles « Non prévu » (sans provision, ou provision supprimée) : elles réduisent le reste à vivre. */
const unplannedAt = k => {
  const provs = data.plans[k] || [];
  return sum(realsAt(k).filter(r => !r.planId || !provs.some(p => p.id === r.planId)), 'amount');
};
const listSource = kind => kind === 'income' ? incomeAt(ym) : kind === 'fixed' ? fixedAt(ym) : extraAt(ym);
const chainOf = (kind, it) => data[kind].filter(x => (x.root || x.id) === (it.root || it.id));

function mname() { return mlabel(ym); }
const planPayload = it => ({ type: 'prov', name: it.name, cat: it.cat, amount: +it.amount || 0, month: it.month || ym, ts: it.ts || Date.now() });
const realPayload = it => ({ type: 'real', name: it.name, cat: it.cat, amount: +it.amount || 0, planId: it.planId || '', month: it.month || ym, ts: it.ts || Date.now() });
function payloadOf(kind, it) {
  const p = { name: it.name, amount: +it.amount || 0, ts: it.ts || Date.now() };
  if (kind === 'fixed') p.cat = it.cat || inferFixCat(it.name);
  if (kind === 'income' || kind === 'fixed') { p.from = it.from || null; p.to = it.to || null; p.root = it.root || it.id; }
  if (kind === 'extra') { p.cat = it.cat || 'autre'; p.month = it.month || ym; }
  return p;
}

function loadViewPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('budget.view.' + store.email) || 'null');
    if (p) Object.keys(listView).forEach(k => { if (p[k]) listView[k] = { ...listView[k], ...p[k], q: '' }; });
  } catch (e) {}
}
function saveViewPrefs() {
  try {
    const o = {};
    Object.keys(listView).forEach(k => { const { group, sort, filter } = listView[k]; o[k] = { group, sort, filter }; });
    localStorage.setItem('budget.view.' + store.email, JSON.stringify(o));
  } catch (e) {}
}

/* ---------- écritures ---------- */
const inflight = new Set();
async function write(fn) {
  const p = (async () => { await fn(); })();
  inflight.add(p);
  try { await p; }
  catch (err) { console.error(err); toast(frErr(err)); }
  finally { inflight.delete(p); }
}
function flushSaves() { if (inflight.size) Promise.allSettled([...inflight]); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSaves(); });
window.addEventListener('pagehide', flushSaves);

/* ---------- couche données ---------- */
const store = {
  user: null, currentView: 'self', linkedAccounts: [], sharedWith: [], pendingSent: [],
  _uids: {}, _unsubs: [], _targetUid: null, _recovering: false,
  _prefsUnsub: null, _prefsTimer: null, _catsUnsub: null, _catsTimer: null, _fixDone: false, _realMigDone: false,

  async init() {
    if (USE_FIREBASE) {
      return new Promise(res => F.authM.onAuthStateChanged(F.auth, async u => {
        this.user = u;
        if (u) { await this.ensureProfile(); await this.loadLinkedAccounts(); }
        res(u);
      }));
    }
    const s = localStorage.getItem('solde.session');
    this.user = s ? { email: s, emailVerified: true } : null;
    if (this.user) await this.loadLinkedAccounts();
    return this.user;
  },

  async register(email, pass) {
    if (USE_FIREBASE) {
      await F.authM.createUserWithEmailAndPassword(F.auth, email, pass);
      this.user = F.auth.currentUser;
      try { await F.authM.sendEmailVerification(this.user); } catch (e) { console.warn(e); }
      await this.ensureProfile();
    } else {
      if (pass.length < 6) throw new Error("Mot de passe : 6 caractères minimum.");
      const users = JSON.parse(localStorage.getItem('solde.users') || '{}');
      if (users[email]) throw new Error("Un compte existe déjà avec cet e-mail.");
      users[email] = { pass: btoa(pass) };
      localStorage.setItem('solde.users', JSON.stringify(users));
      localStorage.setItem('solde.session', email);
      this.user = { email, emailVerified: true };
    }
    await this.loadLinkedAccounts();
  },

  async login(email, pass) {
    if (USE_FIREBASE) {
      await F.authM.signInWithEmailAndPassword(F.auth, email, pass);
      this.user = F.auth.currentUser;
      await this.ensureProfile();
    } else {
      const users = JSON.parse(localStorage.getItem('solde.users') || '{}');
      if (!users[email] || users[email].pass !== btoa(pass)) throw new Error("E-mail ou mot de passe incorrect.");
      localStorage.setItem('solde.session', email);
      this.user = { email, emailVerified: true };
    }
    await this.loadLinkedAccounts();
  },

  async resetPassword(email) {
    if (!USE_FIREBASE) throw new Error("Mode démo : réinitialisation indisponible.");
    await F.authM.sendPasswordResetEmail(F.auth, email);
  },
  async resendVerification() { if (USE_FIREBASE && F.auth.currentUser) await F.authM.sendEmailVerification(F.auth.currentUser); },
  async refreshVerification() {
    if (!USE_FIREBASE || !F.auth.currentUser) return;
    await F.authM.reload(F.auth.currentUser);
    this.user = F.auth.currentUser;
    await this.user.getIdToken(true);
    await this.ensureProfile();
  },
  get verified() { return !USE_FIREBASE || !!(this.user && this.user.emailVerified); },

  async logout() {
    this.closeData(); this.closePrefs();
    if (USE_FIREBASE) await F.authM.signOut(F.auth);
    else localStorage.removeItem('solde.session');
    this.user = null; this.linkedAccounts = []; this.sharedWith = []; this.pendingSent = [];
    this.currentView = 'self';
  },

  get uid() { return USE_FIREBASE ? this.user.uid : 'local'; },
  get email() { return (this.user && this.user.email) || 'local'; },
  get isSelf() { return this.currentView === 'self'; },
  get currentLink() { return this.linkedAccounts.find(l => l.ownerEmail === this.currentView) || null; },
  get canWrite() { return this.isSelf || (this.currentLink ? this.currentLink.permissions === 'write' : false); },
  get viewEmail() { return this.isSelf ? this.email : this.currentView; },

  async ensureProfile() {
    if (!USE_FIREBASE) return;
    try {
      const { doc, setDoc } = F.fsM;
      await setDoc(doc(F.db, 'profiles', this.uid),
        { email: this.email, emailLower: low(this.email), verified: !!this.user.emailVerified }, { merge: true });
    } catch (e) { console.warn('Profil non publié :', e); }
  },

  async resolveUser(email) {
    if (!USE_FIREBASE) return { uid: email, email };
    const key = low(email);
    if (this._uids[key]) return this._uids[key];
    const { collection, query, where, getDocs } = F.fsM;
    let snap = await getDocs(query(collection(F.db, 'profiles'), where('emailLower', '==', key)));
    if (snap.empty) snap = await getDocs(query(collection(F.db, 'profiles'), where('email', '==', email.trim())));
    if (snap.empty) throw new Error("Compte introuvable : la personne doit se connecter au moins une fois.");
    const d = snap.docs[0].data();
    const res = { uid: snap.docs[0].id, email: d.email || email.trim() };
    this._uids[key] = res;
    return res;
  },

  /* ========== APPARENCE ========== */
  async openPrefs() {
    this.closePrefs();
    if (!USE_FIREBASE || !this.user) { setSaveState('Enregistré sur cet appareil'); return; }
    const { doc, getDoc, setDoc, onSnapshot } = F.fsM;
    const ref = doc(F.db, 'users', this.uid, 'meta', 'prefs');
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) applyPrefs(snap.data(), { notify: false });
      else await setDoc(ref, getPrefs(), { merge: true });
      setSaveState('Enregistré sur votre profil ✓');
    } catch (e) { console.warn('Préférences :', e); }
    this._prefsUnsub = onSnapshot(ref, s => {
      if (s.exists()) { applyPrefs(s.data(), { notify: false }); setSaveState('Enregistré sur votre profil ✓'); }
    }, () => {});
  },
  closePrefs() { if (this._prefsUnsub) { try { this._prefsUnsub(); } catch (e) {} this._prefsUnsub = null; } },
  queuePrefs(p) {
    clearTimeout(this._prefsTimer);
    if (!USE_FIREBASE || !this.user) { setSaveState('Enregistré sur cet appareil'); return; }
    setSaveState('Enregistrement…');
    this._prefsTimer = setTimeout(async () => {
      try {
        const { doc, setDoc } = F.fsM;
        await setDoc(doc(F.db, 'users', this.uid, 'meta', 'prefs'), p, { merge: true });
        setSaveState('Enregistré sur votre profil ✓');
      } catch (e) { setSaveState('Non enregistré — hors ligne ?'); }
    }, 400);
  },

  /* ========== CATÉGORIES DU BUDGET ========== */
  async openCats() {
    this.closeCats();
    const key = this.viewEmail;
    applySets(readCatsCache(key) || readCatsCache('last') || CAT_DEFAULTS, { notify: false, cacheKey: key });
    render();
    if (!USE_FIREBASE || !this._targetUid) return;
    const { doc, getDoc, setDoc, onSnapshot } = F.fsM;
    const ref = doc(F.db, 'users', this._targetUid, 'meta', 'cats');
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) applySets(snap.data(), { notify: false, cacheKey: key });
      else if (this.canWrite) await setDoc(ref, getSets(), { merge: true });
    } catch (e) { console.warn('Catégories :', e); }
    render(); refreshCatsUI();
    this._catsUnsub = onSnapshot(ref, s => {
      if (!s.exists()) return;
      applySets(s.data(), { notify: false, cacheKey: key });
      render(); refreshDetail(); refreshCatsUI();
    }, () => {});
  },
  closeCats() { if (this._catsUnsub) { try { this._catsUnsub(); } catch (e) {} this._catsUnsub = null; } },
  queueCats(sets) {
    clearTimeout(this._catsTimer);
    if (!this.canWrite) { toast('Lecture seule : catégories non modifiables'); return; }
    if (!USE_FIREBASE || !this._targetUid) { refreshCatsUI(); return; }
    this._catsTimer = setTimeout(() => {
      write(async () => {
        const { doc, setDoc } = F.fsM;
        await setDoc(doc(F.db, 'users', this._targetUid, 'meta', 'cats'), sets, { merge: true });
      });
    }, 400);
  },

  /* ========== INVITATIONS ========== */
  async sendInvitation(toEmail, permissions) {
    const target = await this.resolveUser(toEmail);
    if (target.uid === this.uid) throw new Error("Vous ne pouvez pas vous inviter vous-même.");
    if (USE_FIREBASE) {
      const { doc, getDoc, setDoc } = F.fsM;
      const link = await getDoc(doc(F.db, 'linkedAccounts', `${this.uid}__${target.uid}`));
      if (link.exists()) throw new Error("Cette personne a déjà accès à votre budget.");
      const ref = doc(F.db, 'invitations', `${this.uid}__${low(target.email)}`);
      const ex = await getDoc(ref);
      if (ex.exists() && ex.data().status === 'pending') throw new Error("Une invitation est déjà en attente pour cet e-mail.");
      await setDoc(ref, { fromUid: this.uid, fromEmail: this.email, toUid: target.uid, toEmail: target.email,
        permissions, status: 'pending', timestamp: Date.now() });
    } else {
      const inv = JSON.parse(localStorage.getItem('solde.invitations') || '[]');
      if (inv.some(i => i.fromEmail === this.email && low(i.toEmail) === low(target.email) && i.status === 'pending'))
        throw new Error("Une invitation est déjà en attente pour cet e-mail.");
      inv.push({ id: `${this.uid}__${low(target.email)}`, fromUid: this.uid, fromEmail: this.email, toUid: target.uid,
        toEmail: target.email, permissions, status: 'pending', timestamp: Date.now() });
      localStorage.setItem('solde.invitations', JSON.stringify(inv));
    }
    await this.loadSharedWith();
  },

  async getPendingInvitations() {
    if (USE_FIREBASE) {
      const { collection, query, where, getDocs } = F.fsM;
      const snap = await getDocs(query(collection(F.db, 'invitations'),
        where('toEmail', '==', this.email), where('status', '==', 'pending')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    const inv = JSON.parse(localStorage.getItem('solde.invitations') || '[]');
    return inv.filter(i => low(i.toEmail) === low(this.email) && i.status === 'pending');
  },

  async respondToInvitation(inv, accept) {
    if (inv.fromUid && inv.id !== `${inv.fromUid}__${low(this.email)}`)
      throw new Error("Invitation d'une ancienne version : demandez à la personne de vous la renvoyer.");
    if (USE_FIREBASE) {
      const { doc, updateDoc, setDoc } = F.fsM;
      await updateDoc(doc(F.db, 'invitations', inv.id), { status: accept ? 'accepted' : 'refused' });
      if (accept) {
        await setDoc(doc(F.db, 'linkedAccounts', `${inv.fromUid}__${this.uid}`), {
          ownerUid: inv.fromUid, linkedUid: this.uid, ownerEmail: inv.fromEmail, linkedEmail: this.email,
          permissions: inv.permissions, status: 'accepted', timestamp: Date.now()
        });
      }
    } else {
      const all = JSON.parse(localStorage.getItem('solde.invitations') || '[]');
      const item = all.find(i => i.id === inv.id);
      if (!item) throw new Error("Invitation introuvable.");
      item.status = accept ? 'accepted' : 'refused';
      localStorage.setItem('solde.invitations', JSON.stringify(all));
      if (accept) {
        const linked = JSON.parse(localStorage.getItem('solde.linked') || '[]');
        linked.push({ id: `${inv.fromUid}__${this.uid}`, ownerUid: inv.fromUid, linkedUid: this.uid,
          ownerEmail: inv.fromEmail, linkedEmail: this.email, permissions: inv.permissions,
          status: 'accepted', timestamp: Date.now() });
        localStorage.setItem('solde.linked', JSON.stringify(linked));
      }
    }
    await this.loadLinkedAccounts();
  },

  async cancelInvitation(id) {
    if (USE_FIREBASE) { const { doc, deleteDoc } = F.fsM; await deleteDoc(doc(F.db, 'invitations', id)); }
    else {
      const all = JSON.parse(localStorage.getItem('solde.invitations') || '[]');
      localStorage.setItem('solde.invitations', JSON.stringify(all.filter(i => i.id !== id)));
    }
    await this.loadSharedWith();
  },

  async loadLinkedAccounts() {
    if (USE_FIREBASE) {
      const { collection, query, where, getDocs } = F.fsM;
      const snap = await getDocs(query(collection(F.db, 'linkedAccounts'), where('linkedUid', '==', this.uid)));
      this.linkedAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => (l.status || 'accepted') === 'accepted');
    } else {
      const linked = JSON.parse(localStorage.getItem('solde.linked') || '[]');
      this.linkedAccounts = linked.filter(l => low(l.linkedEmail) === low(this.email));
    }
  },

  async loadSharedWith() {
    if (!this.isSelf) { this.sharedWith = []; this.pendingSent = []; return; }
    if (USE_FIREBASE) {
      const { collection, query, where, getDocs } = F.fsM;
      const snap = await getDocs(query(collection(F.db, 'linkedAccounts'), where('ownerUid', '==', this.uid)));
      this.sharedWith = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const inv = await getDocs(query(collection(F.db, 'invitations'),
        where('fromUid', '==', this.uid), where('status', '==', 'pending')));
      this.pendingSent = inv.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const linked = JSON.parse(localStorage.getItem('solde.linked') || '[]');
      this.sharedWith = linked.filter(l => l.ownerUid === this.uid);
      const all = JSON.parse(localStorage.getItem('solde.invitations') || '[]');
      this.pendingSent = all.filter(i => i.fromUid === this.uid && i.status === 'pending');
    }
  },

  async removeLink(linkId) {
    if (USE_FIREBASE) { const { doc, deleteDoc } = F.fsM; await deleteDoc(doc(F.db, 'linkedAccounts', linkId)); }
    else {
      const linked = JSON.parse(localStorage.getItem('solde.linked') || '[]');
      localStorage.setItem('solde.linked', JSON.stringify(linked.filter(l => l.id !== linkId)));
    }
    const gone = this.linkedAccounts.find(l => l.id === linkId);
    if (gone && gone.ownerEmail === this.currentView) this.currentView = 'self';
    await this.loadLinkedAccounts();
    await this.loadSharedWith();
  },

  /* ========== DONNÉES ========== */
  _localKey() { return 'budget.data.' + this.viewEmail; },
  _saveLocal() { localStorage.setItem(this._localKey(), JSON.stringify(data)); },
  closeData() { this._unsubs.forEach(u => { try { u(); } catch (e) {} }); this._unsubs = []; this.closeCats(); this._targetUid = null; },

  async openData() {
    this.closeData();
    data = { income: [], fixed: [], plans: {}, extra: [], reals: {} };
    editing = null; closeDetail(); this._fixDone = false; this._realMigDone = false;
    render();
    if (!USE_FIREBASE) {
      const d = JSON.parse(localStorage.getItem(this._localKey()) || 'null') || {};
      data = { income: d.income || [], fixed: d.fixed || [], plans: d.plans || {}, extra: d.extra || [], reals: d.reals || {} };
      await this.openCats();
      render(); this.categorizeFixed(); this.migrateReals(); refreshCatsUI(); return;
    }
    const targetUid = this.isSelf ? this.uid : (await this.resolveUser(this.currentView)).uid;
    this._targetUid = targetUid;
    await this.openCats();
    try { await this.migrateLegacy(targetUid); } catch (e) { console.warn('Migration :', e); }
    const { collection, onSnapshot } = F.fsM;
    ['income', 'fixed', 'plans', 'extra'].forEach(kind => {
      const un = onSnapshot(collection(F.db, 'users', targetUid, kind), snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ts || 0) - (b.ts || 0));
        if (kind === 'plans') {
          /* Une seule collection "plans" : type "real" = dépense réelle, sinon provision. */
          const mp = {}, mr = {};
          items.forEach(x => {
            const k = x.month || ym;
            if (x.type === 'real') (mr[k] || (mr[k] = [])).push(x);
            else (mp[k] || (mp[k] = [])).push(x);
          });
          data.plans = mp; data.reals = mr;
          this.migrateReals();
        } else data[kind] = items;
        render();
        if (kind === 'fixed') this.categorizeFixed();
        if (detail) refreshDetail();
        refreshCatsUI();
      }, err => {
        console.error('Synchro :', err);
        if (!this.isSelf && !this._recovering) {
          this._recovering = true;
          toast('Accès retiré — retour à votre compte.');
          this.currentView = 'self';
          applyViewMode();
          this.openData().finally(() => { this._recovering = false; });
        } else toast('Synchronisation interrompue : ' + frErr(err));
      });
      this._unsubs.push(un);
    });
  },

  async migrateLegacy(targetUid) {
    if (!this.canWrite) return;
    const { doc, getDoc, writeBatch } = F.fsM;
    const ref = doc(F.db, 'users', targetUid, 'meta', 'budget');
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const old = snap.data();
    if (old.migrated) return;
    const batch = writeBatch(F.db);
    const base = Date.now(); let n = 0;
    (old.income || []).forEach(it => { if (it.id) batch.set(doc(F.db, 'users', targetUid, 'income', it.id), { name: it.name, amount: +it.amount || 0, from: null, to: null, root: it.id, ts: base + (n++) }); });
    (old.fixed || []).forEach(it => { if (it.id) batch.set(doc(F.db, 'users', targetUid, 'fixed', it.id), { name: it.name, amount: +it.amount || 0, cat: it.cat || inferFixCat(it.name), from: null, to: null, root: it.id, ts: base + (n++) }); });
    Object.keys(old.plans || {}).forEach(month => {
      (old.plans[month] || []).forEach(it => {
        if (it.id) batch.set(doc(F.db, 'users', targetUid, 'plans', it.id),
          { name: it.name, cat: it.cat, amount: +it.amount || 0, real: it.real == null ? '' : it.real, month, ts: base + (n++) });
      });
    });
    batch.set(ref, { migrated: true }, { merge: true });
    await batch.commit();
  },

  /* Ancien champ "real" des dépenses prévues → dépense réelle liée à sa provision. */
  async migrateReals() {
    if (this._realMigDone || !this.canWrite) return;
    this._realMigDone = true;
    const jobs = [];
    Object.keys(data.plans).forEach(mo => {
      (data.plans[mo] || []).forEach(p => {
        if (p.real !== '' && p.real != null && !isNaN(+p.real)) {
          const item = { id: uid(), type: 'real', name: p.name, cat: p.cat, amount: +p.real, planId: p.id, month: mo, ts: Date.now() + jobs.length };
          (data.reals[mo] || (data.reals[mo] = [])).push(item);
          jobs.push({ p, item });
        }
      });
    });
    if (!jobs.length) return;
    jobs.forEach(j => { j.p.real = ''; });
    render();
    if (!USE_FIREBASE) {
      this._saveLocal();
      toast(jobs.length + ' ancien' + (jobs.length > 1 ? 's' : '') + ' montant' + (jobs.length > 1 ? 's' : '') + ' réel' + (jobs.length > 1 ? 's' : '') + ' converti' + (jobs.length > 1 ? 's' : '') + ' en dépense' + (jobs.length > 1 ? 's' : '') + ' réelle' + (jobs.length > 1 ? 's' : '') + ' ✦');
      return;
    }
    const ops = [];
    jobs.forEach(j => {
      ops.push({ type: 'set', id: j.item.id, fields: realPayload(j.item) });
      ops.push({ type: 'update', id: j.p.id, fields: { real: '' } });
    });
    try { await this.batchOps('plans', ops); toast('Anciens montants réels convertis en dépenses réelles ✦'); }
    catch (e) { this._realMigDone = false; console.warn('Migration réel :', e); }
  },

  async categorizeFixed() {
    if (this._fixDone || !this.canWrite) return;
    const missing = data.fixed.filter(it => !it.cat);
    if (!missing.length) return;
    this._fixDone = true;
    const jobs = missing.map(it => ({ id: it.id, cat: inferFixCat(it.name) }));
    jobs.forEach(j => { const it = data.fixed.find(x => x.id === j.id); if (it) it.cat = j.cat; });
    render();
    const plural = jobs.length > 1 ? 's' : '';
    if (!USE_FIREBASE) { this._saveLocal(); toast(`${jobs.length} ligne${plural} catégorisée${plural} ✦`); return; }
    try {
      const { doc, updateDoc } = F.fsM;
      await Promise.all(jobs.map(j => updateDoc(doc(F.db, 'users', this._targetUid, 'fixed', j.id), { cat: j.cat })));
      toast(`${jobs.length} ligne${plural} de frais fixes catégorisée${plural} ✦`);
    } catch (e) { this._fixDone = false; }
  },

  _check() { if (!this.canWrite) throw new Error("Mode lecture seule : modification interdite."); },
  async addItem(kind, id, payload) {
    this._check();
    if (USE_FIREBASE) { const { doc, setDoc } = F.fsM; await setDoc(doc(F.db, 'users', this._targetUid, kind, id), payload); }
    else this._saveLocal();
  },
  async updateItem(kind, id, fields) {
    this._check();
    if (USE_FIREBASE) { const { doc, updateDoc } = F.fsM; await updateDoc(doc(F.db, 'users', this._targetUid, kind, id), fields); }
    else this._saveLocal();
  },
  async deleteItem(kind, id) {
    this._check();
    if (USE_FIREBASE) { const { doc, deleteDoc } = F.fsM; await deleteDoc(doc(F.db, 'users', this._targetUid, kind, id)); }
    else this._saveLocal();
  },
  async batchOps(kind, ops) {
    this._check();
    if (!ops.length) return;
    if (!USE_FIREBASE) { this._saveLocal(); return; }
    const { doc, writeBatch } = F.fsM;
    const b = writeBatch(F.db);
    ops.forEach(o => {
      const ref = doc(F.db, 'users', this._targetUid, kind, o.id);
      if (o.type === 'set') b.set(ref, o.fields);
      else if (o.type === 'update') b.update(ref, o.fields);
      else b.delete(ref);
    });
    await b.commit();
  },
};

/* ---------- erreurs ---------- */
function frErr(err) {
  const code = err && err.code;
  if (code === 'permission-denied') return "Refusé par les règles Firestore (lecture seule ou e-mail non vérifié ?).";
  const map = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
    'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/network-request-failed': 'Connexion internet impossible.',
    'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard.',
  };
  return map[code] || (err && err.message) || 'Erreur inconnue.';
}

/* ---------- écart réel / provisions ---------- */
function gap() {
  const rs = reals();
  if (!rs.length) return { g: 0, n: 0 };
  return { g: sum(rs, 'amount') - sum(plans(), 'amount'), n: rs.length };
}
function gapHtml() { const r = gap(); if (!r.n) return '<span class="muted">Aucune dépense réelle saisie</span>'; const c = r.g > 0 ? 'neg' : (r.g < 0 ? 'eco' : 'pos'); const l = r.g > 0 ? 'dépassement' : (r.g < 0 ? 'économie' : 'pile dans le budget'); return '<span><b class="' + c + '">' + (r.g > 0 ? '+' : '') + f(r.g) + '</b> <span class="muted">' + l + '</span></span>'; }

/* ---------- résumé ---------- */
function renderSum() {
  const inc = incAt(ym), fix = fixAt(ym), pl = sum(plans(), 'amount'), ext = extAt(ym);
  const np = unplannedAt(ym);
  const rest = inc - fix - pl - np;
  const base = Math.max(inc, fix + pl + np, 1);
  const segs = [[fix, 'var(--c1)'], [pl, 'var(--c2)'], [np, 'var(--neg)'], [Math.max(rest, 0), 'var(--c3)']];
  let off = 0, arcs = '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--soft)" stroke-width="6"/>';
  segs.forEach(s => { const p = s[0] / base * 100; if (p > 0) { arcs += '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="' + s[1] + '" stroke-width="6" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + (25 - off) + '"/>'; off += p; } });
  const gp = gap(), gpct = Math.abs(gp.g) / base * 100, gs = (fix + pl) / base * 100;
  if (gp.n && gpct > 0) {
    let gl, gst;
    if (gp.g > 0) { gl = Math.min(gpct, 100); gst = Math.min(gs, 100 - gl); }
    else { gl = Math.min(gpct, pl / base * 100); gst = gs - gl; }
    arcs += '<circle cx="21" cy="21" r="20" fill="none" stroke="' + (gp.g > 0 ? 'var(--neg)' : 'var(--eco)') + '" stroke-width="1.6" pathLength="100" stroke-dasharray="' + gl + ' ' + (100 - gl) + '" stroke-dashoffset="' + (25 - gst) + '"/>';
  }
  $('#sum').innerHTML =
    '<div class="pie"><div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="Répartition des revenus : frais fixes, provisions, non prévu et reste">' + arcs + '</svg>' +
    '<div class="mid"><span>' + (rest < 0 ? 'Déficit' : 'Reste à vivre') + '</span><b class="' + (rest < 0 ? 'neg' : 'pos') + '">' + fc0.format(rest) + '</b>' +
    (ext > 0 ? '<span class="gold">+' + fc0.format(ext) + ' exceptionnel</span>' : '') +
    (gp.n ? '<span class="' + (gp.g > 0 ? 'neg' : 'eco') + '">' + (gp.g > 0 ? '+' : '') + fc0.format(gp.g) + ' d’écart</span>' : '') + '</div></div>' +
    '<div class="legend">' +
    '<div><i style="background:transparent;border:2px solid var(--ink)"></i><span>Revenus</span><b>' + f(inc) + '</b></div>' +
    (ext > 0 ? '<div class="lg-ext"><i style="background:var(--gold)"></i><span>dont exceptionnel</span><b>' + f(ext) + '</b></div>' : '') +
    '<div><i style="background:var(--c1)"></i><span>Frais fixes</span><b>' + f(fix) + '</b></div>' +
    '<div><i style="background:var(--c2)"></i><span>Provisions</span><b>' + f(pl) + '</b></div>' +
    (np > 0 ? '<div><i style="background:var(--neg)"></i><span>Non prévu</span><b>-' + f(np) + '</b></div>' : '') +
    '<div><i style="background:var(--c3)"></i><span>Reste</span><b>' + f(rest) + '</b></div>' +
    (gp.n ? '<div><i style="background:transparent;border:2px solid ' + (gp.g > 0 ? 'var(--neg)' : 'var(--eco)') + '"></i><span>Anneau ext. : écart</span><b>' + (gp.g > 0 ? '+' : '') + f(gp.g) + '</b></div>' : '') +
    '</div></div>' +
    '<div class="gap"><span>Écart réel / provisions</span>' + gapHtml() + '</div>';
}

/* ---------- listes ---------- */
function sortItems(arr, mode, kind, cats) {
  const a = [...arr];
  const cn = it => cats ? catFor(kind, it).label : '';
  if (mode === 'amount-asc') a.sort((x, y) => (+x.amount) - (+y.amount));
  else if (mode === 'name') a.sort((x, y) => String(x.name).localeCompare(String(y.name), 'fr'));
  else if (mode === 'cat') a.sort((x, y) => cn(x).localeCompare(cn(y), 'fr') || (+y.amount) - (+x.amount));
  else if (mode === 'recent') a.sort((x, y) => (y.ts || 0) - (x.ts || 0));
  else a.sort((x, y) => (+y.amount) - (+x.amount));
  return a;
}

/* Menu déroulant des provisions du mois, avec la ligne « Non prévu ». */
function provOptions(selected) {
  const sel = selected || '';
  let h = '<option value=""' + (sel === '' ? ' selected' : '') + '>🚫 Non prévu</option>';
  plans().forEach(p => {
    const c = catFor('plans', p);
    h += '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(c.e) + ' ' + esc(p.name) + ' · ' + f(p.amount) + '</option>';
  });
  return h;
}

function editHTML(kind, it) {
  const meta = LIST_META[kind];
  const cats = (kind === 'plans' || kind === 'reals') ? catList('plan') : catsOf(kind);
  const cur = cats ? catFor(kind, it).id : null;
  const sel = cats ? '<select name="cat">' + cats.map(c =>
    '<option value="' + esc(c.id) + '"' + (c.id === cur ? ' selected' : '') + '>' + esc(c.e) + ' ' + esc(c.label) + '</option>').join('') + '</select>' : '';
  const prov = kind === 'reals' ? '<select name="plan" class="prov-select" aria-label="Provision liée">' + provOptions(it.planId) + '</select>' : '';
  const scope = meta && meta.versioned
    ? '<p class="fx-scope">Le montant s’appliquera à <b>' + esc(mname()) + '</b> et aux mois suivants. Les mois précédents gardent leurs montants ; le libellé et la catégorie sont mis à jour partout.</p>'
    : '';
  return '<form class="fx-edit" data-edit="' + kind + '" data-id="' + esc(it.id) + '">' +
    '<input name="name" value="' + esc(it.name) + '" required>' +
    '<input name="amount" type="number" step="0.01" min="0" value="' + (+it.amount) + '" required>' +
    sel + prov +
    '<button type="submit" title="Valider">✓</button>' +
    '<button type="button" class="ghost" data-cancel-edit>Annuler</button>' + scope + '</form>';
}

function rowHTML(kind, it, showCat) {
  if (editing && editing.kind === kind && editing.id === it.id) return editHTML(kind, it);
  const w = store.canWrite, meta = LIST_META[kind], cats = catsOf(kind);
  const c = cats ? catFor(kind, it) : null;
  const dot = c ? c.c : 'var(--pos)';
  const badges = [];
  if (meta.versioned) {
    if (it.from === ym) badges.push('<span class="vbadge new">à partir de ce mois</span>');
    if (chainOf(kind, it).length > 1) badges.push('<span class="vbadge hist">🕘 historique</span>');
  }
  const parts = [];
  if (showCat && c) parts.push(esc(c.e) + ' ' + esc(c.label));
  if (badges.length) parts.push(badges.join(' '));
  const small = parts.length ? '<small>' + parts.join(' · ') + '</small>' : '';
  const label = meta.versioned
    ? '<button type="button" class="nlink" data-detail="' + kind + '" data-id="' + esc(it.id) + '">' + esc(it.name) + '</button>'
    : esc(it.name);
  return '<div class="row"><span class="fx-dot" style="background:' + dot + '"></span>' +
    '<div class="n">' + label + small + '</div><b class="a">' + f(it.amount) + '</b>' +
    (w ? '<button type="button" class="x edit" data-edit-btn="' + kind + '" data-id="' + esc(it.id) + '" title="Modifier">✎</button>' +
    '<button type="button" class="x" data-del="' + kind + '" data-id="' + esc(it.id) + '" title="Supprimer">×</button>' : '') + '</div>';
}

function catBar(kind, items) {
  const g = {};
  items.forEach(it => { const c = catFor(kind, it).id; g[c] = (g[c] || 0) + (+it.amount || 0); });
  const e = Object.entries(g).sort((a, b) => b[1] - a[1]);
  const t = e.reduce((s, [, v]) => s + v, 0);
  if (!t) return '';
  return '<div class="fx-bar">' +
    e.map(([id, v]) => { const c = catFor(kind, { cat: id, name: '' }); return '<i style="width:' + (v / t * 100) + '%;background:' + c.c + '" title="' + esc(c.label) + ' : ' + f(v) + '"></i>'; }).join('') + '</div>';
}

function renderList(kind) {
  const meta = LIST_META[kind], w = store.canWrite, st = listView[kind], cats = catsOf(kind);
  const all = listSource(kind);
  const counts = {};
  if (cats) all.forEach(it => { const c = catFor(kind, it).id; counts[c] = (counts[c] || 0) + 1; });
  if (cats && st.filter !== 'all' && !counts[st.filter]) st.filter = 'all';
  const q = st.q.trim().toLowerCase();
  let items = all.filter(it => {
    if (q && !String(it.name).toLowerCase().includes(q)) return false;
    if (cats && st.filter !== 'all' && catFor(kind, it).id !== st.filter) return false;
    return true;
  });
  items = sortItems(items, st.sort, kind, cats);
  const shown = sum(items, 'amount'), totalAll = sum(all, 'amount');

  let h = '<section class="box"><div class="sec-head"><h2>' + meta.title + '</h2>' +
    (cats ? '<button class="ghost sm" type="button" data-cats-kind="' + CK[kind] + '">⚙️ Catégories</button>' : '') + '</div>' +
    '<p class="note">' + meta.note + '</p>';
  if (all.length) {
    h += '<div class="fx-tools">' +
      '<input type="search" class="fx-search" data-search="' + kind + '" placeholder="Rechercher…" value="' + esc(st.q) + '">' +
      '<select data-sort="' + kind + '" aria-label="Trier">' +
      SORTS.filter(s => cats || s[0] !== 'cat').map(s => '<option value="' + s[0] + '"' + (st.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select>' +
      (cats ? '<button type="button" class="ghost fx-toggle" data-group="' + kind + '" aria-pressed="' + st.group + '">' + (st.group ? '🗂️ Groupé' : '📋 Liste') + '</button>' : '') +
      '</div>';
    if (cats) {
      h += '<div class="fx-chips"><button type="button" class="chip" data-filter="' + kind + '" data-cat="all" aria-pressed="' + (st.filter === 'all') + '">Tous · ' + all.length + '</button>' +
        cats.filter(c => counts[c.id]).map(c =>
          '<button type="button" class="chip" data-filter="' + kind + '" data-cat="' + esc(c.id) + '" aria-pressed="' + (st.filter === c.id) + '"><i style="background:' + c.c + '"></i>' + esc(c.e) + ' ' + esc(c.label) + ' · ' + counts[c.id] + '</button>').join('') + '</div>';
      h += catBar(kind, all);
    }
  }
  if (!all.length) h += '<p class="empty">' + (kind === 'extra' ? 'Aucune rentrée exceptionnelle en ' + esc(mname()) + '.' : 'Rien pour l’instant.') + (w ? ' Ajoutez une ligne ci-dessous.' : '') + '</p>';
  else if (!items.length) h += '<p class="empty">Aucune ligne ne correspond à cette recherche.</p>';
  else if (cats && st.group) {
    const groups = {};
    items.forEach(it => { const c = catFor(kind, it).id; (groups[c] || (groups[c] = [])).push(it); });
    Object.keys(groups).sort((a, b) => sum(groups[b], 'amount') - sum(groups[a], 'amount')).forEach(cid => {
      const c = catFor(kind, { cat: cid, name: '' }), g = groups[cid];
      h += '<div class="fx-group"><span class="fx-dot" style="background:' + c.c + '"></span>' +
        '<span class="fx-gname">' + esc(c.e) + ' ' + esc(c.label) + '</span>' +
        '<span class="fx-gcount">' + g.length + '</span><b>' + f(sum(g, 'amount')) + '</b></div>';
      g.forEach(it => { h += rowHTML(kind, it, false); });
    });
  } else items.forEach(it => { h += rowHTML(kind, it, !!cats); });

  h += '<div class="tot"><span>' + (items.length !== all.length ? 'Total sélection' : 'Total') + '</span><b>' + f(shown) + '</b></div>';
  if (items.length !== all.length) h += '<div class="tot fx-sub"><span>Total général</span><b>' + f(totalAll) + '</b></div>';
  if (w) {
    const sel = cats ? '<select name="cat">' + cats.map(c => '<option value="' + esc(c.id) + '">' + esc(c.e) + ' ' + esc(c.label) + '</option>').join('') + '</select>' : '';
    h += '<form data-add="' + kind + '"><input name="name" placeholder="' + esc(meta.ph) + '" required>' +
      '<input name="amount" type="number" step="0.01" min="0" placeholder="Montant" required>' + sel +
      '<button type="submit">Ajouter</button></form>';
    h += '<p class="note fx-foot">' + (meta.versioned ? 'Ajoutée à partir de <b>' + esc(mname()) + '</b> et des mois suivants.' : 'Comptée uniquement en <b>' + esc(mname()) + '</b>.') + '</p>';
  }
  return h + '</section>';
}

/* Rentrées exceptionnelles : liste + bandeau annuel, désormais dans l'onglet Revenus & frais. */
function renderExtraTab() {
  const year = +ym.slice(0, 4);
  const months = [];
  for (let m = 1; m <= 12; m++) { const k = mkey(year, m); const t = extAt(k); if (t > 0) months.push({ k, m, t }); }
  const total = months.reduce((s, x) => s + x.t, 0);
  let strip = '';
  if (months.length) {
    strip = '<section class="box"><h2>Sur ' + year + '</h2><p class="note">' + f(total) + ' de rentrées exceptionnelles réparties sur ' + months.length + ' mois. Cliquez un mois pour y aller.</p><div class="ext-strip">' +
      months.map(x => '<button type="button" class="ext-chip' + (x.k === ym ? ' on' : '') + '" data-goto="' + x.k + '"><span>' + MN[x.m - 1] + '</span><b>' + f(x.t) + '</b></button>').join('') +
      '</div></section>';
  }
  return renderList('extra') + strip;
}

/* Onglet Revenus & frais : revenus + rentrées exceptionnelles (colonne gauche), frais fixes (colonne droite). */
function renderFixesTab() {
  return '<div class="fix-col">' + renderList('income') + renderExtraTab() + '</div>' + renderList('fixed');
}

/* ---------- provisions (anticipation du mois) ---------- */
function renderProvisions() {
  const items = plans(), w = store.canWrite, cats = catList('plan');
  let h = '<section class="box"><div class="sec-head"><h2>Provisions — ' + esc(mname()) + '</h2>' +
    '<button class="ghost sm" type="button" data-cats-kind="plan">⚙️ Catégories</button></div>' +
    '<p class="note">Anticipez vos dépenses du mois : une ligne par dépense à venir, avec le montant mis de côté. Pas de réel ici — le rapprochement se fait dans l’onglet <b>Réel</b>.</p>';
  if (!items.length) h += '<p class="empty">Aucune provision ce mois-ci.' + (w ? ' Ajoutez une ligne ci-dessous ou reprenez le mois précédent.' : '') + '</p>';
  items.forEach(it => {
    if (editing && editing.kind === 'plans' && editing.id === it.id) { h += editHTML('plans', it); return; }
    const c = catFor('plans', it);
    h += '<div class="row"><span class="fx-dot" style="background:' + c.c + '"></span>' +
      '<div class="n">' + esc(it.name) + '<small>' + esc(c.e) + ' ' + esc(c.label) + '</small></div>' +
      '<b class="a">' + f(it.amount) + '</b>' +
      (w ? '<button type="button" class="x edit" data-edit-btn="plans" data-id="' + esc(it.id) + '" title="Modifier">✎</button>' +
      '<button type="button" class="x" data-del="plan" data-id="' + esc(it.id) + '" title="Supprimer">×</button>' : '') + '</div>';
  });
  h += '<div class="tot"><span>Total provisionné</span><b>' + f(sum(items, 'amount')) + '</b></div>';
  if (w) {
    h += '<form data-add="plan"><input name="name" placeholder="Ex. Courses, restaurant, cadeau…" required>' +
      '<input name="amount" type="number" step="0.01" min="0" placeholder="Montant" required>' +
      '<select name="cat">' + cats.map(c => '<option value="' + esc(c.id) + '">' + esc(c.e) + ' ' + esc(c.label) + '</option>').join('') + '</select>' +
      '<button type="submit">Ajouter</button></form>';
    h += '<div class="foot"><button class="ghost" id="copy" type="button">Reprendre le mois précédent</button></div>';
  }
  return h + '</section>';
}

/* ---------- dépenses réelles + rapprochement ---------- */
function renderReals() {
  const provs = plans(), rs = reals(), w = store.canWrite, cats = catList('plan');
  const byPlan = {};
  let unplanned = 0, unplannedN = 0;
  rs.forEach(r => {
    if (r.planId && provs.some(p => p.id === r.planId)) (byPlan[r.planId] || (byPlan[r.planId] = [])).push(r);
    else { unplanned += +r.amount || 0; unplannedN++; }
  });

  let h = '<section class="box"><div class="sec-head"><h2>Dépenses réelles — ' + esc(mname()) + '</h2>' +
    '<button class="ghost sm" type="button" data-cats-kind="plan">⚙️ Catégories</button></div>' +
    '<p class="note">Saisissez vos vraies dépenses au fil du mois. À l’ajout, choisissez la <b>provision</b> concernée dans le menu déroulant — ou <b>🚫 Non prévu</b> si vous n’aviez rien provisionné.</p>';
  if (!rs.length) h += '<p class="empty">Aucune dépense réelle saisie ce mois-ci.</p>';
  rs.forEach(it => {
    if (editing && editing.kind === 'reals' && editing.id === it.id) { h += editHTML('reals', it); return; }
    const c = catFor('reals', it);
    const p = it.planId ? provs.find(x => x.id === it.planId) : null;
    const link = p ? '<span class="prov-tag">↳ ' + esc(p.name) + '</span>' : '<span class="prov-tag np">🚫 Non prévu</span>';
    h += '<div class="row"><span class="fx-dot" style="background:' + c.c + '"></span>' +
      '<div class="n">' + esc(it.name) + '<small>' + esc(c.e) + ' ' + esc(c.label) + ' · ' + link + '</small></div>' +
      '<b class="a">' + f(it.amount) + '</b>' +
      (w ? '<button type="button" class="x edit" data-edit-btn="reals" data-id="' + esc(it.id) + '" title="Modifier">✎</button>' +
      '<button type="button" class="x" data-del="real" data-id="' + esc(it.id) + '" title="Supprimer">×</button>' : '') + '</div>';
  });
  h += '<div class="tot"><span>Total dépensé</span><b>' + f(sum(rs, 'amount')) + '</b></div>';
  if (w) {
    h += '<form data-add="real"><input name="name" placeholder="Ex. Courses du 12, plein d’essence…" required>' +
      '<input name="amount" type="number" step="0.01" min="0" placeholder="Montant" required>' +
      '<select name="cat">' + cats.map(c => '<option value="' + esc(c.id) + '">' + esc(c.e) + ' ' + esc(c.label) + '</option>').join('') + '</select>' +
      '<select name="plan" class="prov-select" aria-label="Provision liée">' + provOptions('') + '</select>' +
      '<button type="submit">Ajouter</button></form>';
    h += '<p class="note fx-foot">Le menu déroulant liste les provisions de <b>' + esc(mname()) + '</b>. Une dépense « Non prévu » diminue votre <b>reste à vivre</b> et compte comme dépassement dans le bilan.</p>';
  }
  h += '</section>';

  h += '<section class="box"><h2>Rapprochement</h2>' +
    '<p class="note">Pour chaque provision : montant mis de côté, montant réellement dépensé et écart. <b class="eco">Vert</b> = économie, <b class="neg">rouge</b> = dépassement.</p>';
  if (!provs.length && !rs.length) h += '<p class="empty">Ajoutez des provisions dans l’onglet Provisions, puis vos dépenses ici.</p>';
  provs.forEach(p => {
    const c = catFor('plans', p);
    const linked = byPlan[p.id] || [];
    const spent = sum(linked, 'amount');
    const d = spent - (+p.amount || 0);
    const right = !linked.length
      ? '<span class="vbadge wait">en attente</span>'
      : '<span class="delta ' + gcls(d) + '">' + (d > 0 ? '+' : '') + f(d) + '</span>';
    h += '<div class="row recon"><span class="fx-dot" style="background:' + c.c + '"></span>' +
      '<div class="n">' + esc(p.name) + '<small>provisionné ' + f(p.amount) + ' · dépensé ' + f(spent) + (linked.length > 1 ? ' · ' + linked.length + ' dépenses' : '') + '</small></div>' +
      right + '</div>';
  });
  h += '<div class="row recon np"><span class="fx-dot" style="background:var(--neg)"></span>' +
    '<div class="n">🚫 Non prévu<small>' + unplannedN + ' dépense' + (unplannedN > 1 ? 's' : '') + ' sans provision</small></div>' +
    '<span class="delta ' + (unplanned > 0 ? 'neg' : 'muted') + '">' + (unplanned > 0 ? '+' : '') + f(unplanned) + '</span></div>';
  h += '<div class="tot"><span>Provisions</span><b>' + f(sum(provs, 'amount')) + '</b></div>';
  h += '<div class="tot fx-sub"><span>Réel</span><b>' + f(sum(rs, 'amount')) + '</b></div>';
  h += '<div class="gap"><span>Écart réel / provisions</span>' + gapHtml() + '</div>';
  h += '</section>';
  return h;
}

/* ---------- bilan ---------- */
const MN = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
let yr = now0.getFullYear(), pFrom = 1, pTo = 12;
function mdata(y, m) {
  const k = mkey(y, m);
  const pv = data.plans[k] || [], rs = data.reals[k] || [];
  const d = { k, inc: incAt(k), fix: fixAt(k), ext: extAt(k), pl: sum(pv, 'amount'), n: rs.length, real: sum(rs, 'amount') };
  d.np = unplannedAt(k);   d.gap = d.n ? d.real - d.pl : 0; 
  d.rest = d.inc - d.fix - d.pl - d.np;
  return d;
}
function gcls(g) { return g > 0 ? 'neg' : (g < 0 ? 'eco' : 'pos'); }
function sg(g) { return (g > 0 ? '+' : '') + f(g); }
function card(l, v, c) { return '<div class="card"><span>' + l + '</span><b' + (c ? ' class="' + c + '"' : '') + '>' + v + '</b></div>'; }
function rect(x, y, w, h, c) { return h > 0 ? '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '" rx="2"/>' : ''; }

function periodSplit(kind, ms) {
  const g = {};
  ms.forEach(x => {
    const src = kind === 'fixed' ? fixedAt(x.k) : extraAt(x.k);
    src.forEach(it => { const c = catFor(kind, it).id; g[c] = (g[c] || 0) + (+it.amount || 0); });
  });
  const e = Object.entries(g).sort((a, b) => b[1] - a[1]);
  const t = e.reduce((s, [, v]) => s + v, 0);
  if (!t) return '';
  const bar = '<div class="fx-bar lg">' +
    e.map(([id, v]) => { const c = catFor(kind, { cat: id, name: '' }); return '<i style="width:' + (v / t * 100) + '%;background:' + c.c + '" title="' + esc(c.label) + ' : ' + f(v) + '"></i>'; }).join('') + '</div>';
  const legend = e.map(([id, v]) => {
    const c = catFor(kind, { cat: id, name: '' });
    return '<div class="fx-lrow"><span class="fx-dot" style="background:' + c.c + '"></span>' +
      '<span class="fx-lname">' + esc(c.e) + ' ' + esc(c.label) + '</span><b>' + f(v) + '</b>' +
      '<span class="fx-lpct">' + Math.round(v / t * 100) + ' %</span></div>';
  }).join('');
  const title = kind === 'fixed' ? 'Répartition des frais fixes' : 'Rentrées exceptionnelles par nature';
  const sub = kind === 'fixed' ? f(t) + ' sur la période, mois par mois selon les montants en vigueur.' : f(t) + ' sur la période (' + ms.length + ' mois).';
  return '<section class="box"><h2>' + title + '</h2><p class="note">' + sub + '</p>' + bar + '<div class="fx-legend">' + legend + '</div></section>';
}

function renderYear() {
  const ms = [];
  for (let i = pFrom; i <= pTo; i++) ms.push({ m: i, d: mdata(yr, i) });
  const N = ms.length;
  let tInc = 0, tFix = 0, tPl = 0, tGap = 0, tN = 0, tReal = 0, tExt = 0, tNp = 0;
  ms.forEach(x => { tInc += x.d.inc; tFix += x.d.fix; tPl += x.d.pl; tGap += x.d.gap; tN += x.d.n; tReal += x.d.real; tExt += x.d.ext; tNp += x.d.np; });
  const tRest = tInc - tFix - tPl - tNp;
  const presets = [['Année', 1, 12], ['T1', 1, 3], ['T2', 4, 6], ['T3', 7, 9], ['T4', 10, 12], ['S1', 1, 6], ['S2', 7, 12]];
  const opts = sel => MN.map((n, k) => '<option value="' + (k + 1) + '"' + (sel === k + 1 ? ' selected' : '') + '>' + n + '</option>').join('');
  const full = pFrom === 1 && pTo === 12;
  let h = '<div class="month" style="margin-bottom:14px"><button type="button" class="ghost" data-yr="-1" aria-label="Année précédente">‹</button><b>' + yr + '</b><button type="button" class="ghost" data-yr="1" aria-label="Année suivante">›</button></div>';
  h += '<section class="box"><h2>Période</h2><div class="presets">' + presets.map(p => '<button type="button" class="chip" data-preset="' + p[1] + '-' + p[2] + '" aria-pressed="' + (pFrom === p[1] && pTo === p[2]) + '">' + p[0] + '</button>').join('') + '</div>' +
    '<div class="per"><label>Du <select data-sel="from">' + opts(pFrom) + '</select></label><label>au <select data-sel="to">' + opts(pTo) + '</select></label><span class="muted">' + N + ' mois</span></div></section>';
  h += '<section class="box"><h2>Bilan ' + (full ? 'de ' + yr : MN[pFrom - 1] + ' – ' + MN[pTo - 1] + ' ' + yr) + '</h2><div class="cards">' +
    card('Revenus', f(tInc)) + card('Frais fixes', f(tFix)) + card('Provisions', f(tPl)) +
    (tExt > 0 ? card('Dont exceptionnel', f(tExt), 'gold') : '') +
    (tNp > 0 ? card('Non prévu', '-' + f(tNp), 'neg') : '') +
    card('Reste à vivre', f(tRest), tRest < 0 ? 'neg' : 'pos') + '</div>' +
    '<div class="gap"><span>Écart réel / provisions</span>' + (tN ? '<span><b class="' + gcls(tGap) + '">' + sg(tGap) + '</b> <span class="muted">' + (tGap > 0 ? 'dépassement' : (tGap < 0 ? 'économie' : 'pile dans le budget')) + '</span></span>' : '<span class="muted">Aucune dépense réelle saisie</span>') + '</div></section>';
  h += periodSplit('fixed', ms);
  if (tExt > 0) h += periodSplit('extra', ms);

  let mx = 1;
  ms.forEach(x => { mx = Math.max(mx, x.d.inc, x.d.fix + x.d.pl, x.d.n ? x.d.fix + x.d.real : 0); });
  const L = 62, R = 632, T = 14, B = 214, W = R - L, H = B - T, sw = W / N, bw = Math.min(sw * 0.38, 24);
  const Y = v => B - v / mx * H;
  let s = '';
  [0, 0.5, 1].forEach(t => { const y = Y(mx * t); s += '<line x1="' + L + '" x2="' + R + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/><text x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + fc0.format(mx * t) + '</text>'; });
  ms.forEach((x, k) => {
    const cx = L + sw * k + sw / 2, d = x.d;
    s += rect(cx - bw - 1, Y(d.fix), bw, d.fix / mx * H, 'var(--c1)') + rect(cx - bw - 1, Y(d.fix + d.pl), bw, d.pl / mx * H, 'var(--c2)');
    if (d.n) { const col = d.gap > 0 ? 'var(--neg)' : (d.gap < 0 ? 'var(--eco)' : 'var(--c3)'); s += rect(cx + 1, Y(d.fix), bw, d.fix / mx * H, 'var(--c1)') + rect(cx + 1, Y(d.fix + d.real), bw, d.real / mx * H, col); }
    if (d.ext > 0) s += '<circle cx="' + cx + '" cy="' + (Y(d.inc) - 7) + '" r="3.2" fill="var(--gold)"><title>' + esc(MN[x.m - 1]) + ' : ' + f(d.ext) + ' exceptionnel</title></circle>';
    s += '<text x="' + cx + '" y="' + (B + 16) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + MN[x.m - 1] + '</text>';
  });
  if (ms.some(x => x.d.inc > 0)) {
    let dpath = '';
    ms.forEach((x, k) => { const x0 = L + sw * k, x1 = L + sw * (k + 1), y = Y(x.d.inc); dpath += (k === 0 ? 'M' + x0 + ' ' + y : 'L' + x0 + ' ' + y) + 'L' + x1 + ' ' + y; });
    s += '<path d="' + dpath + '" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="5 4"/>';
  }
  s = '<svg viewBox="0 0 648 240" role="img" aria-label="Provisions et dépenses réelles mois par mois">' + s + '</svg>';
  h += '<section class="box"><h2>Mois par mois</h2><p class="note">Barre de gauche : le prévu (frais fixes + provisions). Barre de droite : le réel. La ligne pointillée suit les revenus de chaque mois, rentrées exceptionnelles incluses — un point doré signale un mois avec une rentrée exceptionnelle.</p><div class="scroll">' + s + '</div>' +
    '<div class="lg"><span><i style="background:var(--c1)"></i>Frais</span><span><i style="background:var(--c2)"></i>Provisions</span><span><i style="background:var(--c3)"></i>Réel</span><span><i style="background:var(--neg)"></i>Réel au-dessus des provisions</span><span><i style="background:var(--eco)"></i>Réel sous les provisions</span><span><i style="background:var(--gold);border-radius:50%"></i>Rentrée exceptionnelle</span><span><i class="dash"></i>Revenus du mois</span></div></section>';
  const rows = ms.map(x => { const d = x.d; return '<tr><td>' + MN[x.m - 1] + '</td><td>' + f(d.inc) + '</td><td>' + f(d.fix) + '</td><td>' + f(d.pl) + '</td><td>' + (d.n ? f(d.real) : '—') + '</td><td>' + (d.n ? '<span class="' + gcls(d.gap) + '">' + sg(d.gap) + '</span>' : '—') + '</td><td class="' + (d.rest < 0 ? 'neg' : '') + '">' + f(d.rest) + '</td></tr>'; }).join('');
  h += '<section class="box"><h2>Détail</h2><div class="scroll"><table class="wide"><thead><tr><th>Mois</th><th>Revenus</th><th>Frais</th><th>Provisions</th><th>Réel</th><th>Écart</th><th>Reste</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td>Total</td><td>' + f(tInc) + '</td><td>' + f(tFix) + '</td><td>' + f(tPl) + '</td><td>' + (tN ? f(tReal) : '—') + '</td><td>' + (tN ? '<span class="' + gcls(tGap) + '">' + sg(tGap) + '</span>' : '—') + '</td><td class="' + (tRest < 0 ? 'neg' : '') + '">' + f(tRest) + '</td></tr></tfoot></table></div></section>';
  return h;
}

/* ---------- sélecteur de mois (menu déroulant mois + année) ---------- */
function pickerYears() {
  const ys = new Set();
  const cy = now0.getFullYear(), dy = +ym.slice(0, 4);
  for (let y = cy - 3; y <= cy + 3; y++) ys.add(y);
  for (let y = dy - 1; y <= dy + 1; y++) ys.add(y);
  Object.keys(data.plans).forEach(k => ys.add(+k.slice(0, 4)));
  Object.keys(data.reals).forEach(k => ys.add(+k.slice(0, 4)));
  data.extra.forEach(it => ys.add(+String(it.month || ym).slice(0, 4)));
  data.income.concat(data.fixed).forEach(it => { if (it.from) ys.add(+it.from.slice(0, 4)); if (it.to) ys.add(+it.to.slice(0, 4)); });
  return [...ys].filter(y => y >= 1900 && y <= 2200).sort((a, b) => a - b);
}
function renderMonthPicker() {
  const ms = $('#m-sel'), ys = $('#y-sel');
  if (!ms || !ys) return;
  const years = pickerYears();
  const sig = years.join(',') + '|' + ym;
  if (ms.dataset.sig !== sig) {
    ms.dataset.sig = sig;
    ms.innerHTML = MN_FULL.map((n, i) => '<option value="' + (i + 1) + '">' + n + '</option>').join('');
    ys.innerHTML = years.map(y => '<option value="' + y + '">' + y + '</option>').join('');
  }
  ms.value = String(+ym.slice(5, 7));
  ys.value = ym.slice(0, 4);
}
function pickMonth() {
  const m = +$('#m-sel').value, y = +$('#y-sel').value;
  if (!m || !y) return;
  ym = mkey(y, m); editing = null; render();
}

/* ---------- préservation de la saisie ---------- */
function formKey(fm) { return fm.hasAttribute('data-edit') ? 'edit:' + fm.getAttribute('data-id') : 'add:' + fm.getAttribute('data-add'); }
function findForm(key) {
  if (key.indexOf('edit:') === 0) return document.querySelector('#view form[data-edit][data-id="' + key.slice(5) + '"]');
  return document.querySelector('#view form[data-add="' + key.slice(4) + '"]');
}
function captureInputs() {
  const st = { forms: {}, search: null, focus: null };
  document.querySelectorAll('#view form[data-add],#view form[data-edit]').forEach(fm => {
    const o = {};
    ['name', 'amount', 'cat', 'plan'].forEach(n => { const el = fm.elements[n]; if (el) o[n] = el.value; });
    st.forms[formKey(fm)] = o;
  });
  document.querySelectorAll('#view [data-search]').forEach(el => { st.search = { kind: el.getAttribute('data-search'), value: el.value }; });
  const ae = document.activeElement;
  if (ae && ae.getAttribute && ae.getAttribute('data-search')) st.focus = { search: ae.getAttribute('data-search') };
  else if (ae && ae.form && ae.name && st.forms[formKey(ae.form)]) st.focus = { form: formKey(ae.form), name: ae.name };
  return st;
}
function restoreInputs(st) {
  Object.keys(st.forms).forEach(k => {
    const fm = findForm(k); if (!fm) return;
    Object.keys(st.forms[k]).forEach(n => { const el = fm.elements[n]; if (el && st.forms[k][n] != null) { const opts = el.options; if (opts && ![...opts].some(o => o.value === st.forms[k][n])) return; el.value = st.forms[k][n]; } });
  });
  if (st.search) { const el = document.querySelector('#view [data-search="' + st.search.kind + '"]'); if (el) el.value = st.search.value; }
  if (!st.focus) return;
  let el = null;
  if (st.focus.search) el = document.querySelector('#view [data-search="' + st.focus.search + '"]');
  else if (st.focus.form) { const fm = findForm(st.focus.form); el = fm && fm.elements[st.focus.name]; }
  if (el) { try { el.focus(); if (el.setSelectionRange && (el.type === 'text' || el.type === 'search')) el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
}
function render() {
  const st = captureInputs();
  renderSum();
  renderMonthPicker();
  $('#sum').style.display = tab === 'year' ? 'none' : '';
  $('#month-bar').style.display = tab === 'year' ? 'none' : '';
  ['fixes', 'plans', 'reals', 'year'].forEach(t => $('#t-' + t).setAttribute('aria-selected', String(tab === t)));
  const v = $('#view');
  v.className = 'tab-' + tab;
  v.innerHTML = tab === 'fixes' ? renderFixesTab()
    : tab === 'plans' ? renderProvisions()
    : tab === 'reals' ? renderReals() : renderYear();
  restoreInputs(st);
}

/* ---------- tiroir de détail ---------- */
function refreshDetail() { if (detail) openDetail(detail.kind, detail.id, true); }
function openDetail(kind, id, keepFocus) {
  const it = data[kind].find(x => x.id === id);
  if (!it) { closeDetail(); return; }
  detail = { kind, id };
  const chain = chainOf(kind, it).sort((a, b) => fromOf(a).localeCompare(fromOf(b)));
  const c = kind === 'fixed' ? catFor('fixed', it) : null;
  $('#dd-title').innerHTML = (c ? esc(c.e) + ' ' : '💶 ') + esc(it.name);
  let h = '<p class="note">' + (kind === 'fixed' ? 'Frais fixe' : 'Revenu récurrent') + ' · mois affiché : <b>' + esc(mname()) + '</b></p>';
  h += '<div class="dd-cur"><span>Montant ce mois</span><b>' + f(it.amount) + '</b></div>';
  h += '<h3 class="dd-h">Historique des montants</h3><div class="dd-timeline">';
  chain.forEach(v => {
    const cur2 = v.id === it.id;
    const from = v.from ? mlabel(v.from) : 'depuis toujours';
    const to = v.to ? ' → ' + mlabel(v.to) : ' → en cours';
    h += '<div class="dd-ver' + (cur2 ? ' cur' : '') + '"><span class="dd-dot"></span><div class="dd-vmain"><b>' + f(v.amount) + '</b><small>' + esc(from) + esc(to) + '</small></div>' + (cur2 ? '<span class="dd-tag">ce mois</span>' : '') + '</div>';
  });
  h += '</div><p class="tip">Modifier le montant ou arrêter cette ligne n’affecte que <b>' + esc(mname()) + '</b> et les mois suivants. Les mois précédents conservent leurs montants.</p>';
  $('#dd-body').innerHTML = h;
  $('#dd-foot').innerHTML = store.canWrite
    ? '<button class="ghost" type="button" id="dd-edit">✎ Modifier à partir de ce mois</button>' +
      '<button class="ghost" type="button" id="dd-stop">⏹ Arrêter à partir de ce mois</button>' +
      '<button class="ghost danger" type="button" id="dd-purge">🗑 Supprimer partout</button>'
    : '<span class="note">Lecture seule — aucune modification possible.</span>';
  const dr = $('#detail-drawer'), sc = $('#detail-scrim');
  dr.classList.add('open'); sc.classList.add('open'); dr.removeAttribute('inert');
  if (store.canWrite) {
    $('#dd-edit').onclick = () => { closeDetail(); editing = { kind, id }; render(); const fm = document.querySelector('#view form[data-edit][data-id="' + id + '"]'); if (fm && fm.elements.name) { try { fm.elements.name.focus(); fm.elements.name.select(); } catch (e) {} } };
    $('#dd-stop').onclick = () => { closeDetail(); doStop(kind, it); };
    $('#dd-purge').onclick = () => { if (confirm('Supprimer cette ligne pour tous les mois, y compris l’historique ?')) { closeDetail(); doPurge(kind, it); } };
  }
  if (!keepFocus) setTimeout(() => { try { $('#dd-close').focus(); } catch (e) {} }, 60);
}
function closeDetail() {
  detail = null;
  const dr = $('#detail-drawer'), sc = $('#detail-scrim');
  if (!dr) return;
  dr.classList.remove('open'); sc.classList.remove('open'); dr.setAttribute('inert', '');
}
$('#dd-close').addEventListener('click', closeDetail);
$('#detail-scrim').addEventListener('click', closeDetail);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && detail) closeDetail(); });

/* ---------- mutations récurrentes ---------- */
function doStop(kind, it) {
  if (!store.canWrite) return toast('Lecture seule : modification impossible');
  const arr = data[kind], i = arr.findIndex(x => x.id === it.id);
  if (i < 0) return;
  const full = it.from === ym;
  const prevTo = it.to || null;
  const payload = payloadOf(kind, it);
  if (full) arr.splice(i, 1); else it.to = prevMonth(ym);
  render();
  write(() => full ? store.deleteItem(kind, it.id) : store.updateItem(kind, it.id, { to: prevMonth(ym) }));
  toastUndo(full ? 'Ligne supprimée' : 'Arrêtée à partir de ' + mname(), () => {
    if (full) data[kind].push(it); else it.to = prevTo;
    render();
    write(() => full ? store.addItem(kind, it.id, payload) : store.updateItem(kind, it.id, { to: prevTo }));
  });
}
function doPurge(kind, it) {
  if (!store.canWrite) return toast('Lecture seule : modification impossible');
  const root = it.root || it.id;
  const chain = data[kind].filter(x => (x.root || x.id) === root);
  if (!chain.length) return;
  const payloads = chain.map(x => ({ id: x.id, fields: payloadOf(kind, x) }));
  data[kind] = data[kind].filter(x => (x.root || x.id) !== root);
  render();
  write(() => store.batchOps(kind, chain.map(x => ({ type: 'delete', id: x.id }))));
  toastUndo(chain.length + ' version' + (chain.length > 1 ? 's' : '') + ' supprimée' + (chain.length > 1 ? 's' : ''), () => {
    chain.forEach(x => data[kind].push(x));
    render();
    write(() => store.batchOps(kind, payloads.map(p => ({ type: 'set', id: p.id, fields: p.fields }))));
  });
}
function commitRecurringEdit(kind, it, fields) {
  const chain = chainOf(kind, it);
  const meta = { name: fields.name };
  if (fields.cat) meta.cat = fields.cat;
  const amountChanged = +fields.amount !== +it.amount;
  if (!amountChanged) {
    chain.forEach(v => Object.assign(v, meta));
    render();
    write(() => store.batchOps(kind, chain.map(v => ({ type: 'update', id: v.id, fields: meta }))));
    toast('Ligne mise à jour ✦'); return;
  }
  if (it.from === ym) {
    Object.assign(it, fields);
    chain.forEach(v => { if (v.id !== it.id) Object.assign(v, meta); });
    render();
    write(() => store.batchOps(kind, chain.map(v => ({ type: 'update', id: v.id, fields: v.id === it.id ? fields : meta }))));
    toast('Montant mis à jour à partir de ' + mname() + ' ✦'); return;
  }
  const prevTo = it.to || null, nid = uid(), root = it.root || it.id;
  const nv = { id: nid, name: fields.name, amount: +fields.amount, from: ym, to: null, root, ts: Date.now() };
  if (fields.cat) nv.cat = fields.cat;
  const stop = prevMonth(ym);
  it.to = stop;
  chain.forEach(v => { if (v.id !== it.id) Object.assign(v, meta); });
  data[kind].push(nv);
  render();
  const ops = chain.filter(v => v.id !== it.id).map(v => ({ type: 'update', id: v.id, fields: meta }));
  ops.push({ type: 'update', id: it.id, fields: Object.assign({}, meta, { to: stop }) });
  ops.push({ type: 'set', id: nid, fields: payloadOf(kind, nv) });
  write(() => store.batchOps(kind, ops));
  toastUndo('Montant modifié à partir de ' + mname(), () => {
    data[kind] = data[kind].filter(x => x.id !== nid);
    it.to = prevTo; render();
    write(() => store.batchOps(kind, [{ type: 'delete', id: nid }, { type: 'update', id: it.id, fields: { to: prevTo } }]));
  });
}

/* ---------- événements budget ---------- */
$('#m-sel').addEventListener('change', pickMonth);
$('#y-sel').addEventListener('change', pickMonth);
$('#m-today').addEventListener('click', () => { const n = new Date(); ym = mkey(n.getFullYear(), n.getMonth() + 1); editing = null; render(); });
$('#export-pdf').addEventListener('click', exportPDF);
$('#t-fixes').onclick = () => { tab = 'fixes'; editing = null; render(); };
$('#t-plans').onclick = () => { tab = 'plans'; editing = null; render(); };
$('#t-reals').onclick = () => { tab = 'reals'; editing = null; render(); };
$('#t-year').onclick = () => { tab = 'year'; editing = null; yr = +ym.slice(0, 4); render(); };

const view = $('#view');

view.addEventListener('click', e => {
  let b = e.target.closest('[data-yr]');
  if (b) { yr += +b.getAttribute('data-yr'); render(); return; }
  b = e.target.closest('[data-preset]');
  if (b) { const p = b.getAttribute('data-preset').split('-'); pFrom = +p[0]; pTo = +p[1]; render(); return; }
  b = e.target.closest('[data-goto]');
  if (b) { ym = b.getAttribute('data-goto'); render(); return; }
  b = e.target.closest('[data-cats-kind]');
  if (b) { openCats(b.getAttribute('data-cats-kind')); }
});

view.addEventListener('click', e => {
  const g = e.target.closest('[data-group]');
  if (g) { const k = g.getAttribute('data-group'); listView[k].group = !listView[k].group; saveViewPrefs(); render(); return; }
  const fl = e.target.closest('[data-filter]');
  if (fl) { const k = fl.getAttribute('data-filter'); listView[k].filter = fl.getAttribute('data-cat'); saveViewPrefs(); render(); return; }
  const dt = e.target.closest('[data-detail]');
  if (dt) { openDetail(dt.getAttribute('data-detail'), dt.getAttribute('data-id')); return; }
  const eb = e.target.closest('[data-edit-btn]');
  if (eb) {
    if (!store.canWrite) return toast('Lecture seule : modification impossible');
    editing = { kind: eb.getAttribute('data-edit-btn'), id: eb.getAttribute('data-id') };
    render();
    const fm = document.querySelector('#view form[data-edit][data-id="' + editing.id + '"]');
    if (fm && fm.elements.name) { try { fm.elements.name.focus(); fm.elements.name.select(); } catch (err) {} }
    return;
  }
  if (e.target.closest('[data-cancel-edit]')) { editing = null; render(); }
});

view.addEventListener('keydown', e => { if (e.key === 'Escape' && editing) { editing = null; render(); } });
view.addEventListener('input', e => {
  const k = e.target.getAttribute && e.target.getAttribute('data-search');
  if (k) { listView[k].q = e.target.value; render(); }
});

view.addEventListener('change', e => {
  const s = e.target.getAttribute && e.target.getAttribute('data-sel');
  if (s) {
    const v = +e.target.value;
    if (s === 'from') { pFrom = v; if (pTo < v) pTo = v; } else { pTo = v; if (pFrom > v) pFrom = v; }
    render(); return;
  }
  const so = e.target.getAttribute && e.target.getAttribute('data-sort');
  if (so) { listView[so].sort = e.target.value; saveViewPrefs(); render(); return; }
  /* Quand on choisit une provision à l'ajout d'une dépense, sa catégorie est pré-remplie. */
  if (e.target.name === 'plan' && e.target.form && e.target.form.getAttribute('data-add') === 'real' && e.target.value) {
    const p = plans().find(x => x.id === e.target.value);
    if (p && e.target.form.elements.cat) e.target.form.elements.cat.value = p.cat;
  }
});

view.addEventListener('submit', e => {
  e.preventDefault();
  const fm = e.target;
  if (fm.hasAttribute('data-edit')) {
    if (!store.canWrite) return toast('Lecture seule : modification impossible');
    const kind = fm.getAttribute('data-edit'), id = fm.getAttribute('data-id');
    const n = fm.elements.name.value.trim(), a = parseFloat(fm.elements.amount.value);
    if (!n || isNaN(a) || a < 0) return toast('Libellé et montant valides requis');
    const fields = { name: n, amount: a };
    if (fm.elements.cat) fields.cat = fm.elements.cat.value;
    if (kind === 'reals' && fm.elements.plan) fields.planId = fm.elements.plan.value;
    const arr = kind === 'plans' ? plans() : kind === 'reals' ? reals() : data[kind];
    const it = arr.find(x => x.id === id);
    if (!it) { editing = null; render(); return; }
    editing = null;
    if (kind === 'income' || kind === 'fixed') { commitRecurringEdit(kind, it, fields); return; }
    Object.assign(it, fields); render();
    const col = (kind === 'plans' || kind === 'reals') ? 'plans' : kind;
    write(() => store.updateItem(col, id, fields));
    toast('Ligne modifiée ✦'); return;
  }
  if (!store.canWrite) return toast('Lecture seule : ajout impossible');
  const k = fm.getAttribute('data-add');
  const n = fm.elements.name.value.trim(), a = parseFloat(fm.elements.amount.value);
  if (!n || isNaN(a) || a < 0) return;
  const id = uid(), ts = Date.now();
  fm.elements.name.value = ''; fm.elements.amount.value = '';
  if (k === 'plan') {
    const cat = fm.elements.cat.value;
    const item = { id, type: 'prov', name: n, cat, amount: a, month: ym, ts };
    plans().push(item);
    render();
    write(() => store.addItem('plans', id, planPayload(item)));
  } else if (k === 'real') {
    const cat = fm.elements.cat.value;
    const planId = fm.elements.plan ? fm.elements.plan.value : '';
    if (fm.elements.plan) fm.elements.plan.value = '';
    const item = { id, type: 'real', name: n, cat, amount: a, planId, month: ym, ts };
    reals().push(item);
    render();
    write(() => store.addItem('plans', id, realPayload(item)));
    toast(planId ? 'Dépense ajoutée et reliée à sa provision ✦' : 'Dépense non prévue ajoutée ✦');
  } else if (k === 'extra') {
    const cat = fm.elements.cat.value;
    data.extra.push({ id, name: n, cat, amount: a, month: ym, ts });
    render();
    write(() => store.addItem('extra', id, { name: n, cat, amount: a, month: ym, ts }));
    toast('Rentrée exceptionnelle ajoutée à ' + mname() + ' ✦');
  } else {
    const item = { id, name: n, amount: a, from: ym, to: null, root: id, ts };
    if (k === 'fixed') item.cat = fm.elements.cat.value;
    data[k].push(item);
    render();
    write(() => store.addItem(k, id, payloadOf(k, item)));
    toast('Ajoutée à partir de ' + mname() + ' ✦');
  }
});

view.addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (b) {
    if (!store.canWrite) return toast('Lecture seule : suppression impossible');
    const k = b.getAttribute('data-del'), id = b.getAttribute('data-id');
    if (k === 'plan') {
      const arr = plans(), i = arr.findIndex(x => x.id === id);
      if (i < 0) return;
      const item = arr[i];
      const linked = reals().filter(r => r.planId === id).length;
      arr.splice(i, 1); editing = null; render();
      write(() => store.deleteItem('plans', id));
      const msg = linked
        ? 'Provision supprimée — ' + linked + ' dépense' + (linked > 1 ? 's' : '') + ' liée' + (linked > 1 ? 's' : '') + ' en « Non prévu »'
        : 'Provision supprimée';
      toastUndo(msg, () => {
        (data.plans[item.month] || (data.plans[item.month] = [])).push(item);
        render(); write(() => store.addItem('plans', item.id, planPayload(item)));
      });
    } else if (k === 'real') {
      const arr = reals(), i = arr.findIndex(x => x.id === id);
      if (i < 0) return;
      const item = arr[i]; arr.splice(i, 1); editing = null; render();
      write(() => store.deleteItem('plans', id));
      toastUndo('Dépense réelle supprimée', () => {
        (data.reals[item.month] || (data.reals[item.month] = [])).push(item);
        render(); write(() => store.addItem('plans', item.id, realPayload(item)));
      });
    } else if (k === 'extra') {
      const i = data.extra.findIndex(x => x.id === id);
      if (i < 0) return;
      const item = data.extra[i]; data.extra.splice(i, 1); editing = null; render();
      write(() => store.deleteItem('extra', id));
      toastUndo('Rentrée supprimée', () => {
        data.extra.push(item); render();
        write(() => store.addItem('extra', item.id, payloadOf('extra', item)));
      });
    } else {
      const it = data[k].find(x => x.id === id);
      if (it) { editing = null; doStop(k, it); }
    }
    return;
  }
  if (e.target.id === 'copy') {
    if (!store.canWrite) return toast('Lecture seule : action impossible');
    const src = data.plans[prevMonth(ym)] || [];
    if (!src.length) { alert('Aucune provision le mois précédent.'); return; }
    const jobs = [];
    src.forEach((x, i) => {
      const id = uid(), ts = Date.now() + i;
      const item = { id, type: 'prov', name: x.name, cat: x.cat, amount: x.amount, month: ym, ts };
      plans().push(item);
      jobs.push({ type: 'set', id, fields: planPayload(item) });
    });
    render();
    write(() => store.batchOps('plans', jobs));
  }
});

/* ---------- export PDF du mois (via impression → « Enregistrer en PDF ») ---------- */
function buildPrintReport() {
  const k = ym;
  const inc = incomeAt(k), ext = extraAt(k), fix = fixedAt(k);
  const pv = data.plans[k] || [], rs = data.reals[k] || [];
  const tInc = sum(inc, 'amount'), tExt = sum(ext, 'amount'), tFix = sum(fix, 'amount');
  const tPv = sum(pv, 'amount'), tRs = sum(rs, 'amount');
  const np = unplannedAt(k);
  const rest = tInc + tExt - tFix - tPv - np;
  const hasReal = rs.length > 0;
  const ecart = hasReal ? tRs - tPv : null;
  const catLabel = (kind, it) => { const c = catFor(kind, it); return esc(c.e) + ' ' + esc(c.label); };
  const amt = v => '<td class="pr-num">' + f(v) + '</td>';
  const txt = v => '<td>' + v + '</td>';
  const ecartCls = ecart == null ? '' : (ecart > 0 ? 'pr-neg' : (ecart < 0 ? 'pr-eco' : 'pr-pos'));
  const ecartTxt = ecart == null ? '—' : (ecart > 0 ? '+' : '') + f(ecart);
  const table = (heads, rows, foot) =>
    '<table class="pr-table"><thead><tr>' + heads + '</tr></thead><tbody>' +
    (rows.length ? rows.join('') : '<tr><td colspan="9" class="pr-empty">Aucune ligne ce mois-ci.</td></tr>') +
    '</tbody>' + (foot ? '<tfoot><tr>' + foot + '</tr></tfoot>' : '') + '</table>';

  let h = '<div class="pr-head"><h1>Budget — ' + esc(mlabel(k)) + '</h1>' +
    '<p class="pr-sub">' + esc(store.viewEmail) + ' · généré le ' + esc(new Date().toLocaleDateString('fr-FR')) + '</p></div>';

  h += '<div class="pr-cards">' +
    '<div class="pr-card"><span>Revenus</span><b>' + f(tInc + tExt) + '</b>' + (tExt > 0 ? '<small>dont ' + f(tExt) + ' exceptionnel</small>' : '') + '</div>' +
    '<div class="pr-card"><span>Frais fixes</span><b>' + f(tFix) + '</b></div>' +
    '<div class="pr-card"><span>Provisions</span><b>' + f(tPv) + '</b></div>' +
    '<div class="pr-card"><span>Reste à vivre</span><b class="' + (rest < 0 ? 'pr-neg' : 'pr-pos') + '">' + f(rest) + '</b>' + (np > 0 ? '<small>après ' + f(np) + ' de dépenses non prévues</small>' : '') + '</div>' +    '<div class="pr-card"><span>Dépenses réelles</span><b>' + (hasReal ? f(tRs) : '—') + '</b></div>' +
    '<div class="pr-card"><span>Écart réel / provisions</span><b class="' + ecartCls + '">' + ecartTxt + '</b></div>' +
    '</div>';

  h += '<section class="pr-sec"><h2>Revenus</h2>' +
    table('<th>Libellé</th><th class="pr-num">Montant</th>',
      inc.map(it => '<tr>' + txt(esc(it.name)) + amt(it.amount) + '</tr>'),
      txt('Total revenus') + amt(tInc)) + '</section>';

  h += '<section class="pr-sec"><h2>Rentrées exceptionnelles</h2>' +
    table('<th>Libellé</th><th>Catégorie</th><th class="pr-num">Montant</th>',
      ext.map(it => '<tr>' + txt(esc(it.name)) + txt(catLabel('extra', it)) + amt(it.amount) + '</tr>'),
      txt('Total exceptionnel') + '<td></td>' + amt(tExt)) + '</section>';

  h += '<section class="pr-sec"><h2>Frais fixes</h2>' +
    table('<th>Libellé</th><th>Catégorie</th><th class="pr-num">Montant</th>',
      fix.map(it => '<tr>' + txt(esc(it.name)) + txt(catLabel('fixed', it)) + amt(it.amount) + '</tr>'),
      txt('Total frais fixes') + '<td></td>' + amt(tFix)) + '</section>';

  h += '<section class="pr-sec"><h2>Provisions</h2>' +
    table('<th>Libellé</th><th>Catégorie</th><th class="pr-num">Montant provisionné</th>',
      pv.map(it => '<tr>' + txt(esc(it.name)) + txt(catLabel('plans', it)) + amt(it.amount) + '</tr>'),
      txt('Total provisionné') + '<td></td>' + amt(tPv)) + '</section>';

  const provName = id => { const p = pv.find(x => x.id === id); return p ? esc(p.name) : '🚫 Non prévu'; };
  h += '<section class="pr-sec"><h2>Dépenses réelles</h2>' +
    table('<th>Libellé</th><th>Catégorie</th><th>Provision liée</th><th class="pr-num">Montant</th>',
      rs.map(it => '<tr>' + txt(esc(it.name)) + txt(catLabel('reals', it)) + txt(provName(it.planId)) + amt(it.amount) + '</tr>'),
      txt('Total dépensé') + '<td></td><td></td>' + amt(tRs)) + '</section>';

  const byPlan = {}; let unplanned = 0;
  rs.forEach(r => { if (r.planId && pv.some(p => p.id === r.planId)) (byPlan[r.planId] || (byPlan[r.planId] = [])).push(r); else unplanned += +r.amount || 0; });
  const reconRows = pv.map(p => {
    const linked = (byPlan[p.id] || []).length;
    const spent = sum(byPlan[p.id] || [], 'amount');
    const d = spent - (+p.amount || 0);
    return '<tr>' + txt(esc(p.name)) + amt(p.amount) + amt(spent) +
      '<td class="pr-num ' + (linked ? (d > 0 ? 'pr-neg' : (d < 0 ? 'pr-eco' : 'pr-pos')) : '') + '">' + (linked ? (d > 0 ? '+' : '') + f(d) : 'en attente') + '</td></tr>';
  });
  reconRows.push('<tr>' + txt('🚫 Non prévu') + amt(0) + amt(unplanned) + '<td class="pr-num ' + (unplanned > 0 ? 'pr-neg' : '') + '">' + (unplanned > 0 ? '+' : '') + f(unplanned) + '</td></tr>');
  h += '<section class="pr-sec"><h2>Rapprochement provisions / réel</h2>' +
    table('<th>Provision</th><th class="pr-num">Provisionné</th><th class="pr-num">Dépensé</th><th class="pr-num">Écart</th>',
      reconRows,
      txt('Total') + amt(tPv) + amt(tRs) + '<td class="pr-num ' + ecartCls + '">' + ecartTxt + '</td>') + '</section>';

  return h;
}
let savedTitle = null;
function exportPDF() {
  const rp = $('#print-report');
  if (!rp) return;
  rp.innerHTML = buildPrintReport();
  savedTitle = document.title;
  document.title = 'Budget - ' + mlabel(ym);
  window.print();
}
window.addEventListener('afterprint', () => { if (savedTitle != null) { document.title = savedTitle; savedTitle = null; } });

/* ---------- comptes ---------- */
function applyViewMode() {
  const link = store.currentLink;
  document.body.classList.toggle('readonly-mode', !!link && link.permissions === 'read');
  const banner = $('#readonly-banner');
  if (link) {
    banner.hidden = false;
    banner.classList.toggle('write-mode', link.permissions === 'write');
    $('#readonly-icon').textContent = link.permissions === 'write' ? '✏️' : '🔒';
    $('#readonly-text').textContent = link.permissions === 'write' ? 'Vous modifiez le compte de' : 'Lecture seule — compte de';
    $('#readonly-email').textContent = link.ownerEmail;
  } else banner.hidden = true;
  $('#current-account-label').textContent = store.isSelf ? 'Mon compte' : store.currentView;
  document.querySelectorAll('#account-menu [data-view]').forEach(b =>
    b.classList.toggle('active', b.dataset.view === store.currentView));
  refreshCatsUI();
}

function renderAccountMenu() {
  const list = $('#linked-accounts-list');
  list.innerHTML = !store.linkedAccounts.length
    ? '<p class="menu-empty">Aucun compte lié pour le moment.</p>'
    : store.linkedAccounts.map(l => `
      <div class="account-row ${store.currentView === l.ownerEmail ? 'active' : ''}">
        <button class="account-option" data-view="${esc(l.ownerEmail)}" type="button">
          <span class="account-icon">👥</span>
          <span class="mail">${esc(l.ownerEmail)}</span>
          <span class="account-permission">${l.permissions === 'read' ? '👁️ lecture' : '✏️ écriture'}</span>
        </button>
        <button class="unlink-btn" data-unlink="${l.id}" title="Rompre le lien" type="button">✕</button>
      </div>`).join('');
  const block = $('#shared-with-block');
  block.hidden = !store.isSelf;
  if (!store.isSelf) return;
  const rows = [];
  store.sharedWith.forEach(l => rows.push(`
    <div class="account-row">
      <span class="account-option static">
        <span class="account-icon">👥</span><span class="mail">${esc(l.linkedEmail)}</span>
        <span class="account-permission">${l.permissions === 'read' ? '👁️ lecture' : '✏️ écriture'}</span>
      </span>
      <button class="unlink-btn" data-revoke="${l.id}" title="Révoquer l'accès" type="button">✕</button>
    </div>`));
  store.pendingSent.forEach(i => rows.push(`
    <div class="account-row">
      <span class="account-option static">
        <span class="account-icon">✉️</span><span class="mail">${esc(i.toEmail)}</span>
        <span class="account-permission">en attente</span>
      </span>
      <button class="unlink-btn" data-cancel="${i.id}" title="Annuler l'invitation" type="button">✕</button>
    </div>`));
  $('#shared-with-list').innerHTML = rows.length ? rows.join('') : '<p class="menu-empty">Personne n’a accès à votre budget.</p>';
}

function openAccountMenu() {
  renderAccountMenu(); applyViewMode();
  $('#account-menu').hidden = false;
  $('#account-btn').classList.add('open');
  checkPendingInvitations();
  store.loadSharedWith().then(renderAccountMenu).catch(err => console.warn(err));
}
function closeAccountMenu() { $('#account-menu').hidden = true; $('#account-btn').classList.remove('open'); }

$('#account-btn').addEventListener('click', e => {
  e.stopPropagation();
  $('#account-menu').hidden ? openAccountMenu() : closeAccountMenu();
});
document.addEventListener('click', e => { if (!e.target.closest('.account-switcher')) closeAccountMenu(); });

$('#account-menu').addEventListener('click', async e => {
  const revoke = e.target.closest('[data-revoke]');
  if (revoke) {
    e.stopPropagation();
    if (!confirm("Révoquer l'accès de cette personne ?")) return;
    try { await store.removeLink(revoke.dataset.revoke); renderAccountMenu(); toast('Accès révoqué'); }
    catch (err) { toast(frErr(err)); }
    return;
  }
  const cancel = e.target.closest('[data-cancel]');
  if (cancel) {
    e.stopPropagation();
    try { await store.cancelInvitation(cancel.dataset.cancel); renderAccountMenu(); toast('Invitation annulée'); }
    catch (err) { toast(frErr(err)); }
    return;
  }
  const unlink = e.target.closest('[data-unlink]');
  if (unlink) {
    e.stopPropagation();
    if (confirm('Rompre le lien avec ce compte ?')) {
      await store.removeLink(unlink.dataset.unlink);
      applyViewMode(); renderAccountMenu(); store.openData();
      toast('Lien supprimé');
    }
    return;
  }
  const opt = e.target.closest('[data-view]');
  if (opt) {
    store.currentView = opt.dataset.view;
    closeAccountMenu(); applyViewMode();
    store.openData().catch(err => toast(frErr(err)));
  }
});

/* ---------- invitation ---------- */
$('#invite-btn').addEventListener('click', () => {
  closeAccountMenu();
  $('#invite-email').value = '';
  $('#invite-error').hidden = true;
  $('#modal-invite').hidden = false;
});
$('#invite-cancel').addEventListener('click', () => $('#modal-invite').hidden = true);
$('#modal-invite').addEventListener('click', e => { if (e.target.id === 'modal-invite') $('#modal-invite').hidden = true; });
$('#invite-send').addEventListener('click', async () => {
  const email = $('#invite-email').value.trim(), permissions = $('#invite-permissions').value;
  const err = $('#invite-error');
  if (!email || !email.includes('@')) { err.textContent = "Veuillez entrer une adresse e-mail valide."; err.hidden = false; return; }
  try {
    await store.sendInvitation(email, permissions);
    toast(`Invitation envoyée à ${email} ✦`);
    $('#modal-invite').hidden = true;
    renderAccountMenu();
  } catch (e) { err.textContent = frErr(e); err.hidden = false; }
});

/* ---------- invitations reçues ---------- */
async function checkPendingInvitations() {
  try {
    const pending = await store.getPendingInvitations();
    if (pending.length) showPendingInvitations(pending);
  } catch (err) { console.error('Vérification des invitations :', err); }
}
function showPendingInvitations(invitations) {
  const list = $('#pending-list');
  list.innerHTML = invitations.map(inv => `
    <div class="pending-item">
      <div>
        <div class="pending-email">${esc(inv.fromEmail)}</div>
        <div class="pending-permission">${inv.permissions === 'read' ? '👁️ Lecture seule' : '✏️ Lecture et écriture'}</div>
      </div>
      <div class="pending-actions">
        <button data-id="${esc(inv.id)}" data-action="accept">Accepter</button>
        <button class="btn-refuse" data-id="${esc(inv.id)}" data-action="refuse">Refuser</button>
      </div>
    </div>`).join('');
  $('#modal-pending').hidden = false;
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const inv = invitations.find(i => i.id === btn.dataset.id);
      try {
        await store.respondToInvitation(inv, btn.dataset.action === 'accept');
        toast(btn.dataset.action === 'accept' ? 'Invitation acceptée ✦' : 'Invitation refusée');
        btn.closest('.pending-item').remove();
        if (!list.querySelector('.pending-item')) $('#modal-pending').hidden = true;
        renderAccountMenu(); applyViewMode();
      } catch (err) { toast(frErr(err)); }
    });
  });
}
$('#pending-close').addEventListener('click', () => $('#modal-pending').hidden = true);
$('#modal-pending').addEventListener('click', e => { if (e.target.id === 'modal-pending') $('#modal-pending').hidden = true; });

/* ---------- authentification ---------- */
let authMode = 'login';
document.querySelectorAll('.auth-tabs button').forEach(b => b.addEventListener('click', () => {
  authMode = b.dataset.mode;
  document.querySelectorAll('.auth-tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('#auth-submit').textContent = authMode === 'login' ? 'Se connecter' : 'Créer mon compte';
  $('#auth-pass').autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
  $('#auth-error').hidden = true;
  $('#forgot-btn').hidden = authMode !== 'login';
}));

$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('#auth-email').value.trim(), pass = $('#auth-pass').value;
  const btn = $('#auth-submit'), el = $('#auth-error');
  btn.disabled = true; btn.textContent = 'Un instant…';
  try {
    if (authMode === 'login') await store.login(email, pass);
    else { await store.register(email, pass); if (USE_FIREBASE) toast('E-mail de vérification envoyé ✦'); }
    await loadAndEnter();
    checkPendingInvitations();
  } catch (err) {
    el.className = 'error'; el.textContent = frErr(err); el.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Se connecter' : 'Créer mon compte';
  }
});

$('#forgot-btn').addEventListener('click', async () => {
  const email = $('#auth-email').value.trim(), el = $('#auth-error');
  el.hidden = false;
  if (!email) { el.className = 'error'; el.textContent = 'Saisissez votre e-mail ci-dessus, puis cliquez à nouveau.'; return; }
  try {
    await store.resetPassword(email);
    el.className = 'error ok';
    el.textContent = 'E-mail de réinitialisation envoyé à ' + email + ' (pensez aux spams).';
  } catch (err) { el.className = 'error'; el.textContent = frErr(err); }
});

function updateVerifyBanner() {
  const b = $('#verify-banner');
  b.hidden = store.verified || !store.user;
  if (!b.hidden) $('#verify-email').textContent = store.email;
}
$('#verify-resend').addEventListener('click', async () => {
  try { await store.resendVerification(); toast('Lien de vérification renvoyé ✦'); } catch (err) { toast(frErr(err)); }
});
$('#verify-done').addEventListener('click', async () => {
  try {
    await store.refreshVerification();
    updateVerifyBanner();
    toast(store.verified ? 'E-mail vérifié ✦' : "Pas encore vérifié : cliquez le lien reçu par e-mail.");
  } catch (err) { toast(frErr(err)); }
});

$('#logout-btn').addEventListener('click', async () => {
  await store.logout();
  data = { income: [], fixed: [], plans: {}, extra: [], reals: {} };
  tab = 'fixes'; editing = null; closeDetail();
  $('#view-app').hidden = true;
  $('#view-auth').hidden = false;
  $('#auth-form').reset();
  document.body.classList.remove('readonly-mode');
  $('#readonly-banner').hidden = true;
  $('#verify-banner').hidden = true;
  setSaveState('Enregistré sur cet appareil');
});

/* ---------- cycle de vie ---------- */
async function loadAndEnter() {
  $('#user-chip').textContent = store.user.email || '';
  $('#demo-banner').hidden = USE_FIREBASE;
  updateVerifyBanner();
  $('#view-auth').hidden = true;
  $('#view-app').hidden = false;
  loadViewPrefs();
  applyViewMode();
  renderAccountMenu();
  await store.openPrefs();
  try { await store.openData(); } catch (err) { console.error(err); toast(frErr(err)); }
  store.loadSharedWith().then(renderAccountMenu).catch(() => {});
}

/* ---------- PWA ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#install-btn').hidden = false; });
$('#install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') { $('#install-btn').hidden = true; deferredPrompt = null; }
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2600);
}
function toastUndo(msg, onUndo) {
  const t = $('#toast');
  t.innerHTML = '<span>' + esc(msg) + '</span> <button type="button" class="toast-btn" id="toast-undo">Annuler</button>';
  t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  $('#toast-undo').addEventListener('click', () => { clearTimeout(toastTimer); t.hidden = true; onUndo(); });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 5000);
}

/* ---------- statistiques de catégories ---------- */
function eachOf(k, fn) {
  if (k === 'fix') data.fixed.forEach(it => fn(it, 'fixed', mlabel(fromOf(it) === MMIN ? ym : it.from) + (it.to ? ' → ' + mlabel(it.to) : '')));
  else if (k === 'ext') data.extra.forEach(it => fn(it, 'extra', mlabel(it.month || ym)));
  else {
    Object.keys(data.plans).forEach(mo => data.plans[mo].forEach(it => fn(it, 'plans', mlabel(mo))));
    Object.keys(data.reals).forEach(mo => data.reals[mo].forEach(it => fn(it, 'reals', 'réel · ' + mlabel(mo))));
  }
}
function catUsage(k, id) {
  let n = 0, total = 0;
  eachOf(k, (it, kind) => { if (catFor(kind, it).id === id) { n++; total += +it.amount || 0; } });
  return { n, total };
}
function catItems(k, id) {
  const out = [];
  eachOf(k, (it, kind, sub) => { if (catFor(kind, it).id === id) out.push({ name: it.name, amount: +it.amount || 0, sub }); });
  return out.sort((a, b) => b.amount - a.amount);
}
async function reassignCats(k, fromId, toId) {
  const ak = appKind(k), ops = [];
  eachOf(k, (it, kind) => {
    if (catFor(kind, it).id === fromId) { it.cat = toId; ops.push({ type: 'update', id: it.id, fields: { cat: toId } }); }
  });
  if (!ops.length) return;
  render(); refreshCatsUI();
  await store.batchOps(ak, ops);
}

/* ---------- démarrage ---------- */
applyPrefs(readCache(), { notify: false });
initThemeUI({ onChange: p => store.queuePrefs(p), saveHint: 'Enregistré sur cet appareil' });
applySets(readCatsCache('last') || CAT_DEFAULTS, { notify: false });
initCatsUI({
  onChange: s => { store.queueCats(s); render(); refreshDetail(); },
  usage: catUsage,
  items: catItems,
  onReassign: reassignCats,
  canEdit: () => !!store.user && store.canWrite,
});

(async function boot() {
  if (!USE_FIREBASE) $('#demo-hint').hidden = false;
  const u = await store.init();
  if (u) { loadAndEnter(); checkPendingInvitations(); }
})();
