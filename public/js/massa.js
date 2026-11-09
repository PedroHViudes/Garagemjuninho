'use strict';
/* =============================================================
   Divulgar o estoque todo de uma vez:
   escolhe 1 imagem e 1 texto de cada veículo e compartilha
   tudo junto (WhatsApp, Instagram…) ou um por um.
   ============================================================= */
S.dv = { sel: null, img: {}, txt: {}, edit: {}, filtro: 'disponiveis' };
const DV_MAX = 30;   // o WhatsApp aceita até 30 arquivos por envio

function dvLista() {
  const f = S.dv.filtro;
  return S.veiculos.filter((v) => {
    if (v.status === 'vendido') return false;
    if (f === 'todos') return true;                     // à venda + reservados
    if (v.status === 'reservado') return false;
    return f === 'disponiveis' || v.tipo === f;         // carro / moto
  });
}
const dvFotos = (v) => midiasDe(v).filter((m) => m.tipo === 'foto');
// qual imagem usar quando a escolha é "para todos"
function dvResolverImg(v, modo) {
  const fs = dvFotos(v);
  if (modo === 'card') return 'card';
  if (modo === 'arte') return (fs.find((m) => /arte|card|anuncio/i.test(m.nome || '')) || fs[0])?.id || 'card';
  if (modo === 'foto') return (fs.find((m) => !/arte|card|anuncio|feed|story/i.test(m.nome || '')) || fs[0])?.id || 'card';
  return fs[0]?.id || 'card';   // capa
}
const dvImg = (v) => { const id = S.dv.img[v.id]; return id && (id === 'card' || dvFotos(v).some((m) => m.id === id)) ? id : dvResolverImg(v, S.cfg.dvImg || 'capa'); };
const dvTxtModelo = (v) => S.dv.txt[v.id] || S.cfg.dvTxt || (v.legenda ? 'propria' : 'whatsapp');
const dvTexto = (v) => S.dv.edit[v.id] ?? textoAnuncio(v, dvTxtModelo(v));
function dvOpcoesTexto(v) {
  return [
    ...(v.legenda ? [['propria', 'Minha legenda']] : []), ...(v.legendaStory ? [['story', 'Story']] : []),
    ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['olx', 'OLX'],
    ...(S.cfg.modelosMsg || []).map((t) => ['m:' + t.id, t.nome]),
  ];
}

