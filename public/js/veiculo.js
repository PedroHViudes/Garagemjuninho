'use strict';
/* =============================================================
   Tela do veículo: mídias, divulgação, financeiro, informações
   ============================================================= */

rota(/^\/v\/(.+)$/, (id) => {
  const v = getV(id);
  if (!v) { location.hash = '#/veiculos'; return; }
  if (S.selVid !== id) { S.sel = new Set(); S.selVid = id; }
  topo(esc(nomeV(v)), { voltar: '#/veiculos', sub: esc([anoV(v), fmtKm(v.km)].filter(Boolean).join(' · ')), direita: `<a class="icon-btn" href="#/editar/${v.id}" aria-label="Editar">${I.edit}</a>` });
  const ms = midiasDe(v);
  const capa = ms.find((m) => m.tipo === 'foto') || ms[0];
  const preco = v.status === 'vendido' && v.venda ? v.venda.valor : v.precoAnuncio;
  tela(`
    <div class="cover">${capa ? (capa.tipo === 'video' ? `<video src="${esc(capa.src)}" muted playsinline controls preload="metadata"></video>` : `<img src="${esc(capa.src)}" alt="">`)
      : `<label class="ph" style="cursor:pointer">${I.cam}<b>Adicionar fotos e vídeos</b><input type="file" accept="image/*,video/*" multiple class="hide" data-up="${v.id}"></label>`}
      <span class="tag ${v.status} st">${STATUS[v.status]}</span></div>
    <h2 class="d-title">${esc(nomeV(v))}</h2>
    <div class="d-meta">${esc([anoV(v), fmtKm(v.km), v.cor, v.combustivel, v.cambio].filter(Boolean).join(' · '))}
      ${v.placa ? ` <button class="plate-badge" data-a="escolherPlaca" data-p="${esc(v.placa)}" style="cursor:pointer">${esc(v.placa)} 🔍</button>` : ''} ${v.origem === 'troca' ? '<span class="tag">Rolo</span>' : ''}</div>
    <div class="d-price"><b>${num(preco) ? brl(preco) : 'Sem preço'}</b>${num(v.precoMinimo) && v.status !== 'vendido' ? `<span>mínimo ${brl(v.precoMinimo)}</span>` : ''}</div>
    <div class="seg mb">
      ${['disponivel', 'reservado', 'vendido'].map((s) => `<button class="${v.status === s ? 'on' : ''}" data-a="status" data-k="${s}" data-id="${v.id}">${STATUS[s]}</button>`).join('')}
    </div>
    <div class="tabs">
      ${[['midias', `Mídias (${ms.length})`], ['divulgar', 'Divulgar'], ['fin', 'Financeiro'], ['info', 'Info']].map(([k, t]) => `<button class="${S.tabV === k ? 'on' : ''}" data-a="tabV" data-k="${k}">${t}</button>`).join('')}
    </div>
    <div id="tabc"></div>
  `);
  ({ midias: tabMidias, divulgar: tabDivulgar, fin: tabFin, info: tabInfo })[S.tabV](v, ms);
}, 'veiculos');

A.tabV = (el) => { S.tabV = el.dataset.k; render(true); };

/* upload de mídias (qualquer input com data-up) */
document.addEventListener('change', async (e) => {
  const inp = e.target.closest('input[data-up]');
  if (!inp || !inp.files.length) return;
  await addMidias(inp.dataset.up, [...inp.files]);
  inp.value = '';
  render(true);
});

