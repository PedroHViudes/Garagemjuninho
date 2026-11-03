'use strict';
/* =============================================================
   IA (Gemini): ler arte do veículo, cadastro em lote,
   textos de divulgação com IA e modelos de mensagem próprios
   ============================================================= */
I.ia = svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>');
I.layers = svg('<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>');

/* ---------- chamadas ao servidor ---------- */
const lojaInfo = () => ({
  nomeLoja: S.cfg.nomeLoja || '', whatsapp: S.cfg.whatsapp ? fone(S.cfg.whatsapp) : '', cidade: S.cfg.cidade || '',
  slogan: S.cfg.slogan || '', hashtagsLocais: S.cfg.hashtagsLocais || '',
});
const IA = {
  async post(body) {
    let r;
    try { r = await fetch('/api/ia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, loja: lojaInfo() }) }); }
    catch { throw new Error('Sem internet — a IA precisa de conexão'); }
    let d = null; try { d = await r.json(); } catch {}
    if (!d) throw new Error(r.status === 401 ? 'Sessão expirada: abra o app e digite a senha de novo' : 'Servidor da IA não respondeu (' + r.status + ')');
    if (!r.ok) throw new Error(d.erro || 'Erro ' + r.status);
    return d;
  },
  async lerArte(file) { const { b64, mime } = await imgBase64(file); return (await this.post({ acao: 'ler', imagem: b64, mime })).dados; },
  async texto(v, canal, tom, instrucao) { return (await this.post({ acao: 'texto', veiculo: resumoIA(v), canal, tom, instrucao })).texto; },
};

async function imgBase64(file, max = 1600) {
  let blob = file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    blob = (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86))) || file;
  } catch {}
  const b64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
  return { b64, mime: blob.type || 'image/jpeg' };
}

function resumoIA(v) {
  return {
    tipo: v.tipo, marca: v.marca, modelo: v.modelo, ano: anoV(v), km: v.km || null, cor: v.cor, combustivel: v.combustivel, cambio: v.cambio,
    preco: num(v.precoAnuncio) ? brl(v.precoAnuncio) : 'consulte', opcionais: v.opcionais, observacoes: v.descricao,
    aceitaTroca: !!v.aceitaTroca, financia: !!v.financia, legendaAtual: v.legenda || '',
  };
}

/* converte o que a IA leu para os campos do veículo */
function dadosIAparaV(d = {}) {
  const lista = (a) => (Array.isArray(a) ? a : a ? [a] : []).map((s) => String(s).trim()).filter(Boolean);
  const cond = lista(d.condicoes), pend = lista(d.pendencias);
  const tc = cond.join(' ').toLowerCase();
  const negaTroca = /n[aã]o\s+(pego|aceito|fa[cç]o)?\s*troca|n[aã]o\s+troco|s[oó]\s+venda/.test(tc);
  const aceitaTroca = d.aceitaTroca ?? (!negaTroca && /troca/.test(tc));
  const financia = d.financia ?? /financ/.test(tc);
  const ano = d.anoMod || d.anoFab || '';
  return {
    tipo: d.tipo === 'moto' ? 'moto' : 'carro', marca: d.marca || '', modelo: d.modelo || '',
    anoFab: d.anoFab || ano, anoMod: ano, km: d.km || '', cor: d.cor || '', combustivel: d.combustivel || '', cambio: d.cambio || '',
    placa: placaFmt(d.placa), precoAnuncio: num(d.precoAnuncio) || 0,
    opcionais: lista(d.opcionais).join(', '),
    descricao: [lista(d.destaques).join('. '), lista(d.procedencia).join(' • '), cond.join(' • '), ...pend.map((p) => '⚠️ ' + p)].filter(Boolean).join('\n'),
    aceitaTroca: !!aceitaTroca, financia: !!financia,
    legenda: d.legenda || '', legendaStory: d.legendaStory || '',
  };
}

