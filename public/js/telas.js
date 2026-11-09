'use strict';
/* =============================================================
   Telas: Início, Lista de veículos, Cadastro/edição
   ============================================================= */

/* ---------------- INÍCIO ---------------- */
rota(/^\/$/, () => {
  const r = resumo();
  const nome = S.cfg.vendedor || 'Pedro';
  topo(`Olá, ${esc(nome)}`, { logo: true, sub: esc(S.cfg.nomeLoja || 'Garagem'), direita: `<a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${I.gear}</a>` });

  const alertas = [];
  const dA = num(S.cfg.diasAlerta) || 30, dP = num(S.cfg.diasSemPostar) || 5;
  for (const v of r.estoque) {
    const parado = diasDesde(v.compra?.data || v.criado);
    const ult = ultimaDiv(v); const semPost = ult ? diasDesde(ult) : diasDesde(v.criado);
    const nm = `<b>${esc(nomeV(v))}</b>`;
    if (!midiasDe(v).length) alertas.push({ v, ic: I.cam, t: `${nm} está sem fotos/vídeos` });
    else if (semPost >= dP) alertas.push({ v, ic: I.megaphone, t: ult ? `${nm} sem divulgar há ${semPost} dias` : `${nm} ainda não foi divulgado` });
    if (parado >= dA) alertas.push({ v, ic: I.clock, t: `${nm} parado há ${parado} dias — rever preço?` });
  }

  const divulgar = [...r.estoque].filter((v) => v.status === 'disponivel')
    .sort((a, b) => (ultimaDiv(a) || '0').localeCompare(ultimaDiv(b) || '0')).slice(0, 4);

  tela(`
    <div class="hero">
      <div class="lbl">Patrimônio total (caixa + estoque)</div>
      <div class="big">${brl(r.patrimonio)}</div>
      <div class="row">
        <div><span>Dinheiro em caixa</span><b class="${r.caixa < 0 ? 'neg' : ''}">${brl(r.caixa)}</b></div>
        <div><span>Investido em ${r.estoque.length} veículo(s)</span><b>${brl(r.investido)}</b></div>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><span>Lucro previsto no estoque</span><b class="${r.potencial >= 0 ? 'pos' : 'neg'}">${brl(r.potencial)}</b></div>
      <div class="kpi"><span>Lucro em ${MES[new Date().getMonth()]}</span><b class="${r.lucroMes >= 0 ? 'pos' : 'neg'}">${brl(r.lucroMes)}</b></div>
      <div class="kpi"><span>Vendas no mês</span><b>${r.vendMes.length}</b></div>
      <div class="kpi"><span>Lucro total (vendidos)</span><b class="${r.lucroTotal >= 0 ? 'pos' : 'neg'}">${brl(r.lucroTotal)}</b></div>
    </div>

    ${alertas.length ? `<div class="sec-t">Atenção</div>${alertas.slice(0, 6).map((a) => `<a class="alert" href="#/v/${a.v.id}">${a.ic}<div>${a.t}</div></a>`).join('')}` : ''}

    ${divulgar.length ? `<div class="sec-t">Divulgar hoje <a href="#/veiculos">ver todos</a></div>
      <div class="vlist">${divulgar.map((v) => itemV(v, true)).join('')}</div>` : ''}

    ${!S.veiculos.length ? `<div class="empty">${I.car}<b>Nenhum veículo cadastrado</b>Toque no <b style="display:inline">+</b> lá embaixo para cadastrar o primeiro carro ou moto.</div>` : ''}

    <div class="sec-t">Atalhos</div>
    <div class="tool-grid">
      <a class="tool" href="#/divulgar?todos">${I.wa}<b>Exportar todos p/ WhatsApp</b><span>1 foto + a descrição de cada carro, tudo de uma vez</span></a>
      <a class="tool" href="#/divulgar">${I.share}<b>Divulgar estoque</b><span>Escolher a foto e o texto de cada um</span></a>
      <a class="tool" href="#/lote">${I.ia}<b>Cadastrar em lote</b><span>A IA lê as artes e cadastra vários</span></a>
      <a class="tool" href="#/novo">${I.plus}<b>Novo com IA</b><span>Foto da arte preenche o cadastro</span></a>
      <a class="tool" data-a="escolherPlaca">${I.plate}<b>Consultar placa</b><span>Escolha o site ou app na hora</span></a>
      <a class="tool" href="#/ferramentas?fipe">${I.tag}<b>Tabela FIPE</b><span>Valor por marca/modelo/ano</span></a>
      <a class="tool" href="#/ferramentas?calc">${I.calc}<b>Calculadora</b><span>Estou ganhando ou perdendo?</span></a>
      <a class="tool" data-a="metaAds">${I.megaphone}<b>Impulsionar (Meta)</b><span>Gerenciador de anúncios</span></a>
    </div>
  `);
}, 'inicio');