/* ---------------- MÍDIAS ---------------- */
function tabMidias(v, ms) {
  const n = S.sel.size;
  $('#tabc').innerHTML = `
    <div class="grid-media">
      <label class="add-tile">${I.plus}Adicionar<input type="file" accept="image/*,video/*" multiple class="hide" data-up="${v.id}"></label>
      ${ms.map((m, i) => `<button class="mtile ${S.sel.has(m.id) ? 'sel' : ''}" data-a="verM" data-i="${i}">
        ${m.tipo === 'video' ? `<video src="${esc(m.src)}#t=0.5" muted playsinline preload="metadata"></video><span class="vid">${I.play}VÍDEO</span>` : `<img src="${esc(m.src)}" alt="" loading="lazy">`}
        ${i === 0 ? '<span class="capa">CAPA</span>' : ''}${m.story ? '<span class="capa" style="background:#8b5cf6;color:#fff;top:auto;left:auto;right:5px;bottom:5px">STORY</span>' : ''}
        <span class="chk" data-a="selM" data-id="${esc(m.id)}">${I.check}</span>
      </button>`).join('')}
    </div>
    ${ms.length ? `
    <div class="brow mt" style="align-items:center">
      <button class="btn sm" data-a="selTodas">${n === ms.length ? 'Limpar seleção' : 'Selecionar todas'}</button>
      <span class="muted" style="flex:1">${n ? n + ' selecionada(s)' : 'Toque no círculo para escolher'}</span>
    </div>
    ${ms.some((m) => m.story) ? `<button class="btn ig block mt" data-a="storiesM" data-id="${v.id}">${I.story} Enviar stories (${ms.filter((m) => m.story).length}) + legenda</button>` : ''}
    <button class="btn wa block mt" data-a="shareM" data-id="${v.id}">${I.share} Compartilhar ${n ? n : 'todas as ' + ms.length} + texto do anúncio</button>
    <p class="muted center" style="margin:6px 0 0">Abre a lista de apps: WhatsApp, Instagram, Facebook… O texto já fica copiado — é só colar na legenda.</p>
    ` : `<p class="muted center mt">Adicione as fotos e vídeos deste ${v.tipo}. Ficam salvos no app, prontos para compartilhar.</p>`}
    <div class="sec-t">Card pronto para postar</div>
    <div class="bgrid">
      <button class="btn" data-a="cardAd" data-id="${v.id}" data-f="feed">${I.card} Feed / Marketplace</button>
      <button class="btn" data-a="cardAd" data-id="${v.id}" data-f="story">${I.card} Status / Story</button>
    </div>
    ${v.linkAlbum ? `<div class="sec-t">Álbum online</div><div class="bgrid"><button class="btn" data-a="copiarTxt" data-t="${esc(v.linkAlbum)}">${I.copy} Copiar link</button><button class="btn" data-a="abrirUrl" data-u="${esc(v.linkAlbum)}">${I.ext} Abrir álbum</button></div>` : ''}
  `;
}
A.selM = (el) => { const id = el.dataset.id; S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); render(true); };
A.selTodas = () => { const v = getV(S.selVid); const ms = midiasDe(v); if (S.sel.size === ms.length) S.sel.clear(); else ms.forEach((m) => S.sel.add(m.id)); render(true); };
A.shareM = async (el) => {
  const v = getV(el.dataset.id);
  let ms = midiasDe(v);
  if (S.sel.size) ms = ms.filter((m) => S.sel.has(m.id));
  toast('Preparando arquivos…', 20000);
  const files = await arquivosDe(ms);
  const ok = await compartilhar({ files, text: textoAnuncio(v, S.modelo), title: nomeV(v) });
  if (ok) toast('Texto copiado — cole na legenda ✓', 3500);
};
A.copiarTxt = (el) => copiar(el.dataset.t);
A.abrirUrl = (el) => abrir(el.dataset.u);

/* visualizador */
A.verM = (el) => verMidia(getV(S.selVid), +el.dataset.i);
function verMidia(v, i) {
  const ms = midiasDe(v); const m = ms[i]; if (!m) return;
  $('#viewer')?.remove();
  const d = document.createElement('div'); d.className = 'viewer'; d.id = 'viewer';
  d.innerHTML = `<div class="vtop"><span>${i + 1} / ${ms.length}${m.codigo ? ' · do código' : ''}</span><button class="icon-btn" data-a="fecharV">${I.x}</button></div>
    <div class="vbody">${m.tipo === 'video' ? `<video src="${esc(m.src)}" controls autoplay playsinline></video>` : `<img src="${esc(m.src)}" alt="">`}</div>
    <div class="vbar">
      ${i > 0 ? `<button class="btn sm" data-a="navM" data-i="${i - 1}">‹ Anterior</button>` : ''}
      <button class="btn sm wa" data-a="share1" data-i="${i}">${I.share} Enviar</button>
      ${i > 0 ? `<button class="btn sm" data-a="capaM" data-id="${esc(m.id)}">Usar como capa</button>` : ''}
      ${m.local ? `<button class="btn sm" data-a="togStory" data-id="${esc(m.id)}">${m.story ? 'Tirar de story' : 'É story'}</button>` : ''}
      ${m.local ? `<button class="btn sm danger" data-a="delM" data-id="${esc(m.id)}">${I.trash}</button>` : ''}
      ${i < ms.length - 1 ? `<button class="btn sm" data-a="navM" data-i="${i + 1}">Próxima ›</button>` : ''}
    </div>`;
  document.body.appendChild(d);
}
A.fecharV = () => $('#viewer')?.remove();
A.navM = (el) => verMidia(getV(S.selVid), +el.dataset.i);
A.share1 = async (el) => { const v = getV(S.selVid); const m = midiasDe(v)[+el.dataset.i]; await compartilhar({ files: await arquivosDe([m]), text: textoAnuncio(v, S.modelo) }); };
A.capaM = async (el) => { const v = getV(S.selVid); v.capaId = el.dataset.id; await salvarV(v); $('#viewer')?.remove(); toast('Capa definida ✓'); render(true); };
A.delM = async (el) => { if (!confirm('Apagar esta mídia do app?')) return; await delMidia(el.dataset.id); S.sel.delete(el.dataset.id); $('#viewer')?.remove(); render(true); };