/* ---------- 1) PREENCHER O FORMULÁRIO COM IA ---------- */
S.iaArte = null;
document.addEventListener('change', async (e) => {
  const inp = e.target.closest('#iaArte');
  if (!inp || !inp.files[0]) return;
  const f = inp.files[0]; inp.value = '';
  const box = $('#iaRes');
  box.innerHTML = `<div class="ia-st">${I.ia}<div>Lendo a arte com IA…</div></div>`;
  try {
    const d = await IA.lerArte(f);
    const v = dadosIAparaV(d);
    const form = $('#fv');
    const set = (n, val) => { const el = form.querySelector(`[name="${n}"]`); if (el && val !== undefined && val !== null && val !== '') el.value = val; };
    set('marca', v.marca); set('modelo', v.modelo); set('anoFab', v.anoFab); set('anoMod', v.anoMod);
    set('precoAnuncio', v.precoAnuncio ? fmtN(v.precoAnuncio) : ''); set('km', v.km ? fmtN(v.km) : ''); set('placa', v.placa);
    set('cor', v.cor); set('combustivel', v.combustivel); set('cambio', v.cambio); set('opcionais', v.opcionais); set('descricao', v.descricao);
    set('legenda', v.legenda); set('legendaStory', v.legendaStory);
    form.querySelector('[name=aceitaTroca]').checked = v.aceitaTroca; form.querySelector('[name=financia]').checked = v.financia;
    const bt = $(`#segTipo [data-k="${v.tipo}"]`); if (bt) A.segTipo(bt);
    form.querySelector('details.more').open = true;
    S.iaArte = f;
    const dup = acharDuplicado(v);
    box.innerHTML = `<div class="ia-st ok">${I.check}<div>Pronto! Confira os campos antes de salvar${d.confianca && d.confianca !== 'alta' ? ` · leitura com confiança <b>${esc(d.confianca)}</b>` : ''}.<br><small>A arte será salva como foto do veículo.</small></div></div>
      ${dup ? `<div class="ia-st bad">${I.alert}<div>Possível duplicado: ${esc(dup.motivo)}. <a href="#/v/${dup.v.id}">ver</a></div></div>` : ''}
      ${(d.avisos || []).length ? `<div class="ia-st warn">${(d.avisos || []).map(esc).join('<br>')}</div>` : ''}`;
  } catch (err) {
    box.innerHTML = `<div class="ia-st bad">${I.alert}<div>${esc(err.message)}</div></div>`;
  }
});

/* ---------- 2) CADASTRO EM LOTE ---------- */
rota(/^\/lote$/, () => {
  topo('Cadastro em lote', { voltar: '#/veiculos', sub: 'A IA lê as artes e preenche tudo' });
  const L = S.lote;
  const nOk = L.filter((x) => x.status === 'ok' && x.incluir).length;
  tela(`
    <div class="card">
      <h3>${I.layers} Como funciona</h3>
      <p class="muted" style="margin:0 0 10px">1. Escolha várias <b>artes</b> (imagens com as informações do veículo).<br>2. A IA lê cada uma e já escreve a legenda.<br>3. Confira, anexe os vídeos se quiser e toque em <b>Cadastrar</b>. Duplicados ficam desmarcados.</p>
      <label class="btn pri block">${I.ia} Escolher artes${L.length ? ' (adicionar mais)' : ''}<input type="file" accept="image/*" multiple class="hide" id="loteIn"></label>
      <label class="sw mt">Salvar a arte como foto do veículo<input type="checkbox" id="loteArte" ${S.loteArte !== false ? 'checked' : ''}></label>
    </div>
    <div id="loteLista">${L.map(linhaLote).join('')}</div>
    ${L.length ? `<div class="lote-bar">
      <button class="btn" data-a="loteLimpar">${I.trash} Limpar</button>
      <button class="btn pri" data-a="loteSalvar" ${nOk ? '' : 'disabled'} id="loteBtn">${I.check} Cadastrar ${nOk} selecionado(s)</button>
    </div>` : ''}
  `);
  $('#loteIn').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; loteAdicionar(fs); });
  $('#loteArte').addEventListener('change', (e) => { S.loteArte = e.target.checked; });
}, 'veiculos');

