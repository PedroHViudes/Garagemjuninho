'use strict';
/* =============================================================
   GARAGEM · núcleo (utilitários, banco local, estado, roteador)
   ============================================================= */
const D = window.DADOS || { versao: 1, config: {}, veiculos: [], lancamentos: [] };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- ícones ---------- */
const svg = (p, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  car: svg('<path d="M5 17h14M3 13l2-6a2 2 0 0 1 2-1.4h10A2 2 0 0 1 19 7l2 6v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>'),
  moto: svg('<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 10h5l3 6.5M14 10l-1.5-4H10M15 7h3l1 3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
  cam: svg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 3),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  play: svg('<path d="M6 4l14 8-14 8z"/>'),
  alert: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  megaphone: svg('<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
  in: svg('<path d="M12 19V5M5 12l7 7 7-7"/>'),
  out: svg('<path d="M12 5v14M5 12l7-7 7 7"/>'),
  search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  calc: svg('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/>'),
  tag: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>'),
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  ext: svg('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  card: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18M7 19h5"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.1-3.4-8.4z"/></svg>',
  ig: svg('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'),
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>',
  lock: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  refresh: svg('<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>'),
  plate: svg('<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h3M11 12h7"/>'),
  money: svg('<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 12.5h.01M18 12.5h.01"/>'),
  swap: svg('<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
};

/* ---------- formatação ---------- */
const brl = (v, cent = false) => (Number(v) < 0 ? '−' : '') + Math.abs(Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cent ? 2 : 0, maximumFractionDigits: cent ? 2 : (Number.isInteger(+v) ? 0 : 2) }).replace(/\u00a0/g, ' ');
const brlS = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + brl(Math.abs(v)); // com sinal
const fmtN = (n) => (n || n === 0) && n !== '' ? Number(n).toLocaleString('pt-BR') : '';
const fmtKm = (n) => (n ? Number(n).toLocaleString('pt-BR') + ' km' : '');
function num(s) {
  if (typeof s === 'number') return s;
  s = String(s || '').replace(/[R$\s%]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hoje() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
const fmtData = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(2, 4) : '');
function diasDesde(d) { if (!d) return null; return Math.floor((new Date(hoje()) - new Date(d.slice(0, 10))) / 864e5); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const placaFmt = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
const fone = (f) => { const d = String(f || '').replace(/\D/g, ''); if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return f || ''; };
const pct = (v) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—');
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/* ---------- banco local (IndexedDB) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('garagem', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore('veiculos', { keyPath: 'id' });
        db.createObjectStore('lancamentos', { keyPath: 'id' });
        db.createObjectStore('midias', { keyPath: 'id' }).createIndex('vid', 'veiculoId');
        db.createObjectStore('kv');
      };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      let out;
      if (req) req.onsuccess = () => (out = req.result);
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Sem espaço no aparelho?'));
    });
  },
  all(s) { return this.tx(s, 'readonly', (st) => st.getAll()); },
  get(s, k) { return this.tx(s, 'readonly', (st) => st.get(k)); },
  put(s, v, k) { return this.tx(s, 'readwrite', (st) => (k !== undefined ? st.put(v, k) : st.put(v))); },
  del(s, k) { return this.tx(s, 'readwrite', (st) => st.delete(k)); },
  clear(s) { return this.tx(s, 'readwrite', (st) => st.clear()); },
};

/* ---------- estado ---------- */
const S = {
  cfg: {}, veiculos: [], lanc: [], midias: {}, urls: {},
  filtro: { q: '', st: 'avenda', tipo: 'todos' },
  sel: new Set(), selVid: null, tabV: 'midias', modelo: 'whatsapp', caixaMes: 'tudo',
  rota: '', fipeCache: {}, lote: [],
};

function normV(v) {
  const o = Object.assign({
    tipo: 'carro', marca: '', modelo: '', anoFab: '', anoMod: '', km: '', cor: '', combustivel: '', cambio: '',
    placa: '', opcionais: '', descricao: '', legenda: '', legendaStory: '', dicaStory: '', status: 'disponivel', aceitaTroca: true, financia: true,
    precoAnuncio: 0, precoMinimo: 0, despesas: [], fipe: null, linkAlbum: '', midiasCodigo: [], postagens: {},
    origem: 'compra', criado: hoje(), venda: null, capaId: null, ultimaDivulgacao: null,
  }, v || {});
  o.compra = Object.assign({ valor: 0, data: o.criado, pagoCaixa: true }, o.compra || {});
  if (!o.id) o.id = slug([o.marca, o.modelo, o.anoMod].join(' ')) + '-' + uid().slice(-4);
  o.placa = placaFmt(o.placa);
  return o;
}

const nomeV = (v) => [v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo sem nome';
const anoV = (v) => (v.anoFab && v.anoMod && v.anoFab != v.anoMod ? `${v.anoFab}/${v.anoMod}` : v.anoMod || v.anoFab || '');
const somaDesp = (v) => (v.despesas || []).reduce((a, d) => a + num(d.valor), 0);
const custoV = (v) => num(v.compra?.valor) + somaDesp(v);
const lucroV = (v) => (v.status === 'vendido' && v.venda ? num(v.venda.valor) : num(v.precoAnuncio)) - custoV(v);
const getV = (id) => S.veiculos.find((v) => v.id === id);
const STATUS = { disponivel: 'À venda', reservado: 'Reservado', vendido: 'Vendido' };

function ultimaDiv(v) {
  const ds = Object.values(v.postagens || {}).filter(Boolean);
  if (v.ultimaDivulgacao) ds.push(v.ultimaDivulgacao);
  return ds.sort().pop() || null;
}

/* ---------- financeiro ---------- */
function movimentos() {
  const out = [];
  for (const v of S.veiculos) {
    const n = nomeV(v);
    if (num(v.compra?.valor) && v.compra.pagoCaixa !== false)
      out.push({ id: 'c-' + v.id, data: v.compra.data || v.criado, desc: 'Compra · ' + n, valor: -num(v.compra.valor), vid: v.id });
    (v.despesas || []).forEach((d, i) => out.push({ id: 'd-' + v.id + i, data: d.data || v.criado, desc: (d.desc || 'Despesa') + ' · ' + n, valor: -num(d.valor), vid: v.id }));
    if (v.status === 'vendido' && v.venda) {
      const din = num(v.venda.valor) - num(v.venda.trocaValor);
      if (din) out.push({ id: 'v-' + v.id, data: v.venda.data, desc: 'Venda · ' + n + (num(v.venda.trocaValor) ? ' (+ troca)' : ''), valor: din, vid: v.id });
    }
  }
  for (const l of S.lanc) out.push({ id: l.id, data: l.data, desc: l.desc, valor: l.tipo === 'saida' ? -num(l.valor) : num(l.valor), avulso: true });
  return out.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}
function resumo() {
  const caixa = num(S.cfg.saldoInicial) + movimentos().reduce((a, m) => a + m.valor, 0);
  const estoque = S.veiculos.filter((v) => v.status !== 'vendido');
  const vendidos = S.veiculos.filter((v) => v.status === 'vendido');
  const investido = estoque.reduce((a, v) => a + custoV(v), 0);
  const potencial = estoque.reduce((a, v) => a + (num(v.precoAnuncio) ? lucroV(v) : 0), 0);
  const mes = hoje().slice(0, 7);
  const vendMes = vendidos.filter((v) => (v.venda?.data || '').startsWith(mes));
  return {
    caixa, investido, patrimonio: caixa + investido, potencial,
    estoque, vendidos, vendMes,
    lucroMes: vendMes.reduce((a, v) => a + lucroV(v), 0),
    lucroTotal: vendidos.reduce((a, v) => a + lucroV(v), 0),
  };
}

/* ---------- persistência ---------- */
async function salvarV(v) { await DB.put('veiculos', v); const i = S.veiculos.findIndex((x) => x.id === v.id); if (i >= 0) S.veiculos[i] = v; else S.veiculos.push(v); }
async function salvarCfg() { await DB.put('kv', S.cfg, 'config'); }

async function importarDoCodigo() {
  await DB.clear('veiculos'); await DB.clear('lancamentos');
  for (const v of D.veiculos || []) await DB.put('veiculos', normV(v));
  for (const l of D.lancamentos || []) await DB.put('lancamentos', Object.assign({ id: uid() }, l));
  await DB.put('kv', D.config || {}, 'config');
  await DB.put('kv', D.versao || 1, 'versao');
}

/* junta dados novos do código sem apagar o que está no celular */
async function mesclarDoCodigo(vLocal) {
  const locais = ((await DB.all('veiculos')) || []).map(normV);
  const ids = new Set(locais.map((v) => v.id));
  let novos = 0; const pulados = [];
  for (const v0 of D.veiculos || []) {
    const v = normV(v0);
    if (ids.has(v.id)) {
      const l = locais.find((x) => x.id === v.id);
      const m = [...new Set([...(l.midiasCodigo || []), ...(v.midiasCodigo || [])])];
      if (m.length !== (l.midiasCodigo || []).length) { l.midiasCodigo = m; await DB.put('veiculos', l); }
      continue;
    }
    const dup = acharDuplicado(v, locais);
    if (dup) { pulados.push(nomeV(v)); continue; }
    await DB.put('veiculos', v); locais.push(v); ids.add(v.id); novos++;
  }
  const idsL = new Set(((await DB.all('lancamentos')) || []).map((l) => l.id));
  for (const l of D.lancamentos || []) if (l.id && !idsL.has(l.id)) await DB.put('lancamentos', l);
  const cfgL = (await DB.get('kv', 'config')) || {}, cfgC = D.config || {};
  const forcar = cfgC._atualizar && (vLocal || 0) < (cfgC._atualizar.versao || 0) ? cfgC._atualizar.chaves || [] : [];
  for (const k of Object.keys(cfgC)) if (k !== '_atualizar' && (!(k in cfgL) || forcar.includes(k))) cfgL[k] = cfgC[k];
  await DB.put('kv', cfgL, 'config');
  await DB.put('kv', D.versao || 1, 'versao');
  return { novos, pulados };
}

/* ---------- duplicidade ---------- */
const palavrasModelo = (m) => slug(m).split('-').filter((t) => /[a-z]/.test(t));
function mesmoModelo(a, b) {
  const ta = palavrasModelo(a), tb = palavrasModelo(b);
  if (!ta.length || !tb.length || ta[0] !== tb[0]) return false;
  // motos e nomes de família (CG Titan x CG Start, Corolla x Corolla Fielder): compara a 2ª palavra se as duas tiverem
  if (['cg', 'cb', 'xre', 'nxr', 'ybr', 'fz', 'xtz', 'corolla'].includes(ta[0]) && ta[1] && tb[1]) {
    const v2 = ['xei', 'gli', 'xli', 'altis', 'fan', 'es', 'esd', 'ks', 'mix'];
    if (!v2.includes(ta[1]) && !v2.includes(tb[1])) return ta[1] === tb[1];
  }
  return true;
}
// procura veículo parecido já cadastrado: mesma placa, ou mesma marca+modelo+ano
function acharDuplicado(d, lista = S.veiculos, ignorarId = null) {
  const pl = placaFmt(d.placa);
  const outros = lista.filter((v) => v.id !== ignorarId);
  if (pl.length >= 7) { const v = outros.find((x) => x.placa === pl); if (v) return { v, motivo: `mesma placa (${pl})` }; }
  const ano = String(d.anoMod || d.anoFab || '');
  if (!ano || !d.modelo) return null;
  const mk = slug(d.marca);
  const v = outros.find((x) => String(x.anoMod || x.anoFab || '') === ano && (!mk || !x.marca || slug(x.marca) === mk) && mesmoModelo(x.modelo, d.modelo) && (x.tipo || 'carro') === (d.tipo || 'carro'));
  return v ? { v, motivo: `${nomeV(v)} ${anoV(v)} já está cadastrado${v.status === 'vendido' ? ' (vendido)' : ''}` } : null;
}

async function carregar() {
  S.cfg = Object.assign({}, D.config || {}, (await DB.get('kv', 'config')) || {});
  S.veiculos = ((await DB.all('veiculos')) || []).map(normV);
  S.lanc = (await DB.all('lancamentos')) || [];
  S.midias = {};
  const ms = (await DB.all('midias')) || [];
  for (const m of ms) (S.midias[m.veiculoId] ||= []).push(m);
  for (const k in S.midias) S.midias[k].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

/* ---------- mídias ---------- */
function urlM(m) { return (S.urls[m.id] ||= URL.createObjectURL(m.blob)); }
function midiasDe(v) {
  const loc = (S.midias[v.id] || []).map((m) => ({ ...m, src: urlM(m), local: true }));
  const cod = (v.midiasCodigo || []).filter(Boolean).map((p0, i) => {
    const story = /#story$/i.test(p0) || /\/stor(y|ies)\//i.test(p0);
    const p = p0.replace(/#story$/i, '');
    return {
      id: 'cod:' + p0, veiculoId: v.id, src: p.startsWith('http') || p.startsWith('/') ? p : '/' + p, story,
      tipo: /\.(mp4|mov|webm|m4v)$/i.test(p) ? 'video' : 'foto', nome: p.split('/').pop(), codigo: true, ordem: -1000 + i,
    };
  });
  const peso = (m) => (m.story ? 2 : 0) + (m.tipo === 'video' ? 1 : 0);
  const all = [...cod, ...loc].sort((a, b) => peso(a) - peso(b) || (a.ordem || 0) - (b.ordem || 0));
  if (v.capaId) { const i = all.findIndex((m) => m.id === v.capaId); if (i > 0) all.unshift(all.splice(i, 1)[0]); }
  return all;
}
function capaHTML(v, extra = '') {
  const ms = midiasDe(v);
  const f = ms.find((m) => m.tipo === 'foto') || ms[0];
  if (!f) return `${v.tipo === 'moto' ? I.moto : I.car}${extra}`;
  return (f.tipo === 'video' ? `<video src="${esc(f.src)}#t=0.5" muted playsinline preload="metadata"></video>` : `<img src="${esc(f.src)}" alt="" loading="lazy">`) + extra;
}

async function reduzirFoto(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 2048, esc_ = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (esc_ === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * esc_); c.height = Math.round(bmp.height * esc_);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.88));
    return b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

async function addMidias(vid, files) {
  const lista = (S.midias[vid] ||= []);
  let ordem = lista.reduce((a, m) => Math.max(a, m.ordem || 0), 0);
  let n = 0;
  toast(`Salvando ${files.length} arquivo(s)…`, 60000);
  for (const f0 of files) {
    const f = await reduzirFoto(f0);
    const m = { id: uid(), veiculoId: vid, tipo: f.type.startsWith('video') ? 'video' : 'foto', nome: f.name || 'midia', mime: f.type || 'application/octet-stream', blob: f, ordem: ++ordem, criado: hoje() };
    try { await DB.put('midias', m); lista.push(m); n++; } catch (e) { alert('Não consegui salvar ' + f.name + ': ' + e.message); break; }
  }
  toast(`${n} mídia(s) adicionada(s) ✓`);
}

async function delMidia(id) {
  for (const k in S.midias) {
    const i = S.midias[k].findIndex((m) => m.id === id);
    if (i >= 0) { S.midias[k].splice(i, 1); await DB.del('midias', id); if (S.urls[id]) { URL.revokeObjectURL(S.urls[id]); delete S.urls[id]; } }
  }
}

async function arquivosDe(ms) {
  const out = [];
  for (const m of ms) {
    if (m.local) out.push(new File([m.blob], m.nome || m.id, { type: m.mime || m.blob.type }));
    else {
      try { const b = await (await fetch(m.src)).blob(); out.push(new File([b], m.nome, { type: b.type })); } catch {}
    }
  }
  return out;
}

/* ---------- interação ---------- */
let toastT;
function toast(msg, ms = 2200) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('hide');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hide'), ms);
}
async function copiar(txt, avisar = true) {
  try { await navigator.clipboard.writeText(txt); }
  catch { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = 0; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  if (avisar) toast('Copiado ✓');
}
function baixar(blob, nome) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function compartilhar({ files = [], text = '', title = '' }) {
  if (text) await copiar(text, false);
  try {
    if (files.length && navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ files, text: text || undefined, title: title || undefined });
      return true;
    }
    if (!files.length && navigator.share) { await navigator.share({ text, title }); return true; }
  } catch (e) { if (e.name === 'AbortError') return false; console.warn(e); }
  // Sem suporte (computador): baixa os arquivos
  files.forEach((f) => baixar(f, f.name));
  toast(files.length ? 'Arquivos baixados · texto copiado' : 'Texto copiado ✓');
  return false;
}
function abrir(url) { window.open(url, '_blank', 'noopener'); }

function sheet(html, onMount) {
  fecharSheet();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg'; bg.id = 'sheet';
  bg.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg) fecharSheet(); });
  document.body.appendChild(bg);
  document.body.style.overflow = 'hidden';
  onMount && onMount(bg.firstElementChild);
  return bg.firstElementChild;
}
function fecharSheet() { $('#sheet')?.remove(); $('#viewer')?.remove(); document.body.style.overflow = ''; }

/* ---------- roteador ---------- */
const ROTAS = [];
function rota(re, fn, nav) { ROTAS.push({ re, fn, nav }); }
function render(manterScroll) {
  const h = location.hash.slice(1) || '/';
  const mudou = h !== S.rota;
  const y = window.scrollY;
  S.rota = h;
  for (const r of ROTAS) {
    const m = h.match(r.re);
    if (m) {
      $$('#nav a[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === r.nav));
      r.fn(...m.slice(1));
      if (mudou && !manterScroll) window.scrollTo(0, 0); else window.scrollTo(0, y);
      return;
    }
  }
  location.hash = '#/';
}
function topo(titulo, { voltar, sub, direita = '', logo = false } = {}) {
  $('#top').innerHTML = `${voltar ? `<a class="icon-btn" href="${voltar}" aria-label="Voltar">${I.back}</a>` : ''}${logo && S.cfg.logo ? `<img class="logo-top" src="/${esc(S.cfg.logo)}" alt="">` : ''}
    <h1>${titulo}${sub ? `<span class="sub">${sub}</span>` : ''}</h1>${direita}`;
}
const tela = (html) => ($('#app').innerHTML = html);

/* ações por data-a="nome" */
const A = {};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el, e); }
});

function aplicarTema() {
  const t = S.cfg.tema || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

async function iniciar() {
  try { await DB.open(); } catch (e) { tela(`<div class="empty"><b>Não consegui abrir o banco do navegador</b>${esc(e.message)}</div>`); return; }
  const vLocal = await DB.get('kv', 'versao');
  let aviso = '';
  if (vLocal === undefined) await importarDoCodigo();
  else if ((D.versao || 1) > vLocal) {
    // Junta o que chegou no código com o que está no celular (não apaga nada do aparelho)
    const r = await mesclarDoCodigo(vLocal);
    aviso = `Atualizado: ${r.novos} veículo(s) novo(s)` + (r.pulados.length ? ` · ${r.pulados.length} já existiam (não duplicados)` : '');
  }
  await carregar();
  if (S.cfg.modeloPadrao) S.modelo = S.cfg.modeloPadrao;
  if (aviso) setTimeout(() => toast(aviso, 5000), 600);
  aplicarTema();
  navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  window.addEventListener('hashchange', () => { fecharSheet(); render(); });
  render();
}
