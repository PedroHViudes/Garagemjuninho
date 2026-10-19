'use strict';
/* =============================================================
   Extras: consulta de placa (sites + apps), stories, importar pacote
   ============================================================= */
I.phone = svg('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>');
I.story = svg('<circle cx="12" cy="12" r="10" stroke-dasharray="4 3"/><path d="M10 8l6 4-6 4z"/>');
const ehIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ehStory = (nome) => /stor(y|ies|ys)|status|reels?/i.test(nome || '');

/* ---------- consulta de placa: escolha na hora ---------- */
function blocoConsulta(placa = '') {
  const sites = S.cfg.atalhosPlaca || [], apps = S.cfg.appsPlaca || [];
  return `<input class="i plate" data-placa maxlength="8" placeholder="ABC1D23" autocapitalize="characters" autocomplete="off" value="${esc(placa)}">
    <div class="sec-t" style="margin-top:12px">Sites</div>
    <div class="bgrid">${sites.map((a, i) => `<button class="btn sm" data-a="consulta" data-k="s${i}">${I.ext} ${esc(a.nome)}</button>`).join('')}</div>
    <div class="sec-t">Apps no celular</div>
    <div class="bgrid">${apps.map((a, i) => `<button class="btn sm" data-a="consulta" data-k="a${i}">${I.phone} ${esc(a.nome)}</button>`).join('')}</div>
    <p class="muted" style="margin:8px 0 0">A placa é copiada antes de abrir. Nos apps abre a loja: se já estiver instalado aparece <b>Abrir</b> — aí é só colar a placa.</p>`;
}
A.consulta = async (el) => {
  const box = el.closest('.sheet, .card') || document;
  const p = placaFmt(box.querySelector('[data-placa]')?.value || '');
  const k = el.dataset.k, i = +k.slice(1);
  let url;
  if (k[0] === 's') {
    const a = S.cfg.atalhosPlaca[i];
    if (a.url.includes('{PLACA}') && p.length < 7) { toast('Digite a placa completa'); box.querySelector('[data-placa]')?.focus(); return; }
    url = a.url.replace(/\{PLACA\}/g, p);
  } else {
    const a = S.cfg.appsPlaca[i];
    url = ehIOS() ? (a.ios || 'https://apps.apple.com/br/search?term=' + encodeURIComponent(a.nome))
      : (a.android || 'https://play.google.com/store/search?q=' + encodeURIComponent(a.nome) + '&c=apps');
  }
  if (p) { await copiar(p, false); toast('Placa ' + p + ' copiada ✓'); }
  abrir(url);
};
A.escolherPlaca = (el) => {
  sheet(`<h2>${I.plate} Consultar placa<button class="icon-btn" data-a="fechar">${I.x}</button></h2>${blocoConsulta(el.dataset.p || '')}`);
};

/* ---------- stories ---------- */
A.storiesM = async (el) => {
  const v = getV(el.dataset.id);
  const ms = midiasDe(v).filter((m) => m.story);
  toast('Preparando stories…', 20000);
  const ok = await compartilhar({ files: await arquivosDe(ms), text: v.legenda || textoAnuncio(v, 'whatsapp'), title: nomeV(v) });
  if (ok) { await marcarPost(v, 'Stories', false); toast('Legenda copiada ✓', 3000); }
};
A.togStory = async (el) => {
  const m = Object.values(S.midias).flat().find((x) => x.id === el.dataset.id);
  if (!m) return;
  m.story = !m.story; await DB.put('midias', m);
  toast(m.story ? 'Marcado como story ✓' : 'Desmarcado'); $('#viewer')?.remove(); render(true);
};

/* ---------- importar pacote .zip (fotos, vídeos e legendas de outra conversa) ---------- */
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4', webm: 'video/webm', '3gp': 'video/3gpp' };