function loteAdicionar(files) {
  for (const f of files) S.lote.push({ id: uid(), file: f, url: URL.createObjectURL(f), status: 'fila', dados: null, incluir: false, videos: [], avisos: [] });
  render(true); loteProcessar();
}
let loteAtivos = 0;
async function loteProcessar() {
  while (loteAtivos < 2) {
    const it = S.lote.find((x) => x.status === 'fila');
    if (!it) return;
    loteAtivos++; it.status = 'lendo'; loteAtualizar(it);
    (async () => {
      for (let tent = 0; tent < 4; tent++) {
        try {
          const d = await IA.lerArte(it.file);
          it.dados = dadosIAparaV(d); it.avisos = d.avisos || []; it.confianca = d.confianca; it.status = 'ok'; it.erro = '';
          break;
        } catch (e) {
          it.erro = e.message; it.status = 'erro';
          if (/limite/i.test(e.message) && tent < 3) { const seg = 20 + tent * 15; it.status = 'lendo'; it.erro = `Limite da IA — tentando de novo em ${seg} s…`; loteAtualizar(it); await new Promise((r) => setTimeout(r, seg * 1000)); continue; }
          break;
        }
      }
      loteChecarDup(); loteAtivos--;
      if (location.hash.startsWith('#/lote')) { S.lote.filter((x) => x.status === 'ok').forEach((x) => { const tg = $('#ll-' + x.id + ' .lote-top .tag'); if (tg && x !== it) tg.outerHTML = x.dup ? `<span class="tag preju">⚠ ${esc(x.dup)}</span>` : '<span class="tag lucro">novo</span>'; }); loteAtualizar(it); loteBarra(); }
      loteProcessar();
    })();
  }
}
// duplicados contra o estoque e contra outras artes do mesmo lote
function loteChecarDup() {
  const vistos = [];
  for (const it of S.lote) {
    if (it.status !== 'ok') continue;
    const d1 = acharDuplicado(it.dados);
    const d2 = !d1 && acharDuplicado(it.dados, vistos.map((x) => normV({ ...x.dados, id: x.id })));
    const antes = it.dup;
    it.dup = d1 ? d1.motivo : d2 ? 'repetido neste lote' : '';
    if (it.incluir === false && antes === undefined) it.incluir = !it.dup;
    if (it.dup && antes !== it.dup) it.incluir = false;
    vistos.push(it);
  }
}
function loteAtualizar(it) {
  if (!location.hash.startsWith('#/lote')) return;
  if (it) { const el = $('#ll-' + it.id); if (el) { el.outerHTML = linhaLote(it); return; } }
  render(true);
}