rota(/^\/divulgar(?:\?(\w+))?$/, (acao) => {
  if (acao === 'todos') { S.dv.filtro = 'disponiveis'; S.dv.sel = null; }
  const lista = dvLista();
  if (!S.dv.sel) S.dv.sel = new Set(lista.map((v) => v.id));
  const sel = lista.filter((v) => S.dv.sel.has(v.id));
  topo('Divulgar estoque', { voltar: '#/veiculos', sub: `${sel.length} de ${lista.length} selecionado(s)` });
  const chipsTxt = [['propria', 'Minha legenda'], ['story', 'Story'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['olx', 'OLX'], ...(S.cfg.modelosMsg || []).map((t) => ['m:' + t.id, t.nome])];
  const txtG = S.cfg.dvTxt || '', imgG = S.cfg.dvImg || 'capa';
  tela(`
    <div class="card">
      <h3>${I.megaphone} Para todos de uma vez</h3>
      <div class="muted">Imagem</div>
      <div class="chips" style="flex-wrap:wrap">${[['capa', 'Capa'], ['arte', 'Arte do anúncio'], ['foto', 'Foto real'], ['card', '✨ Card com preço']].map(([k, t]) => `<button class="chip ${imgG === k ? 'on' : ''}" data-a="dvImgTodos" data-k="${k}">${t}</button>`).join('')}</div>
      <div class="muted">Texto</div>
      <div class="chips" style="flex-wrap:wrap">${chipsTxt.map(([k, t]) => `<button class="chip ${txtG === k ? 'on' : ''}" data-a="dvTxtTodos" data-k="${esc(k)}">${esc(t)}</button>`).join('')}</div>
      <label class="sw mt">Escrever a descrição na foto<input type="checkbox" id="dvNaFoto" ${S.cfg.dvNaFoto !== false ? 'checked' : ''}></label>
      <p class="muted" style="margin:0 0 6px">Assim cada foto leva a descrição do próprio carro — dá para mandar <b>todos juntos</b> no WhatsApp sem misturar os textos.</p>
      <p class="muted" style="margin:2px 0 0">Depois ajuste um por um abaixo: toque na imagem que quer e troque o texto de cada veículo.</p>
    </div>
    <div class="chips">
      ${[['disponiveis', 'À venda'], ['todos', 'Com reservados'], ['carro', 'Só carros'], ['moto', 'Só motos']].map(([k, t]) => `<button class="chip ${S.dv.filtro === k ? 'on' : ''}" data-a="dvFiltro" data-k="${k}">${t}</button>`).join('')}
      <span style="width:8px;flex:none"></span>
      <button class="chip" data-a="dvTodos">${sel.length === lista.length ? 'Desmarcar todos' : 'Marcar todos'}</button>
    </div>
    <div id="dvLista">${lista.map(dvLinha).join('') || `<div class="empty">${I.car}<b>Nenhum veículo à venda</b>Cadastre veículos para divulgar.</div>`}</div>
    ${lista.length ? `<div class="lote-bar dv-bar">
      <button class="btn" data-a="dvCopiar" ${sel.length ? '' : 'disabled'}>${I.copy} Textos</button>
      <button class="btn pri" data-a="dvPreparar" id="dvBtn" ${sel.length ? '' : 'disabled'}>${I.share} Compartilhar ${sel.length}</button>
    </div>` : ''}
  `);
  $('#dvNaFoto')?.addEventListener('change', async (e) => { S.cfg.dvNaFoto = e.target.checked; await salvarCfg(); });
  // "Exportar todos": já começa a preparar (o envio pede só um toque)
  if (acao === 'todos' && lista.length) { history.replaceState(null, '', '#/divulgar'); S.rota = '/divulgar'; setTimeout(() => A.dvPreparar(), 50); }
}, 'veiculos');

function dvLinha(v) {
  const on = S.dv.sel.has(v.id), img = dvImg(v), fs = dvFotos(v), mod = dvTxtModelo(v);
  const editado = S.dv.edit[v.id] !== undefined;
  return `<div class="card lote dv ${on ? 'on' : ''}" id="dv-${v.id}">
    <div class="lote-top">
      <div class="grow"><b>${esc(nomeV(v))}</b><small>${esc([anoV(v), v.km ? fmtKm(v.km) : '', num(v.precoAnuncio) ? brl(v.precoAnuncio) : 'sem preço'].filter(Boolean).join(' · '))}</small></div>
      <label class="sw" style="padding:0"><input type="checkbox" data-dvsel="${v.id}" ${on ? 'checked' : ''} aria-label="Incluir ${esc(nomeV(v))}"></label>
    </div>
    <div class="dv-imgs" role="radiogroup" aria-label="Imagem">
      <button type="button" class="dv-img card-g ${img === 'card' ? 'on' : ''}" data-a="dvImg" data-id="${v.id}" data-m="card" aria-label="Card com preço"><span>✨<br>Card<br>com preço</span></button>
      ${fs.map((m) => `<button type="button" class="dv-img ${img === m.id ? 'on' : ''}" data-a="dvImg" data-id="${v.id}" data-m="${esc(m.id)}"><img src="${esc(m.src)}" alt="" loading="lazy"></button>`).join('')}
    </div>
    <div class="dv-txt">
      <select class="i" data-dvtxt="${v.id}" aria-label="Texto">${dvOpcoesTexto(v).map(([k, t]) => `<option value="${esc(k)}" ${mod === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      ${editado ? `<button class="btn sm" data-a="dvDesfazer" data-id="${v.id}" title="Voltar ao texto do modelo">${I.refresh}</button>` : ''}
    </div>
    <textarea class="i adtext dv-prev" data-dvedit="${v.id}" rows="4">${esc(dvTexto(v))}</textarea>
  </div>`;
}
function dvAtualizar(v) { const el = $('#dv-' + v.id); if (el) el.outerHTML = dvLinha(v); }
function dvBarra() {
  const lista = dvLista(), n = lista.filter((v) => S.dv.sel.has(v.id)).length;
  const b = $('#dvBtn'); if (b) { b.disabled = !n; b.innerHTML = `${I.share} Compartilhar ${n}`; }
  const c = $('[data-a="dvCopiar"]'); if (c) c.disabled = !n;
  const sub = $('#top .sub'); if (sub) sub.textContent = `${n} de ${lista.length} selecionado(s)`;
  const t = $('[data-a="dvTodos"]'); if (t) t.textContent = n === lista.length ? 'Desmarcar todos' : 'Marcar todos';
}

A.dvFiltro = (el) => { S.dv.filtro = el.dataset.k; S.dv.sel = null; render(true); };
A.dvTodos = () => { const l = dvLista(); const todos = l.every((v) => S.dv.sel.has(v.id)); l.forEach((v) => (todos ? S.dv.sel.delete(v.id) : S.dv.sel.add(v.id))); render(true); };
A.dvImg = (el) => { const v = getV(el.dataset.id); S.dv.img[v.id] = el.dataset.m; el.parentNode.querySelectorAll('.dv-img').forEach((b) => b.classList.toggle('on', b === el)); };
A.dvImgTodos = async (el) => { S.cfg.dvImg = el.dataset.k; S.dv.img = {}; await salvarCfg(); render(true); };
A.dvTxtTodos = async (el) => { S.cfg.dvTxt = el.dataset.k; S.dv.txt = {}; S.dv.edit = {}; await salvarCfg(); render(true); };
A.dvDesfazer = (el) => { delete S.dv.edit[el.dataset.id]; dvAtualizar(getV(el.dataset.id)); };
document.addEventListener('change', (e) => {
  const s = e.target.closest('[data-dvsel]');
  if (s) { s.checked ? S.dv.sel.add(s.dataset.dvsel) : S.dv.sel.delete(s.dataset.dvsel); $('#dv-' + s.dataset.dvsel)?.classList.toggle('on', s.checked); dvBarra(); return; }
  const t = e.target.closest('[data-dvtxt]');
  if (t) { const v = getV(t.dataset.dvtxt); S.dv.txt[v.id] = t.value; delete S.dv.edit[v.id]; dvAtualizar(v); }
});
document.addEventListener('input', (e) => {
  const t = e.target.closest('[data-dvedit]'); if (!t) return;
  const id = t.dataset.dvedit, novo = S.dv.edit[id] === undefined;
  S.dv.edit[id] = t.value;
  if (novo) { const sel = t.parentNode.querySelector('.dv-txt'); if (sel && !sel.querySelector('button')) sel.insertAdjacentHTML('beforeend', `<button class="btn sm" data-a="dvDesfazer" data-id="${id}" title="Voltar ao texto do modelo">${I.refresh}</button>`); }
});

const dvSelecionados = () => dvLista().filter((v) => S.dv.sel.has(v.id));
const DV_SEP = '\n\n━━━━━━━━━━━━\n\n';
A.dvCopiar = () => copiar(dvSelecionados().map(dvTexto).join(DV_SEP));

// prepara os arquivos antes (o celular só deixa compartilhar logo depois de um toque)
A.dvPreparar = async () => {
  const vs = dvSelecionados(); if (!vs.length) return;
  const s = sheet(`<h2>${I.share} Divulgar ${vs.length} veículo(s)<button class="icon-btn" data-a="fechar">${I.x}</button></h2><div id="dvPrep"></div>`);
  const box = $('#dvPrep', s);
  box.innerHTML = `<div class="ia-load"><div class="ia-scan"><div class="ia-orb">${I.image}</div><i class="ia-linha"></i></div>
    <div class="ia-info"><div class="ia-etapa">Preparando as imagens…</div><div class="ia-barra"><i style="width:0"></i></div><div class="ia-tempo"><span>0 de ${vs.length}</span></div></div></div>`;
  const itens = [];
  for (let i = 0; i < vs.length; i++) {
    const v = vs[i], esc_ = dvImg(v);
    let file = null;
    try {
      const naFoto = S.cfg.dvNaFoto !== false;
      const nome = `${String(i + 1).padStart(2, '0')}-${slug(nomeV(v))}`;
      if (esc_ === 'card') {
        const card = await gerarCard(v, false);
        if (naFoto) { const u = URL.createObjectURL(card); try { file = new File([await fotoComTexto(v, { src: u }, dvTexto(v), false)], `${nome}-card.jpg`, { type: 'image/jpeg' }); } finally { URL.revokeObjectURL(u); } }
        else file = new File([card], `${nome}-card.jpg`, { type: 'image/jpeg' });
      } else if (naFoto) { const b = await fotoComTexto(v, dvFotos(v).find((x) => x.id === esc_), dvTexto(v)); file = new File([b], `${nome}.jpg`, { type: 'image/jpeg' }); }
      else { const m = dvFotos(v).find((x) => x.id === esc_); const [f] = await arquivosDe([m]); if (f) file = new File([f], `${String(i + 1).padStart(2, '0')}-${slug(nomeV(v))}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`, { type: f.type || 'image/jpeg' }); }
    } catch (e) { console.warn(e); }
    itens.push({ v, file, texto: dvTexto(v), feito: false });
    if (!$('#dvPrep')) return;          // fechou a janela
    $('.ia-barra i', box).style.width = ((i + 1) / vs.length * 100).toFixed(0) + '%';
    $('.ia-tempo span', box).textContent = `${i + 1} de ${vs.length}`;
    $('.ia-etapa', box).textContent = 'Preparando ' + nomeV(v) + '…';
  }
  (S.dvItens || []).forEach((x) => x.url && URL.revokeObjectURL(x.url));
  S.dvItens = itens;
  dvTelaPronto(box);
};
function dvTelaPronto(box) {
  const it = S.dvItens, partes = [];
  for (let i = 0; i < it.length; i += DV_MAX) partes.push([i, Math.min(it.length, i + DV_MAX)]);
  const semImg = it.filter((x) => !x.file).length;
  const prox = it.findIndex((x) => !x.feito);
  box.innerHTML = `
    <div class="ia-st ok">${I.check}<div>Pronto! ${it.length - semImg} imagem(ns) e ${it.length} texto(s).${semImg ? ` <small>${semImg} sem imagem (vai só o texto).</small>` : ''}</div></div>
    <div class="sec-t" style="margin-top:14px">Tudo junto</div>
    <div class="bgrid${partes.length > 1 ? '' : ' one'}">${partes.map(([a, b], k) => `<button class="btn pri" data-a="dvJunto" data-a0="${a}" data-b0="${b}">${I.share} ${partes.length > 1 ? `Parte ${k + 1} (${a + 1}–${b})` : `Compartilhar ${b} de uma vez`}</button>`).join('')}</div>
    <p class="muted" style="margin:6px 0 0">${S.cfg.dvNaFoto !== false ? 'Cada foto já leva a descrição do carro escrita nela.' : 'Vai com todas as imagens e os textos juntos.'} Os textos também ficam copiados — é só colar. ${partes.length > 1 ? `O WhatsApp aceita até ${DV_MAX} por vez.` : ''}</p>
    <button class="btn block mt" data-a="dvZip">${I.download || I.image} Baixar tudo (.zip com fotos e textos)</button>
    <div class="sec-t" style="margin-top:14px">Ou um por um <span class="r">${it.filter((x) => x.feito).length}/${it.length}</span></div>
    <div class="lines">${it.map((x, i) => `<div class="line dv-step ${x.feito ? 'feito' : ''} ${i === prox ? 'prox' : ''}">
      ${x.file ? `<img src="${x.url ||= URL.createObjectURL(x.file)}" alt="">` : `<span class="dv-noimg">${x.v.tipo === 'moto' ? I.moto : I.car}</span>`}
      <div class="grow"><b>${esc(nomeV(x.v))}</b><small>${x.feito ? '✓ compartilhado' : esc(x.texto.split('\n')[0].slice(0, 50))}</small></div>
      <button class="btn sm ${i === prox ? 'pri' : ''}" data-a="dvUm" data-i="${i}">${x.feito ? 'De novo' : `${I.share} Enviar`}</button></div>`).join('')}</div>`;
}
async function dvMarcar(itens) { for (const x of itens) { x.feito = true; x.v.ultimaDivulgacao = hoje(); await salvarV(x.v); } }
A.dvJunto = async (el) => {
  const it = S.dvItens.slice(+el.dataset.a0, +el.dataset.b0);
  const ok = await compartilhar({ files: it.map((x) => x.file).filter(Boolean), text: it.map((x) => x.texto).join(DV_SEP), title: S.cfg.nomeLoja || 'Estoque' });
  if (ok) { await dvMarcar(it); toast('Textos copiados — cole na legenda ✓', 3500); }
  const box = $('#dvPrep'); if (box) dvTelaPronto(box);
};
A.dvUm = async (el) => {
  const x = S.dvItens[+el.dataset.i];
  const ok = await compartilhar({ files: x.file ? [x.file] : [], text: x.texto, title: nomeV(x.v) });
  if (ok) { await dvMarcar([x]); toast('Texto copiado ✓ — toque no próximo', 2500); }
  const box = $('#dvPrep'); if (box) dvTelaPronto(box);
};

// baixa um .zip com as imagens e um textos.txt (bom para WhatsApp Web no computador)
A.dvZip = async () => {
  if (!window.JSZip) return toast('Aguarde carregar e tente de novo');
  const zip = new JSZip();
  S.dvItens.forEach((x, i) => {
    const n = String(i + 1).padStart(2, '0') + '-' + slug(nomeV(x.v));
    if (x.file) zip.file(n + '.' + ((x.file.name.split('.').pop() || 'jpg').toLowerCase()), x.file);
    zip.file(n + '.txt', x.texto);
  });
  zip.file('textos.txt', S.dvItens.map((x) => x.texto).join(DV_SEP));
  toast('Montando o .zip…', 20000);
  baixar(await zip.generateAsync({ type: 'blob' }), `estoque-${hoje()}.zip`);
  toast('Baixado ✓');
};

/* imagem com a foto em cima e a descrição escrita embaixo */
async function fotoComTexto(v, m, texto, selo = true) {
  const W = 1080, pad = 64;
  let img = null;
  if (m) try { img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = m.src; }); } catch {}
  // arte/card já tem preço e informações: mostra inteira (sem cortar) e sem o selo de preço
  const ehArte = !selo || /arte|card|anuncio|feed|story/i.test(m?.nome || '');
  const fh = img ? Math.max(560, Math.min(ehArte ? 1920 : 1350, Math.round(img.height * W / img.width))) : 0;
  const limpo = String(texto || '').replace(/[*_~]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const med = document.createElement('canvas').getContext('2d');
  const F1 = '800 50px system-ui, sans-serif', F = '500 38px system-ui, sans-serif', LH = 54, MAXL = 30;
  let linhas = [];
  limpo.split('\n').forEach((par, k) => {
    med.font = k === 0 ? F1 : F;
    if (!par.trim()) { linhas.push({ t: '', f: F, h: LH * 0.5 }); return; }
    quebra(med, par, W - pad * 2).forEach((t) => linhas.push({ t, f: k === 0 ? F1 : F, h: k === 0 ? 66 : LH }));
  });
  if (linhas.length > MAXL) { linhas = linhas.slice(0, MAXL); linhas[MAXL - 1].t += ' …'; }
  const th = linhas.reduce((a, l) => a + l.h, 0);
  const rod = 120, H = fh + pad + th + pad + rod;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0d11'; x.fillRect(0, 0, W, H);
  if (img) {
    const sc = Math.max(W / img.width, fh / img.height), w = img.width * sc, h = img.height * sc;
    x.drawImage(img, (W - w) / 2, (fh - h) / 2, w, h);
    const g = x.createLinearGradient(0, fh - 160, 0, fh); g.addColorStop(0, 'rgba(11,13,17,0)'); g.addColorStop(1, 'rgba(11,13,17,1)');
    x.fillStyle = g; x.fillRect(0, fh - 160, W, 161);
    // preço em destaque sobre a foto
    if (!ehArte && num(v.precoAnuncio)) {
      x.font = '900 60px system-ui, sans-serif'; const p = brl(v.precoAnuncio), tw = x.measureText(p).width;
      x.fillStyle = '#f59e0b'; rr(x, pad - 10, fh - 120, tw + 52, 92, 22); x.fill();
      x.fillStyle = '#1a1204'; x.fillText(p, pad + 16, fh - 52);
    }
  }
  let y = fh + pad;
  linhas.forEach((l, i) => { x.font = l.f; x.fillStyle = i === 0 ? '#ffffff' : '#e3e6ec'; y += l.h; if (l.t) x.fillText(l.t, pad, y - (l.h - 40) / 2); });
  // rodapé com a loja
  const fy = H - rod;
  x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, fy, W, rod);
  let lx = pad;
  if (S.cfg.logo) try {
    const lg = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/' + S.cfg.logo; });
    x.save(); x.beginPath(); x.arc(pad + 38, fy + 60, 38, 0, Math.PI * 2); x.clip(); x.drawImage(lg, pad, fy + 22, 76, 76); x.restore(); lx = pad + 96;
  } catch {}
  x.fillStyle = '#fff'; x.font = '800 36px system-ui, sans-serif'; x.fillText(S.cfg.nomeLoja || '', lx, fy + 56);
  x.fillStyle = '#b8bfcc'; x.font = '600 30px system-ui, sans-serif'; x.fillText([S.cfg.whatsapp ? '📲 ' + fone(S.cfg.whatsapp) : '', S.cfg.cidade || ''].filter(Boolean).join('  ·  '), lx, fy + 96);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
}