/* ---------------- TEXTOS DE ANÚNCIO ---------------- */
function textoAnuncio(v, modelo = 'whatsapp') {
  if (modelo === 'propria' && v.legenda) return v.legenda;
  if (modelo === 'story' && (v.legendaStory || v.legenda)) return v.legendaStory || v.legenda;
  if (modelo === 'propria' || modelo === 'story') modelo = 'whatsapp';
  const c = S.cfg, moto = v.tipo === 'moto';
  const tit = nomeV(v), ano = anoV(v);
  const preco = num(v.precoAnuncio) ? brl(v.precoAnuncio) : 'Consulte';
  const zap = c.whatsapp ? fone(c.whatsapp) : '';
  const extras = [v.aceitaTroca && 'Aceito troca', v.financia && 'Financio'].filter(Boolean);
  const L = (a) => a.filter((x) => x !== false && x !== null && x !== undefined).join('\n');
  if (modelo === 'whatsapp') return L([
    `${moto ? '🏍️' : '🚗'} *${tit.toUpperCase()}*`,
    ano && `📅 Ano: ${ano}`,
    v.km && `🛣️ ${fmtKm(v.km)}`,
    (v.combustivel || v.cambio) && `⛽ ${[v.combustivel, v.cambio].filter(Boolean).join(' | ⚙️ ')}`,
    v.cor && `🎨 Cor: ${v.cor}`,
    v.opcionais && `✅ ${v.opcionais}`,
    v.descricao && `\n${v.descricao}`,
    '',
    `💰 *${preco}*`,
    extras.length && `🤝 ${extras.join(' • ')}`,
    c.cidade && `📍 ${c.cidade}`,
    zap && `📲 Chama no WhatsApp: ${zap}`,
  ]);
  if (modelo === 'instagram') {
    const tags = [c.hashtags || '', '#' + slug(v.marca).replace(/-/g, ''), '#' + slug(String(v.modelo).split(' ')[0]).replace(/-/g, ''), moto ? '#motos' : '#carros'].join(' ');
    return L([
      `${moto ? '🏍️' : '🚗'} ${tit.toUpperCase()} ${ano}`,
      '',
      v.km && `▪️ ${fmtKm(v.km)}`,
      v.combustivel && `▪️ ${v.combustivel}`,
      v.cambio && `▪️ Câmbio ${v.cambio.toLowerCase()}`,
      v.cor && `▪️ Cor ${v.cor.toLowerCase()}`,
      v.opcionais && `▪️ ${v.opcionais}`,
      v.descricao && `\n${v.descricao}`,
      '',
      `💰 ${preco}`,
      extras.length && `🤝 ${extras.join(' • ')}`,
      c.cidade && `📍 ${c.cidade}`,
      zap ? `📲 Chama no direct ou WhatsApp ${zap}` : '📲 Chama no direct!',
      '',
      [...new Set(tags.split(/\s+/).filter((t) => t.length > 1))].join(' '),
    ]);
  }
  if (modelo === 'facebook') return L([
    `${tit.toUpperCase()} ${ano} – ${preco}`,
    '',
    ano && `• Ano: ${ano}`,
    v.km && `• Km: ${fmtN(v.km)}`,
    v.combustivel && `• Combustível: ${v.combustivel}`,
    v.cambio && `• Câmbio: ${v.cambio}`,
    v.cor && `• Cor: ${v.cor}`,
    v.opcionais && `• Opcionais: ${v.opcionais}`,
    v.descricao && `\n${v.descricao}`,
    '',
    extras.length && extras.join(' / '),
    c.cidade && `Local: ${c.cidade}`,
    zap ? `Chama no privado ou no WhatsApp ${zap}` : 'Chama no privado!',
  ]);
  // OLX / Webmotors
  return L([
    `TÍTULO: ${[v.marca, v.modelo, v.anoMod, v.cambio].filter(Boolean).join(' ')}`,
    '',
    `${tit} ${ano}${v.km ? ', ' + fmtKm(v.km) : ''}${v.cor ? ', cor ' + v.cor.toLowerCase() : ''}.`,
    v.opcionais && `Opcionais: ${v.opcionais}.`,
    v.descricao && v.descricao,
    extras.length && `${extras.join(' e ')}.`,
    `Valor: ${preco}.`,
    zap && `Contato/WhatsApp: ${zap}`,
  ]);
}