function linhaLote(it) {
  const d = it.dados || {};
  const st = { fila: 'Na fila…', lendo: it.erro || 'Lendo com IA…', ok: '', erro: it.erro }[it.status];
  const inp = (k, lbl, val, attrs = '') => `<label class="l">${lbl}<input class="i" data-lf="${k}" data-id="${it.id}" value="${esc(val ?? '')}" ${attrs}></label>`;
  return `<div class="card lote ${it.incluir ? 'on' : ''}" id="ll-${it.id}">
    <div class="lote-top">
      <img src="${it.url}" alt="">
      <div class="grow">
        ${it.status === 'ok' ? `<b>${esc([d.marca, d.modelo].filter(Boolean).join(' ') || 'Sem nome')}</b>
          <small>${esc([d.anoMod, d.km ? fmtKm(d.km) : '', num(d.precoAnuncio) ? brl(d.precoAnuncio) : 'sem preço'].filter(Boolean).join(' · '))}</small>
          ${it.dup ? `<span class="tag preju">⚠ ${esc(it.dup)}</span>` : '<span class="tag lucro">novo</span>'}
          ${it.confianca && it.confianca !== 'alta' ? `<span class="tag">confiança ${esc(it.confianca)}</span>` : ''}`
        : `<b>${esc(it.file.name)}</b><small class="${it.status === 'erro' ? 'neg' : ''}">${esc(st)}</small>`}
      </div>
      ${it.status === 'ok' ? `<label class="sw" style="padding:0"><input type="checkbox" data-linc="${it.id}" ${it.incluir ? 'checked' : ''} aria-label="Incluir no cadastro"></label>` : ''}
      ${it.status === 'erro' ? `<button class="btn sm" data-a="loteRetry" data-id="${it.id}">${I.refresh}</button>` : ''}
      <button class="x" data-a="loteDel" data-id="${it.id}">${I.x}</button>
    </div>
    ${it.status === 'ok' ? `
    ${(it.avisos || []).length ? `<div class="ia-st warn">${it.avisos.map(esc).join('<br>')}</div>` : ''}
    <details class="more">
      <summary>Conferir / editar dados</summary>
      <div class="f mt">
        <div class="seg">${['carro', 'moto'].map((t) => `<button type="button" class="${d.tipo === t ? 'on' : ''}" data-a="loteTipo" data-k="${t}" data-id="${it.id}">${t === 'carro' ? '🚗 Carro' : '🏍️ Moto'}</button>`).join('')}</div>
        <div class="f2">${inp('marca', 'Marca', d.marca)}${inp('modelo', 'Modelo / versão', d.modelo)}</div>
        <div class="f2">${inp('anoFab', 'Ano fab.', d.anoFab, 'inputmode="numeric"')}${inp('anoMod', 'Ano modelo', d.anoMod, 'inputmode="numeric"')}</div>
        <div class="f2">${inp('precoAnuncio', 'Preço', d.precoAnuncio ? fmtN(d.precoAnuncio) : '', 'inputmode="decimal"')}${inp('km', 'KM', d.km ? fmtN(d.km) : '', 'inputmode="numeric"')}</div>
        <div class="f2">${inp('cor', 'Cor', d.cor)}${inp('placa', 'Placa', d.placa, 'style="text-transform:uppercase" maxlength="8"')}</div>
        <div class="f2">${inp('combustivel', 'Combustível', d.combustivel)}${inp('cambio', 'Câmbio', d.cambio)}</div>
        <label class="l">Opcionais<textarea class="i" data-lf="opcionais" data-id="${it.id}" style="min-height:60px">${esc(d.opcionais)}</textarea></label>
        <label class="l">Descrição / destaques<textarea class="i" data-lf="descricao" data-id="${it.id}" style="min-height:70px">${esc(d.descricao)}</textarea></label>
        <label class="l">Legenda do post (feita pela IA)<textarea class="i" data-lf="legenda" data-id="${it.id}" style="min-height:120px">${esc(d.legenda)}</textarea></label>
        <label class="l">Legenda de story<textarea class="i" data-lf="legendaStory" data-id="${it.id}" style="min-height:60px">${esc(d.legendaStory)}</textarea></label>
        <label class="sw">Aceita troca<input type="checkbox" data-lc="aceitaTroca" data-id="${it.id}" ${d.aceitaTroca ? 'checked' : ''}></label>
        <label class="sw">Financia<input type="checkbox" data-lc="financia" data-id="${it.id}" ${d.financia ? 'checked' : ''}></label>
      </div>
    </details>
    <label class="btn sm mt">${I.play} ${it.videos.length ? it.videos.length + ' vídeo(s) anexado(s) · trocar' : 'Anexar vídeo/Reels (opcional)'}<input type="file" accept="video/*,image/*" multiple class="hide" data-lv="${it.id}"></label>` : ''}
  </div>`;
}
const itLote = (id) => S.lote.find((x) => x.id === id);
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-lf]'); if (!el) return;
  const it = itLote(el.dataset.id); if (!it?.dados) return;
  const k = el.dataset.lf;
  it.dados[k] = ['precoAnuncio', 'km'].includes(k) ? num(el.value) : k === 'placa' ? placaFmt(el.value) : el.value;
  if (['marca', 'modelo', 'anoMod', 'anoFab', 'placa'].includes(k)) { clearTimeout(it._t); it._t = setTimeout(() => { loteChecarDup(); const card = $('#ll-' + it.id); if (card) { const tg = card.querySelector('.lote-top .tag'); if (tg) tg.outerHTML = it.dup ? `<span class="tag preju">⚠ ${esc(it.dup)}</span>` : '<span class="tag lucro">novo</span>'; } }, 500); }
});
document.addEventListener('change', (e) => {
  const inc = e.target.closest('[data-linc]');
  if (inc) { const it = itLote(inc.dataset.linc); if (it) { it.incluir = inc.checked; $('#ll-' + it.id)?.classList.toggle('on', it.incluir); loteBarra(); } return; }
  const c = e.target.closest('[data-lc]');
  if (c) { const it = itLote(c.dataset.id); if (it?.dados) it.dados[c.dataset.lc] = c.checked; return; }
  const vi = e.target.closest('[data-lv]');
  if (vi) { const it = itLote(vi.dataset.lv); if (it) { it.videos = [...vi.files]; loteAtualizar(it); } }
});
function loteBarra() {
  const b = $('#loteBtn'); if (!b) { render(true); return; }
  const n = S.lote.filter((x) => x.status === 'ok' && x.incluir).length;
  b.disabled = !n; b.innerHTML = `${I.check} Cadastrar ${n} selecionado(s)`;
}
A.loteTipo = (el) => { const it = itLote(el.dataset.id); it.dados.tipo = el.dataset.k; el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); loteChecarDup(); };
A.loteDel = (el) => { const i = S.lote.findIndex((x) => x.id === el.dataset.id); if (i >= 0) { URL.revokeObjectURL(S.lote[i].url); S.lote.splice(i, 1); } render(true); };
A.loteRetry = (el) => { const it = itLote(el.dataset.id); it.status = 'fila'; it.erro = ''; loteAtualizar(it); loteProcessar(); };
A.loteLimpar = () => { if (!confirm('Limpar a lista do lote?')) return; S.lote.forEach((x) => URL.revokeObjectURL(x.url)); S.lote = []; render(true); };
A.loteSalvar = async () => {
  const sel = S.lote.filter((x) => x.status === 'ok' && x.incluir);
  if (!sel.length) return;
  const comDup = sel.filter((x) => x.dup);
  if (comDup.length && !confirm(`${comDup.length} marcado(s) parecem duplicados. Cadastrar mesmo assim?`)) return;
  let n = 0;
  for (const it of sel) {
    const d = it.dados;
    const base = slug([d.marca, d.modelo, d.anoMod].join(' ')) || 'veiculo';
    let id = base; let k = 2; while (getV(id)) id = base + '-' + k++;
    const v = normV({ ...d, id, anoMod: d.anoMod || d.anoFab, compra: { valor: 0, data: hoje(), pagoCaixa: true } });
    await salvarV(v);
    const files = [...(S.loteArte !== false ? [it.file] : []), ...it.videos];
    if (files.length) {
      const antes = (S.midias[v.id] || []).length;
      await addMidias(v.id, files);
      (S.midias[v.id] || []).slice(antes).forEach((m) => { if (m.tipo === 'video') { m.story = true; DB.put('midias', m); } });
    }
    n++;
  }
  S.lote = S.lote.filter((x) => !sel.includes(x));
  toast(`${n} veículo(s) cadastrado(s) ✓`, 4000);
  location.hash = S.lote.length ? '#/lote' : '#/veiculos';
  if (S.lote.length) render(true);
};