function itemV(v, botaoDivulgar) {
  const ms = midiasDe(v);
  const l = lucroV(v);
  const ult = ultimaDiv(v);
  const info = [anoV(v), fmtKm(v.km), v.cambio].filter(Boolean).join(' · ');
  return `<a class="vitem" href="#/v/${v.id}">
    <div class="thumb">${capaHTML(v, ms.length > 1 ? `<span class="n">${ms.length}</span>` : '')}</div>
    <div class="vinfo">
      <div class="t">${esc(nomeV(v))}</div>
      <div class="m">${esc(info) || '&nbsp;'}${botaoDivulgar ? ` · ${ult ? 'divulgado ' + (diasDesde(ult) === 0 ? 'hoje' : 'há ' + diasDesde(ult) + 'd') : 'nunca divulgado'}` : ''}</div>
      <div class="p">
        <span class="price">${num(v.status === 'vendido' && v.venda ? v.venda.valor : v.precoAnuncio) ? brl(v.status === 'vendido' && v.venda ? v.venda.valor : v.precoAnuncio) : '<span class="muted">sem preço</span>'}</span>
        <span class="tag ${v.status}">${STATUS[v.status]}</span>
        ${v.origem === 'troca' ? '<span class="tag">Rolo</span>' : ''}
        ${num(v.compra?.valor) && (num(v.precoAnuncio) || v.status === 'vendido') ? `<span class="tag ${l >= 0 ? 'lucro' : 'preju'}">${brlS(l)}</span>` : ''}
      </div>
    </div>
  </a>`;
}

A.metaAds = () => abrir('https://adsmanager.facebook.com/');

/* ---------------- LISTA ---------------- */
rota(/^\/veiculos$/, () => {
  topo('Veículos', { sub: `${S.veiculos.filter((v) => v.status !== 'vendido').length} no estoque`, direita: `<a class="icon-btn" href="#/divulgar" aria-label="Divulgar estoque" title="Divulgar o estoque todo">${I.share}</a><a class="icon-btn" href="#/lote" aria-label="Cadastro em lote" title="Cadastro em lote">${I.layers}</a><a class="icon-btn" href="#/novo" aria-label="Novo">${I.plus}</a>` });
  const f = S.filtro;
  tela(`
    <div class="search"><input class="i" id="q" type="search" placeholder="Buscar modelo, placa, cor…" value="${esc(f.q)}" autocomplete="off"></div>
    <div class="chips">
      ${[['avenda', 'Estoque'], ['disponivel', 'À venda'], ['reservado', 'Reservados'], ['vendido', 'Vendidos'], ['todos', 'Todos']].map(([k, t]) => `<button class="chip ${f.st === k ? 'on' : ''}" data-a="fSt" data-k="${k}">${t}</button>`).join('')}
      <span style="width:8px;flex:none"></span>
      ${[['todos', 'Carros e motos'], ['carro', 'Carros'], ['moto', 'Motos']].map(([k, t]) => `<button class="chip ${f.tipo === k ? 'on' : ''}" data-a="fTipo" data-k="${k}">${t}</button>`).join('')}
    </div>
    <div class="vlist" id="vl"></div>
  `);
  const q = $('#q');
  q.addEventListener('input', () => { f.q = q.value; listaV(); });
  listaV();
}, 'veiculos');

function listaV() {
  const f = S.filtro, q = slug(f.q);
  const vs = S.veiculos.filter((v) => {
    if (f.st === 'avenda' && v.status === 'vendido') return false;
    if (!['avenda', 'todos'].includes(f.st) && v.status !== f.st) return false;
    if (f.tipo !== 'todos' && v.tipo !== f.tipo) return false;
    if (q && !slug([v.marca, v.modelo, v.anoMod, v.cor, v.placa, v.combustivel].join(' ')).includes(q)) return false;
    return true;
  }).sort((a, b) => (a.status === 'vendido') - (b.status === 'vendido') || (b.venda?.data || b.criado || '').localeCompare(a.venda?.data || a.criado || ''));
  $('#vl').innerHTML = vs.length ? vs.map((v) => itemV(v)).join('')
    : `<div class="empty">${I.search}<b>Nada encontrado</b>${S.veiculos.length ? 'Mude o filtro ou a busca.' : 'Cadastre o primeiro veículo no botão +'}</div>`;
}
A.fSt = (el) => { S.filtro.st = el.dataset.k; render(true); };
A.fTipo = (el) => { S.filtro.tipo = el.dataset.k; render(true); };