/* ---------------- DIVULGAR ---------------- */
function tabDivulgar(v) {
  const canais = S.cfg.canais || [];
  const grupos = S.cfg.grupos || [];
  const feitos = canais.filter((c) => v.postagens?.[c]).length;
  const ult = ultimaDiv(v);
  $('#tabc').innerHTML = `
    <div class="card">
      <h3>${I.megaphone} Texto do anúncio</h3>
      <div class="seg mb">
        ${[...(v.legenda ? [['propria', 'Minha']] : []), ...(v.legendaStory ? [['story', 'Story']] : []), ['whatsapp', 'Zap'], ['instagram', 'Insta'], ['facebook', 'Face'], ['olx', 'OLX']].map(([k, t]) => `<button class="${S.modelo === k ? 'on' : ''}" data-a="modelo" data-k="${k}">${t}</button>`).join('')}
      </div>
      <textarea class="i adtext" id="adtext" rows="9">${esc(textoAnuncio(v, S.modelo))}</textarea>
      <div class="bgrid mt">
        <button class="btn" data-a="copiarAd">${I.copy} Copiar texto</button>
        <button class="btn pri" data-a="shareAd" data-id="${v.id}">${I.share} Fotos + texto</button>
      </div>
    </div>

    <div class="card">
      <h3>Postar em</h3>
      <div class="bgrid">
        <button class="btn wa" data-a="waTxt">${I.wa} WhatsApp</button>
        <button class="btn ig" data-a="abrirC" data-u="https://www.instagram.com/" data-c="Instagram Feed">${I.ig} Instagram</button>
        <button class="btn fb" data-a="abrirC" data-u="https://www.facebook.com/marketplace/create/vehicle" data-c="Marketplace">${I.fb} Marketplace</button>
        <button class="btn fb" data-a="abrirC" data-u="https://adsmanager.facebook.com/" data-c="Impulsionado Meta">${I.megaphone} Impulsionar</button>
        <button class="btn" data-a="abrirC" data-u="https://www.olx.com.br/" data-c="OLX">OLX</button>
        <button class="btn dark" data-a="abrirC" data-u="https://www.tiktok.com/upload" data-c="TikTok">TikTok</button>
      </div>
      <p class="muted" style="margin:8px 0 0">O texto é copiado antes de abrir. Para Reels/TikTok use “Fotos + texto” na aba Mídias.</p>
    </div>

    <div class="card">
      <h3>Seus grupos e páginas <span class="r">${grupos.length}</span></h3>
      ${grupos.length ? `<div class="lines">${grupos.map((g, i) => {
        const d = v.postagens?.['Grupo: ' + g.nome];
        return `<div class="line"><div class="grow"><b>${esc(g.nome)}</b><small>${d ? 'postado ' + fmtData(d) : 'ainda não postado'}</small></div>
          <button class="btn sm ${d ? '' : 'pri'}" data-a="postGrupo" data-i="${i}" data-id="${v.id}">${d ? 'Postar de novo' : 'Postar'}</button></div>`;
      }).join('')}</div>` : '<p class="muted" style="margin:0">Cadastre seus grupos de Facebook/WhatsApp em Ajustes — aí é só tocar em “Postar”: copia o texto e abre o grupo.</p>'}
      <a class="btn sm mt" href="#/ajustes">Gerenciar grupos</a>
    </div>

    <div class="card">
      <h3>Checklist de divulgação <span class="r">${feitos}/${canais.length}</span></h3>
      <div class="prog"><i style="width:${canais.length ? (feitos / canais.length) * 100 : 0}%"></i></div>
      <div class="muted mb">${ult ? `Última divulgação: ${fmtData(ult)} (${diasDesde(ult) === 0 ? 'hoje' : 'há ' + diasDesde(ult) + ' dias'})` : 'Ainda não divulgado'}</div>
      ${canais.map((c) => { const d = v.postagens?.[c]; return `<div class="post ${d ? 'on' : ''}" data-a="togPost" data-c="${esc(c)}" data-id="${v.id}"><span class="bx">${I.check}</span><span class="nm">${esc(c)}</span><small>${d ? fmtData(d) : ''}</small></div>`; }).join('')}
      <button class="btn sm mt" data-a="novaRodada" data-id="${v.id}">${I.refresh} Nova rodada (zerar checklist)</button>
    </div>
  `;
}
const adAtual = () => $('#adtext')?.value || '';
A.modelo = (el) => { S.modelo = el.dataset.k; render(true); };
A.copiarAd = () => copiar(adAtual());
A.shareAd = async (el) => {
  const v = getV(el.dataset.id);
  let ms = midiasDe(v); if (S.sel.size) ms = ms.filter((m) => S.sel.has(m.id));
  toast('Preparando arquivos…', 20000);
  const ok = await compartilhar({ files: await arquivosDe(ms), text: adAtual(), title: nomeV(v) });
  if (ok) toast('Texto copiado — cole na legenda ✓', 3500);
};
A.waTxt = async () => { const v = getV(S.selVid); await marcarPost(v, 'Status WhatsApp', false); abrir('https://wa.me/?text=' + encodeURIComponent(adAtual())); };
A.abrirC = async (el) => { await copiar(adAtual(), false); toast('Texto copiado ✓'); const v = getV(S.selVid); await marcarPost(v, el.dataset.c, false); abrir(el.dataset.u); render(true); };
A.postGrupo = async (el) => {
  const g = S.cfg.grupos[+el.dataset.i]; const v = getV(el.dataset.id);
  await copiar(adAtual(), false); toast('Texto copiado — cole no grupo ✓', 3000);
  v.postagens['Grupo: ' + g.nome] = hoje();
  const cn = /whatsapp|chat\.whatsapp/i.test(g.url) ? 'Grupos WhatsApp' : 'Grupos Facebook';
  if ((S.cfg.canais || []).includes(cn)) v.postagens[cn] = hoje();
  await salvarV(v);
  if (g.url) abrir(g.url);
  render(true);
};
async function marcarPost(v, canal, alternar = true) {
  v.postagens ||= {};
  if (alternar && v.postagens[canal]) delete v.postagens[canal];
  else v.postagens[canal] = hoje();
  await salvarV(v);
}
A.togPost = async (el) => { await marcarPost(getV(el.dataset.id), el.dataset.c); render(true); };
A.novaRodada = async (el) => {
  const v = getV(el.dataset.id);
  if (!confirm('Zerar o checklist para divulgar de novo?')) return;
  v.ultimaDivulgacao = ultimaDiv(v); v.postagens = {}; await salvarV(v); render(true);
};