function acharVeiculo(pasta, info) {
  const sp = slug(pasta);
  const pl = placaFmt(info?.placa);
  return S.veiculos.find((v) => v.id === sp || v.id === info?.id)
    || (pl && S.veiculos.find((v) => v.placa === pl))
    || S.veiculos.find((v) => { const n = slug([v.marca, v.modelo, v.anoMod].join(' ')); return n === sp || (n && sp.includes(slug([v.marca, v.modelo].join(' ')))); })
    || null;
}
function veiculoDaPasta(pasta, info) {
  if (info && (info.marca || info.modelo)) return normV({ ...info, id: info.id || slug(pasta) });
  const ano = (pasta.match(/(19|20)\d{2}/) || [])[0] || '';
  const pal = pasta.replace(ano, '').replace(/[-_]+/g, ' ').trim().split(/\s+/);
  const moto = /moto|cg|fan|titan|biz|fazer|factor|bros|xre|cb\s?\d|ninja|pop|nmax|pcx/i.test(pasta);
  return normV({ id: slug(pasta), tipo: moto ? 'moto' : 'carro', marca: cap(pal[0] || ''), modelo: pal.slice(1).map(cap).join(' '), anoMod: ano, anoFab: ano });
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function importarPacote(f) {
  if (!window.JSZip) return toast('Aguarde carregar e tente de novo');
  try {
    toast('Lendo pacote…', 60000);
    const zip = await JSZip.loadAsync(f);
    const grupos = {};
    zip.forEach((path, e) => { if (!e.dir && !/(^|\/)(__MACOSX|\.)/.test(path)) grupos[path] = e; });
    // Se tudo estiver dentro de uma pasta-raiz única (ex: "pacote/civic/1.jpg"), ignora essa raiz
    const caminhos = Object.keys(grupos);
    const primeiro = new Set(caminhos.map((p) => p.split('/')[0]));
    const ehMidia = (p) => MIME[(p.split('.').pop() || '').toLowerCase()];
    const raiz = [...primeiro][0] || '';
    const subs = new Set(caminhos.filter((p) => p.split('/').length > 2).map((p) => p.split('/')[1]).filter((s) => !ehStory(s)));
    const todosNaRaiz = primeiro.size === 1 && caminhos.every((p) => p.split('/').length > 2 || !ehMidia(p))
      && (subs.size >= 2 || /pacote|m[ií]dia|export|garagem|ve[ií]culos|carros|motos/i.test(raiz));
    const porV = {};
    for (const [path, e] of Object.entries(grupos)) {
      const partes = path.split('/').slice(todosNaRaiz ? 1 : 0);
      if (partes.length < 2) continue; // arquivo solto na raiz
      (porV[partes[0]] ||= []).push({ e, rel: partes.slice(1).join('/'), nome: partes[partes.length - 1] });
    }
    const pastas = Object.keys(porV);
    if (!pastas.length) { alert('Não achei pastas de veículos no .zip.\nO formato é: uma pasta por veículo, com as fotos, vídeos e legenda.txt dentro.'); return; }
    let novos = 0, atual = 0, nm = 0;
    for (const pasta of pastas) {
      const arqs = porV[pasta];
      const infoA = arqs.find((a) => /^info\.json$/i.test(a.nome));
      let info = null;
      if (infoA) try { info = JSON.parse(await infoA.e.async('string')); } catch {}
      let v = acharVeiculo(pasta, info);
      if (!v) { v = veiculoDaPasta(pasta, info); novos++; }
      else { atual++; if (info) for (const k of ['km', 'cor', 'combustivel', 'cambio', 'opcionais', 'descricao', 'placa', 'precoAnuncio']) if (info[k] && !v[k]) v[k] = info[k]; }
      const leg = arqs.filter((a) => /\.(txt|md)$/i.test(a.nome));
      if (leg.length) {
        const textos = await Promise.all(leg.map(async (a) => ({ story: ehStory(a.rel), t: (await a.e.async('string')).trim() })));
        const post = textos.filter((x) => !x.story).map((x) => x.t).join('\n\n');
        const sto = textos.filter((x) => x.story).map((x) => x.t).join('\n\n');
        if (post) v.legenda = post;
        if (sto) v.legendaStory = sto;
        if (!v.legenda && sto) v.legenda = sto;
      }
      await salvarV(v);
      const midias = arqs.filter((a) => MIME[(a.nome.split('.').pop() || '').toLowerCase()]);
      const files = [];
      for (const a of midias) {
        const ext = a.nome.split('.').pop().toLowerCase();
        const blob = await a.e.async('blob');
        const file = new File([blob], a.nome, { type: MIME[ext] });
        file._story = ehStory(a.rel);
        files.push(file);
      }
      const antes = (S.midias[v.id] || []).length;
      await addMidias(v.id, files);
      (S.midias[v.id] || []).slice(antes).forEach((m, i) => { if (files[i]?._story) { m.story = true; DB.put('midias', m); } });
      nm += files.length;
    }
    toast(`Pacote importado ✓ ${novos} novo(s), ${atual} atualizado(s), ${nm} mídia(s)`, 5000);
    location.hash = '#/veiculos';
  } catch (e) { alert('Não consegui importar: ' + e.message); }
}