/* ---------------- CADASTRO / EDIÇÃO ---------------- */
rota(/^\/novo$/, () => formV(null), 'veiculos');
rota(/^\/editar\/(.+)$/, (id) => formV(getV(id)), 'veiculos');

function formV(v0) {
  const novo = !v0;
  if (novo) S.iaArte = null;
  const v = normV(v0 ? JSON.parse(JSON.stringify(v0)) : { compra: { data: hoje() } });
  topo(novo ? 'Novo veículo' : 'Editar veículo', { voltar: novo ? '#/veiculos' : '#/v/' + v.id });
  const inp = (name, label, val, attrs = '') => `<label class="l">${label}<input class="i" name="${name}" value="${esc(val ?? '')}" ${attrs}></label>`;
  const money = (name, label, val, ph = 'R$') => inp(name, label, val ? fmtN(val) : '', `inputmode="decimal" placeholder="${ph}"`);
  const sel = (name, label, val, opts) => `<label class="l">${label}<select class="i" name="${name}">${opts.map((o) => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  tela(`
  <form id="fv" class="f" autocomplete="off">
    ${novo ? `<div class="ia-box">
      <label class="btn pri block" id="iaArteBtn">${I.ia} Preencher com IA (foto da arte)<input type="file" accept="image/*" class="hide" id="iaArte"></label>
      <div id="iaRes"><p class="muted center" style="margin:6px 0 0">Tire ou escolha a imagem com as informações do veículo — a IA preenche tudo e escreve a legenda. Vários de uma vez? <a href="#/lote" style="color:var(--acc)">Cadastro em lote</a></p></div>
    </div>` : ''}
    <div class="seg" id="segTipo">
      <button type="button" class="${v.tipo === 'carro' ? 'on' : ''}" data-a="segTipo" data-k="carro">🚗 Carro</button>
      <button type="button" class="${v.tipo === 'moto' ? 'on' : ''}" data-a="segTipo" data-k="moto">🏍️ Moto</button>
    </div>
    <input type="hidden" name="tipo" value="${v.tipo}">
    <div class="f2">${inp('marca', 'Marca', v.marca, 'placeholder="Ex: Honda" list="marcas" required')}${inp('modelo', 'Modelo / versão', v.modelo, 'placeholder="Ex: Civic EXL 2.0" required')}</div>
    <div class="f2">${inp('anoFab', 'Ano fabricação', v.anoFab, 'inputmode="numeric" placeholder="2018"')}${inp('anoMod', 'Ano modelo', v.anoMod, 'inputmode="numeric" placeholder="2019"')}</div>
    <div class="f2">${money('precoAnuncio', 'Preço de venda (anúncio)', v.precoAnuncio)}${money('compra.valor', 'Quanto paguei', v.compra.valor)}</div>
    <div class="f2">${inp('km', 'KM', v.km ? fmtN(v.km) : '', 'inputmode="numeric" placeholder="65.000"')}<label class="l">Placa<input class="i" name="placa" value="${esc(v.placa)}" style="text-transform:uppercase;letter-spacing:2px;font-weight:700" placeholder="ABC1D23" maxlength="8" autocapitalize="characters"></label></div>

    <details class="more" ${novo ? '' : 'open'}>
      <summary>+ Mais detalhes (cor, câmbio, opcionais, mínimo…)</summary>
      <div class="f mt">
        <div class="f2">${inp('cor', 'Cor', v.cor, 'placeholder="Prata"')}${sel('combustivel', 'Combustível', v.combustivel, ['', 'Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido', 'GNV'])}</div>
        <div class="f2">${sel('cambio', 'Câmbio', v.cambio, ['', 'Manual', 'Automático', 'CVT', 'Automatizado'])}${money('precoMinimo', 'Menor preço que aceito', v.precoMinimo)}</div>
        <label class="l">Opcionais<input class="i" name="opcionais" value="${esc(v.opcionais)}" placeholder="Ar, direção, vidro, multimídia…"></label>
        <label class="l">Descrição / observações do anúncio<textarea class="i" name="descricao" placeholder="Único dono, revisado, pneus novos…">${esc(v.descricao)}</textarea></label>
        <label class="l">Minha legenda (post/Reels) — opcional<textarea class="i" name="legenda" placeholder="Se preencher, vira a opção “Minha” na aba Divulgar">${esc(v.legenda)}</textarea></label>
        <label class="l">Legenda de story — opcional<textarea class="i" name="legendaStory" style="min-height:60px">${esc(v.legendaStory)}</textarea></label>
        <div class="f2">${inp('compra.data', 'Data da compra', v.compra.data, 'type="date"')}${sel('origem', 'Como entrou', v.origem === 'troca' ? 'Rolo / troca' : 'Compra', ['Compra', 'Rolo / troca'])}</div>
        <label class="sw">Saiu dinheiro do caixa na compra<input type="checkbox" name="compra.pagoCaixa" ${v.compra.pagoCaixa !== false ? 'checked' : ''}></label>
        <label class="sw">Aceita troca<input type="checkbox" name="aceitaTroca" ${v.aceitaTroca ? 'checked' : ''}></label>
        <label class="sw">Financia<input type="checkbox" name="financia" ${v.financia ? 'checked' : ''}></label>
        <label class="l">Link do álbum (Google Fotos/Drive) — opcional<input class="i" name="linkAlbum" value="${esc(v.linkAlbum)}" placeholder="https://photos.app.goo.gl/…" inputmode="url"></label>
        <label class="l">Fotos/vídeos que estão no código (pasta midias/), 1 por linha<textarea class="i" name="midiasCodigo" placeholder="midias/civic/01.jpg" style="min-height:60px">${esc((v.midiasCodigo || []).join('\n'))}</textarea></label>
      </div>
    </details>
    <datalist id="marcas">${['Chevrolet', 'Fiat', 'Volkswagen', 'Ford', 'Toyota', 'Honda', 'Hyundai', 'Renault', 'Nissan', 'Jeep', 'Peugeot', 'Citroën', 'Mitsubishi', 'Kia', 'Yamaha', 'Suzuki', 'Kawasaki', 'BMW', 'Mercedes-Benz', 'Audi', 'Caoa Chery', 'Dafra', 'Shineray', 'Haojue'].map((m) => `<option value="${m}">`).join('')}</datalist>
    <button class="btn pri block" type="submit">${I.check} ${novo ? 'Cadastrar e adicionar fotos' : 'Salvar alterações'}</button>
    ${novo ? '' : `<button class="btn danger block" type="button" data-a="delV" data-id="${v.id}">${I.trash} Excluir veículo</button>`}
  </form>`);

  $('#fv').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const g = (k) => (fd.get(k) ?? '').toString().trim();
    Object.assign(v, {
      tipo: g('tipo'), marca: g('marca'), modelo: g('modelo'), anoFab: g('anoFab'), anoMod: g('anoMod') || g('anoFab'),
      precoAnuncio: num(g('precoAnuncio')), km: num(g('km')) || '', placa: placaFmt(g('placa')),
      cor: g('cor'), combustivel: g('combustivel'), cambio: g('cambio'), precoMinimo: num(g('precoMinimo')),
      opcionais: g('opcionais'), descricao: g('descricao'), legenda: g('legenda'), legendaStory: g('legendaStory'), origem: g('origem').startsWith('Rolo') ? 'troca' : 'compra',
      aceitaTroca: fd.has('aceitaTroca'), financia: fd.has('financia'), linkAlbum: g('linkAlbum'),
      midiasCodigo: g('midiasCodigo').split('\n').map((s) => s.trim()).filter(Boolean),
    });
    v.compra = { ...v.compra, valor: num(g('compra.valor')), data: g('compra.data') || v.compra.data, pagoCaixa: fd.has('compra.pagoCaixa') };
    const dup = acharDuplicado(v, S.veiculos, v.id);
    if (novo && dup && !confirm(`Atenção: ${dup.motivo}.\nCadastrar mesmo assim?`)) return;
    if (novo) { const base = slug([v.marca, v.modelo, v.anoMod].join(' ')); if (base && !getV(base)) v.id = base; }
    await salvarV(v);
    if (novo && S.iaArte) { await addMidias(v.id, [S.iaArte]); S.iaArte = null; }
    toast(novo ? 'Veículo cadastrado ✓' : 'Salvo ✓');
    if (novo) S.tabV = 'midias';
    location.hash = '#/v/' + v.id;
  });
}
A.segTipo = (el) => { $$('#segTipo button').forEach((b) => b.classList.toggle('on', b === el)); $('#fv [name=tipo]').value = el.dataset.k; };
A.delV = async (el) => {
  const v = getV(el.dataset.id);
  if (!v || !confirm(`Excluir ${nomeV(v)}? As fotos/vídeos dele também serão apagados do app.`)) return;
  for (const m of [...(S.midias[v.id] || [])]) await delMidia(m.id);
  await DB.del('veiculos', v.id);
  S.veiculos = S.veiculos.filter((x) => x.id !== v.id);
  toast('Veículo excluído');
  location.hash = '#/veiculos';
};