/* ---------------- FINANCEIRO DO VEÍCULO ---------------- */
function tabFin(v) {
  const custo = custoV(v), meta = num(S.cfg.metaMargem) || 0;
  const vendido = v.status === 'vendido' && v.venda;
  const pv = vendido ? num(v.venda.valor) : num(v.precoAnuncio);
  const lucro = pv - custo;
  const lMin = num(v.precoMinimo) - custo;
  const sugerido = Math.ceil((custo * (1 + meta / 100)) / 100) * 100;
  const fipe = num(v.fipe?.valor);
  const dias = diasDesde(v.compra?.data || v.criado);
  const cls = !pv || !custo ? 'zero' : lucro >= 0 ? 'lucro' : 'preju';
  $('#tabc').innerHTML = `
    <div class="card">
      <h3>${I.money} Quanto gastei <span class="r">${dias !== null ? dias + ' dias em estoque' : ''}</span></h3>
      <div class="lines">
        <div class="line"><div class="grow">${v.origem === 'troca' ? 'Entrou no rolo por' : 'Compra'}<small>${fmtData(v.compra?.data)}${v.compra?.pagoCaixa === false ? ' · não saiu do caixa' : ''}</small></div><span class="v">${brl(v.compra?.valor)}</span><button class="x" data-a="editCompra" data-id="${v.id}">${I.edit}</button></div>
        ${(v.despesas || []).map((d, i) => `<div class="line"><div class="grow">${esc(d.desc)}<small>${fmtData(d.data)}</small></div><span class="v">${brl(d.valor)}</span><button class="x" data-a="delDesp" data-i="${i}" data-id="${v.id}">${I.x}</button></div>`).join('')}
        <div class="line"><div class="grow"><b>Custo total</b></div><span class="v" style="font-size:17px">${brl(custo)}</span></div>
      </div>
      <button class="btn block mt" data-a="addDesp" data-id="${v.id}">${I.plus} Adicionar despesa (mecânico, doc, lavagem…)</button>
    </div>

    <div class="card">
      <h3>${I.tag} Preço</h3>
      <div class="lines">
        ${vendido ? `<div class="line"><div class="grow">Vendido por<small>${fmtData(v.venda.data)}${v.venda.comprador ? ' · ' + esc(v.venda.comprador) : ''}${num(v.venda.trocaValor) ? ' · ' + brl(v.venda.trocaValor) + ' em troca' : ''}</small></div><span class="v">${brl(v.venda.valor)}</span></div>` : ''}
        <div class="line"><div class="grow">Preço do anúncio</div><span class="v">${brl(v.precoAnuncio)}</span></div>
        ${num(v.precoMinimo) ? `<div class="line"><div class="grow">Mínimo que aceito<small>lucro de ${brlS(lMin)}</small></div><span class="v">${brl(v.precoMinimo)}</span></div>` : ''}
        ${custo ? `<div class="line"><div class="grow">Sugerido p/ ${meta}% de lucro</div><span class="v">${brl(sugerido)}</span></div>` : ''}
        <div class="line"><div class="grow">FIPE${v.fipe?.ref ? `<small>${esc(v.fipe.ref)}</small>` : ''}${fipe && num(v.precoAnuncio) ? `<small>anúncio está ${pct(num(v.precoAnuncio) / fipe - 1)} ${num(v.precoAnuncio) >= fipe ? 'acima' : 'abaixo'} da FIPE</small>` : ''}</div>
          <span class="v">${fipe ? brl(fipe) : '—'}</span><button class="btn sm" data-a="fipeV" data-id="${v.id}">${fipe ? 'Atualizar' : 'Consultar'}</button></div>
      </div>
      <div class="result ${cls}">
        <span>${vendido ? 'Lucro real da venda' : 'Se vender pelo anúncio'}</span>
        <b>${pv && custo ? brlS(lucro) : '—'}</b>
        <span>${pv && custo ? `margem de ${pct(lucro / custo)} sobre o custo` : 'Preencha o valor pago e o preço'}</span>
      </div>
    </div>

    ${vendido ? '' : `<div class="card">
      <h3>${I.calc} E se eu vender por…</h3>
      <input class="i" id="simV" inputmode="decimal" placeholder="Digite um valor (ex: 92.000)">
      <div id="simR" class="result zero"><span>Lucro</span><b>—</b><span>&nbsp;</span></div>
    </div>`}

    ${vendido ? `<button class="btn block danger" data-a="desfazerVenda" data-id="${v.id}">Desfazer venda</button>`
      : `<button class="btn pri block" data-a="vender" data-id="${v.id}">${I.check} Registrar venda</button>`}
  `;
  const sim = $('#simV');
  if (sim) sim.addEventListener('input', () => {
    const val = num(sim.value), l = val - custo;
    $('#simR').className = 'result ' + (!val ? 'zero' : l >= 0 ? 'lucro' : 'preju');
    $('#simR').innerHTML = `<span>${l >= 0 ? 'Lucro' : 'Prejuízo'}</span><b>${val ? brlS(l) : '—'}</b><span>${val && custo ? 'margem ' + pct(l / custo) + (fipe ? ' · ' + pct(val / fipe) + ' da FIPE' : '') : '&nbsp;'}</span>`;
  });
}