/* ---------- 3) MODELOS DE MENSAGEM (criados no app) ---------- */
const VARS = [
  ['titulo', 'Marca e modelo'], ['ano', 'Ano'], ['km', 'KM'], ['preco', 'Preço'], ['opcionais', 'Opcionais (lista ✅)'], ['opcionais_linha', 'Opcionais (linha)'],
  ['descricao', 'Descrição'], ['condicoes', 'Troca/financia'], ['cor', 'Cor'], ['combustivel', 'Combustível'], ['cambio', 'Câmbio'],
  ['whatsapp', 'WhatsApp'], ['cidade', 'Cidade'], ['loja', 'Loja'], ['slogan', 'Slogan'], ['hashtags', 'Hashtags'], ['emoji', '🚗/🏍️'],
  ['marca', 'Marca'], ['modelo', 'Modelo'], ['placa', 'Placa'], ['album', 'Link do álbum'],
];
function varsDe(v) {
  const c = S.cfg, moto = v.tipo === 'moto';
  const ops = String(v.opcionais || '').split(/\s*[,;\n]\s*/).filter(Boolean);
  const tags = [c.hashtags || '', '#' + slug(v.marca).replace(/-/g, ''), '#' + slug(String(v.modelo).split(' ')[0]).replace(/-/g, '')].join(' ');
  return {
    titulo: nomeV(v).toUpperCase(), marca: v.marca || '', modelo: v.modelo || '', ano: String(anoV(v) || ''), km: v.km ? fmtKm(v.km) : '',
    preco: num(v.precoAnuncio) ? brl(v.precoAnuncio) : 'Consulte', opcionais: ops.map((o) => '✅ ' + o).join('\n'), opcionais_linha: ops.join(', '),
    descricao: v.descricao || '', condicoes: [v.aceitaTroca && 'Aceito troca', v.financia && 'Financio'].filter(Boolean).join(' • '),
    cor: v.cor || '', combustivel: v.combustivel || '', cambio: v.cambio || '', whatsapp: c.whatsapp ? fone(c.whatsapp) : '', cidade: c.cidade || '',
    loja: c.nomeLoja || '', slogan: c.slogan || '', hashtags: [...new Set(tags.split(/\s+/).filter((t) => t.length > 1))].join(' '),
    emoji: moto ? '🏍️' : '🚗', placa: v.placa || '', album: v.linkAlbum || '',
  };
}
// troca {variavel}; linha em que TODAS as variáveis estão vazias some sozinha (ex: "🛣️ {km}" sem km)
function aplicarModelo(txt, v) {
  const m = varsDe(v);
  return String(txt || '').split('\n').map((ln) => {
    const vs = [...ln.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).filter((k) => k in m);
    if (vs.length && vs.every((k) => !String(m[k]).trim())) return null;
    return ln.replace(/\{(\w+)\}/g, (a, k) => (k in m ? m[k] : a));
  }).filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const modelosMsg = () => S.cfg.modelosMsg || [];

function cardModelos() {
  const ms = modelosMsg();
  return `<div class="card">
    <h3>${I.megaphone} Mensagens de compartilhamento <span class="r">${ms.length}</span></h3>
    <p class="muted" style="margin:0 0 8px">Crie seus próprios textos com variáveis como <b>{titulo}</b>, <b>{preco}</b>, <b>{km}</b>. Eles aparecem na aba <b>Divulgar</b> de cada veículo. Linha sem dado (ex: sem km) some sozinha.</p>
    <div class="lines">${ms.map((t) => `<div class="line"><div class="grow"><b>${esc(t.nome)}</b><small>${esc(t.texto.split('\n')[0].slice(0, 60))}</small></div>
      <button class="btn sm" data-a="editModelo" data-id="${esc(t.id)}">${I.edit}</button><button class="x" data-a="delModelo" data-id="${esc(t.id)}">${I.trash}</button></div>`).join('')}</div>
    <button class="btn block mt" data-a="editModelo">${I.plus} Novo modelo de mensagem</button>
  </div>`;
}
A.editModelo = (el) => {
  const t0 = modelosMsg().find((x) => x.id === el.dataset.id);
  const t = t0 ? { ...t0 } : { id: uid(), nome: '', texto: '{emoji} *{titulo} {ano}*\n🛣️ {km}\n{opcionais}\n\n💰 *{preco}*\n🤝 {condicoes}\n📍 {cidade}\n📲 {whatsapp}' };
  const ex = S.veiculos.find((v) => v.status !== 'vendido') || S.veiculos[0] || normV({ marca: 'Fiat', modelo: 'Uno 1.0', anoMod: 2012, km: 90000, precoAnuncio: 25990, opcionais: 'Ar, Direção' });
  const s = sheet(`<h2>${t0 ? 'Editar' : 'Novo'} modelo<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <div class="f">
      <label class="l">Nome (aparece no botão)<input class="i" id="mNome" value="${esc(t.nome)}" placeholder="Ex: Grupo Zap"></label>
      <label class="l">Texto<textarea class="i" id="mTxt" style="min-height:200px;font-size:14px">${esc(t.texto)}</textarea></label>
      <div class="muted">Toque para inserir:</div>
      <div class="chips" style="flex-wrap:wrap">${VARS.map(([k, n]) => `<button type="button" class="chip" data-a="insVar" data-k="${k}" title="${esc(n)}">{${k}}</button>`).join('')}</div>
      <div class="muted">Prévia com ${esc(nomeV(ex))}:</div>
      <div class="adtext" id="mPrev"></div>
      <button class="btn pri block" id="mSalvar">${I.check} Salvar modelo</button>
    </div>`);
  const prev = () => { $('#mPrev', s).textContent = aplicarModelo($('#mTxt', s).value, ex); };
  $('#mTxt', s).addEventListener('input', prev); prev();
  $('#mSalvar', s).onclick = async () => {
    t.nome = $('#mNome', s).value.trim() || 'Modelo'; t.texto = $('#mTxt', s).value;
    const lst = [...modelosMsg()]; const i = lst.findIndex((x) => x.id === t.id);
    if (i >= 0) lst[i] = t; else lst.push(t);
    S.cfg.modelosMsg = lst; await salvarCfg(); fecharSheet(); toast('Modelo salvo ✓'); render(true);
  };
};
A.insVar = (el) => {
  const ta = $('#mTxt'); const k = `{${el.dataset.k}}`;
  const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
  ta.value = ta.value.slice(0, a) + k + ta.value.slice(b); ta.focus(); ta.selectionStart = ta.selectionEnd = a + k.length;
  ta.dispatchEvent(new Event('input'));
};
A.delModelo = async (el) => { if (!confirm('Excluir este modelo?')) return; S.cfg.modelosMsg = modelosMsg().filter((x) => x.id !== el.dataset.id); if (S.modelo === 'm:' + el.dataset.id) S.modelo = 'whatsapp'; await salvarCfg(); render(true); };

/* ---------- 4) CRIAR TEXTO COM IA (aba Divulgar) ---------- */
S.iaOpt = { canal: 'instagram', tom: 'direto' };
A.iaTexto = (el) => {
  const v = getV(el.dataset.id); const o = S.iaOpt;
  const chips = (grp, arr) => arr.map(([k, t]) => `<button type="button" class="chip ${o[grp] === k ? 'on' : ''}" data-a="iaOpt" data-g="${grp}" data-k="${k}">${t}</button>`).join('');
  const s = sheet(`<h2>${I.ia} Criar texto com IA<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <div class="f">
      <div class="muted">Para onde?</div>
      <div class="chips" style="flex-wrap:wrap" data-grp="canal">${chips('canal', [['instagram', 'Instagram/Reels'], ['whatsapp', 'WhatsApp'], ['story', 'Story'], ['facebook', 'Facebook'], ['olx', 'OLX'], ['tiktok', 'TikTok']])}</div>
      <div class="muted">Tom</div>
      <div class="chips" style="flex-wrap:wrap" data-grp="tom">${chips('tom', [['direto', 'Direto'], ['emocional', 'Emocional'], ['urgencia', 'Urgência'], ['premium', 'Premium'], ['divertido', 'Divertido']])}</div>
      <label class="l">Pedido extra (opcional)<input class="i" id="iaInst" placeholder="Ex: destacar que é único dono, falar do preço abaixo da FIPE"></label>
      <button class="btn pri block" id="iaGo">${I.ia} Gerar texto</button>
      <textarea class="i adtext hide" id="iaOut" rows="12"></textarea>
      <div class="bgrid hide" id="iaAcoes">
        <button class="btn" id="iaUsar">${I.check} Usar agora</button>
        <button class="btn" id="iaCopiar">${I.copy} Copiar</button>
        <button class="btn" id="iaPost">Salvar como “Minha”</button>
        <button class="btn" id="iaStory">Salvar como Story</button>
      </div>
    </div>`);
  const out = $('#iaOut', s);
  $('#iaGo', s).onclick = async () => {
    const b = $('#iaGo', s); b.disabled = true; b.innerHTML = `${I.ia} Escrevendo…`;
    try {
      out.value = await IA.texto(v, o.canal, o.tom, $('#iaInst', s).value);
      out.classList.remove('hide'); $('#iaAcoes', s).classList.remove('hide');
    } catch (e) { toast(e.message, 5000); }
    b.disabled = false; b.innerHTML = `${I.ia} ${out.value ? 'Gerar outro' : 'Gerar texto'}`;
  };
  $('#iaUsar', s).onclick = () => { const t = out.value; fecharSheet(); const a = $('#adtext'); if (a) a.value = t; copiar(t, false); toast('Texto pronto e copiado ✓'); };
  $('#iaCopiar', s).onclick = () => copiar(out.value);
  $('#iaPost', s).onclick = async () => { v.legenda = out.value; await salvarV(v); S.modelo = 'propria'; fecharSheet(); toast('Salvo como sua legenda ✓'); render(true); };
  $('#iaStory', s).onclick = async () => { v.legendaStory = out.value; await salvarV(v); S.modelo = 'story'; fecharSheet(); toast('Salvo como legenda de story ✓'); render(true); };
};
A.iaOpt = (el) => { S.iaOpt[el.dataset.g] = el.dataset.k; el.parentNode.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === el)); };

/* ---------- teste de conexão (Ajustes) ---------- */
A.iaTeste = async (el) => {
  el.disabled = true; const t = el.innerHTML; el.innerHTML = 'Testando…';
  try { const d = await IA.post({ acao: 'teste' }); toast('IA funcionando ✓ (' + d.modelo + ')', 4000); }
  catch (e) { alert('A IA não respondeu:\n' + e.message); }
  el.disabled = false; el.innerHTML = t;
};