A.addDesp = (el) => {
  const v = getV(el.dataset.id);
  const rap = ['Mecânico', 'Funilaria/pintura', 'Documentação', 'Transferência', 'Lavagem/polimento', 'Pneus', 'Anúncio Meta', 'Comissão', 'Combustível', 'Vistoria'];
  const s = sheet(`<h2>Nova despesa<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <form class="f" id="fd">
      <div class="chips" style="flex-wrap:wrap">${rap.map((r) => `<button type="button" class="chip" data-a="despRap" data-t="${r}">${r}</button>`).join('')}</div>
      <label class="l">Descrição<input class="i" name="desc" required placeholder="Ex: Troca de óleo"></label>
      <div class="f2"><label class="l">Valor<input class="i" name="valor" inputmode="decimal" required placeholder="R$"></label>
      <label class="l">Data<input class="i" type="date" name="data" value="${hoje()}"></label></div>
      <button class="btn pri block">${I.check} Salvar despesa</button>
    </form>`);
  $('#fd', s).addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    v.despesas.push({ desc: fd.get('desc'), valor: num(fd.get('valor')), data: fd.get('data') || hoje() });
    await salvarV(v); fecharSheet(); toast('Despesa lançada ✓'); render(true);
  });
};
A.despRap = (el) => { const i = $('#fd [name=desc]'); i.value = el.dataset.t; $('#fd [name=valor]').focus(); };
A.fechar = () => fecharSheet();
A.delDesp = async (el) => { const v = getV(el.dataset.id); if (!confirm('Remover esta despesa?')) return; v.despesas.splice(+el.dataset.i, 1); await salvarV(v); render(true); };
A.editCompra = (el) => {
  const v = getV(el.dataset.id);
  const s = sheet(`<h2>Valor de compra<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <form class="f" id="fc">
      <div class="f2"><label class="l">Quanto paguei<input class="i" name="valor" inputmode="decimal" value="${fmtN(v.compra.valor)}"></label>
      <label class="l">Data<input class="i" type="date" name="data" value="${v.compra.data || ''}"></label></div>
      <label class="sw">Saiu dinheiro do caixa<input type="checkbox" name="pago" ${v.compra.pagoCaixa !== false ? 'checked' : ''}></label>
      <button class="btn pri block">${I.check} Salvar</button></form>`);
  $('#fc', s).addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    v.compra = { valor: num(fd.get('valor')), data: fd.get('data'), pagoCaixa: fd.has('pago') };
    await salvarV(v); fecharSheet(); render(true);
  });
};

/* status e venda */
A.status = async (el) => {
  const v = getV(el.dataset.id), k = el.dataset.k;
  if (k === v.status) return;
  if (k === 'vendido') return A.vender(el);
  if (v.status === 'vendido' && !confirm('Desfazer a venda deste veículo?')) return;
  v.status = k; if (k !== 'vendido') v.venda = null;
  await salvarV(v); render(true);
};
A.vender = (el) => {
  const v = getV(el.dataset.id);
  const s = sheet(`<h2>Registrar venda<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <form class="f" id="fv2">
      <div class="f2"><label class="l">Valor total da venda<input class="i" name="valor" inputmode="decimal" required value="${fmtN(v.precoAnuncio)}"></label>
      <label class="l">Data<input class="i" type="date" name="data" value="${hoje()}"></label></div>
      <label class="l">Comprador (opcional)<input class="i" name="comprador" placeholder="Nome"></label>
      <label class="sw">${I.swap} Entrou veículo na troca (rolo)<input type="checkbox" name="troca" id="chkTroca"></label>
      <div id="boxTroca" class="f hide">
        <div class="seg" id="segT"><button type="button" class="on" data-a="segT" data-k="carro">Carro</button><button type="button" data-a="segT" data-k="moto">Moto</button></div>
        <input type="hidden" name="tTipo" value="carro">
        <div class="f2"><label class="l">Marca<input class="i" name="tMarca"></label><label class="l">Modelo<input class="i" name="tModelo"></label></div>
        <div class="f2"><label class="l">Ano<input class="i" name="tAno" inputmode="numeric"></label><label class="l">Valor pego na troca<input class="i" name="tValor" inputmode="decimal" placeholder="R$"></label></div>
        <label class="l">Placa<input class="i" name="tPlaca" style="text-transform:uppercase" maxlength="8"></label>
        <p class="muted" style="margin:0">O veículo da troca entra no estoque com esse valor de custo. No caixa entra só a diferença em dinheiro.</p>
      </div>
      <div id="vendaRes" class="result zero"></div>
      <button class="btn pri block">${I.check} Confirmar venda</button>
    </form>`);
  const f = $('#fv2', s);
  const upd = () => {
    const val = num(f.valor.value), l = val - custoV(v), tv = f.troca.checked ? num(f.tValor.value) : 0;
    $('#vendaRes').className = 'result ' + (!val ? 'zero' : l >= 0 ? 'lucro' : 'preju');
    $('#vendaRes').innerHTML = `<span>${l >= 0 ? 'Lucro' : 'Prejuízo'} nesta venda</span><b>${val ? brlS(l) : '—'}</b><span>${tv ? 'entra no caixa: ' + brl(val - tv) : 'entra no caixa: ' + brl(val)}</span>`;
  };
  f.addEventListener('input', upd); upd();
  $('#chkTroca', s).addEventListener('change', (e) => { $('#boxTroca').classList.toggle('hide', !e.target.checked); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const venda = { valor: num(fd.get('valor')), data: fd.get('data') || hoje(), comprador: fd.get('comprador') || '', trocaValor: 0, trocaId: null };
    if (fd.has('troca') && (fd.get('tModelo') || fd.get('tMarca'))) {
      const nv = normV({ tipo: fd.get('tTipo'), marca: fd.get('tMarca'), modelo: fd.get('tModelo'), anoMod: fd.get('tAno'), anoFab: fd.get('tAno'), placa: fd.get('tPlaca'),
        origem: 'troca', compra: { valor: num(fd.get('tValor')), data: venda.data, pagoCaixa: false }, descricao: '' });
      await salvarV(nv);
      venda.trocaValor = num(fd.get('tValor')); venda.trocaId = nv.id;
    }
    v.status = 'vendido'; v.venda = venda;
    await salvarV(v); fecharSheet();
    toast(venda.trocaId ? 'Venda registrada · veículo da troca adicionado ✓' : 'Venda registrada ✓', 3500);
    render(true);
  });
};
A.segT = (el) => { $$('#segT button').forEach((b) => b.classList.toggle('on', b === el)); $('#fv2 [name=tTipo]').value = el.dataset.k; };
A.desfazerVenda = async (el) => {
  const v = getV(el.dataset.id);
  if (!confirm('Desfazer a venda? (se entrou veículo na troca, ele continua no estoque — exclua manualmente se precisar)')) return;
  v.status = 'disponivel'; v.venda = null; await salvarV(v); render(true);
};

/* ---------------- INFO ---------------- */
function tabInfo(v) {
  const linhas = [['Tipo', v.tipo === 'moto' ? 'Moto' : 'Carro'], ['Marca', v.marca], ['Modelo', v.modelo], ['Ano', anoV(v)], ['KM', fmtKm(v.km)], ['Cor', v.cor], ['Combustível', v.combustivel], ['Câmbio', v.cambio], ['Placa', v.placa], ['Opcionais', v.opcionais], ['Descrição', v.descricao], ['Minha legenda', v.legenda], ['Legenda story', v.legendaStory], ['Aceita troca', v.aceitaTroca ? 'Sim' : 'Não'], ['Financia', v.financia ? 'Sim' : 'Não'], ['Cadastrado em', fmtData(v.criado)]].filter((l) => l[1]);
  $('#tabc').innerHTML = `
    <div class="card"><h3>${I.plate} Consultar placa</h3>${blocoConsulta(v.placa)}</div>
    <div class="card"><h3>Ficha</h3><div class="lines">${linhas.map(([k, val]) => `<div class="line"><div class="grow"><small>${k}</small>${esc(val)}</div></div>`).join('')}</div></div>
    <div class="card"><h3>Pesquisar preço de mercado</h3>
      <div class="bgrid">
        <button class="btn sm" data-a="mercado" data-s="olx" data-id="${v.id}">OLX</button>
        <button class="btn sm" data-a="mercado" data-s="wm" data-id="${v.id}">Webmotors</button>
        <button class="btn sm" data-a="mercado" data-s="fb" data-id="${v.id}">Marketplace</button>
        <button class="btn sm" data-a="mercado" data-s="g" data-id="${v.id}">Google</button>
      </div></div>
    <div class="bgrid"><a class="btn" href="#/editar/${v.id}">${I.edit} Editar</a><button class="btn danger" data-a="delV" data-id="${v.id}">${I.trash} Excluir</button></div>
  `;
}
A.placaGo = async (el) => { const a = S.cfg.atalhosPlaca[+el.dataset.i]; const p = placaFmt(el.dataset.p); await copiar(p, false); toast('Placa ' + p + ' copiada ✓'); abrir(a.url.replace(/\{PLACA\}/g, p)); };
A.mercado = (el) => {
  const v = getV(el.dataset.id); const q = [v.marca, v.modelo.split(' ').slice(0, 2).join(' '), v.anoMod].filter(Boolean).join(' ');
  const u = { olx: 'https://www.olx.com.br/autos-e-pecas?q=' + encodeURIComponent(q),
    wm: 'https://www.webmotors.com.br/' + (v.tipo === 'moto' ? 'motos' : 'carros') + '/estoque?q=' + encodeURIComponent(q),
    fb: 'https://www.facebook.com/marketplace/search/?query=' + encodeURIComponent(q),
    g: 'https://www.google.com/search?q=' + encodeURIComponent(q + ' preço usado') }[el.dataset.s];
  abrir(u);
};

/* ---------------- CARD DE ANÚNCIO (imagem) ---------------- */
A.cardAd = async (el) => {
  const v = getV(el.dataset.id), story = el.dataset.f === 'story';
  toast('Criando card…');
  const blob = await gerarCard(v, story);
  const url = URL.createObjectURL(blob);
  const s = sheet(`<h2>Card ${story ? 'Status / Story' : 'Feed'}<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <img src="${url}" style="width:100%;max-width:${story ? 260 : 360}px;margin:0 auto 12px;border-radius:12px;display:block">
    <div class="bgrid"><button class="btn wa" id="cShare">${I.share} Compartilhar</button><button class="btn" id="cSave">${I.image} Salvar nas mídias</button></div>`);
  const file = new File([blob], `${slug(nomeV(v))}-${story ? 'story' : 'feed'}.jpg`, { type: 'image/jpeg' });
  $('#cShare', s).onclick = () => compartilhar({ files: [file], text: textoAnuncio(v, S.modelo) });
  $('#cSave', s).onclick = async () => { await addMidias(v.id, [file]); fecharSheet(); render(true); };
};

async function gerarCard(v, story) {
  const W = 1080, H = story ? 1920 : 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  // fundo
  const g0 = x.createLinearGradient(0, 0, 0, H); g0.addColorStop(0, '#1f2430'); g0.addColorStop(1, '#0b0d11');
  x.fillStyle = g0; x.fillRect(0, 0, W, H);
  // foto
  const foto = midiasDe(v).find((m) => m.tipo === 'foto');
  const areaH = story ? 1250 : 900;
  if (foto) {
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = foto.src; });
      const sc = Math.max(W / img.width, areaH / img.height);
      const w = img.width * sc, h = img.height * sc;
      x.drawImage(img, (W - w) / 2, (areaH - h) / 2, w, h);
    } catch {}
  }
  const g = x.createLinearGradient(0, areaH - 420, 0, areaH);
  g.addColorStop(0, 'rgba(11,13,17,0)'); g.addColorStop(.7, 'rgba(11,13,17,.85)'); g.addColorStop(1, 'rgba(11,13,17,1)');
  x.fillStyle = g; x.fillRect(0, areaH - 420, W, 421);
  x.fillStyle = '#0b0d11'; x.fillRect(0, areaH, W, H - areaH);

  const pad = 70; let y = areaH - 60;
  const pill = (txt, px, py, bg, fg) => { x.font = '800 34px system-ui, sans-serif'; const tw = x.measureText(txt).width; x.fillStyle = bg; rr(x, px, py, tw + 44, 60, 30); x.fill(); x.fillStyle = fg; x.fillText(txt, px + 22, py + 42); return tw + 44; };
  pill(v.status === 'reservado' ? 'RESERVADO' : 'À VENDA', pad, story ? 120 : 60, '#f59e0b', '#1a1204');
  // título
  x.fillStyle = '#fff'; x.font = `800 ${story ? 84 : 78}px system-ui, sans-serif`;
  const linhas = quebra(x, nomeV(v).toUpperCase(), W - pad * 2).slice(0, 2);
  y = areaH - 40 - (linhas.length - 1) * 86;
  linhas.forEach((l, i) => x.fillText(l, pad, y + i * 86));
  y += (linhas.length - 1) * 86 + 80;
  x.fillStyle = '#b8bfcc'; x.font = '500 42px system-ui, sans-serif';
  x.fillText([anoV(v), fmtKm(v.km), v.cambio, v.combustivel].filter(Boolean).join('  ·  '), pad, y);
  y += 135;
  x.fillStyle = '#f59e0b'; x.font = `900 ${story ? 130 : 120}px system-ui, sans-serif`;
  x.fillText(num(v.precoAnuncio) ? brl(v.precoAnuncio) : 'Consulte', pad - 4, y);
  y += 45;
  let px = pad;
  [v.aceitaTroca && 'ACEITO TROCA', v.financia && 'FINANCIO', v.cor && v.cor.toUpperCase()].filter(Boolean).forEach((t) => { px += pill(t, px, y, 'rgba(255,255,255,.12)', '#fff') + 14; });
  // rodapé
  const fy = H - (story ? 170 : 90);
  x.fillStyle = '#fff'; x.font = '700 44px system-ui, sans-serif';
  x.fillText(S.cfg.whatsapp ? '📲 ' + fone(S.cfg.whatsapp) : (S.cfg.nomeLoja || ''), pad, fy);
  x.fillStyle = '#8a919e'; x.font = '500 34px system-ui, sans-serif';
  x.textAlign = 'right'; x.fillText(S.cfg.cidade || '', W - pad, fy); x.textAlign = 'left';
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
}
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function quebra(x, t, max) { const ps = t.split(' '); const out = []; let l = ''; for (const p of ps) { const n = l ? l + ' ' + p : p; if (x.measureText(n).width > max && l) { out.push(l); l = p; } else l = n; } if (l) out.push(l); return out; }
