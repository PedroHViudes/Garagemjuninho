'use strict';
/* =============================================================
   Caixa, Ferramentas (placa, calculadora, FIPE, financiamento) e Ajustes
   ============================================================= */

/* ---------------- CAIXA ---------------- */
rota(/^\/caixa$/, () => {
  const r = resumo();
  const movs = movimentos();
  const meses = [...new Set(movs.map((m) => (m.data || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  const atual = hoje().slice(0, 7);
  if (!meses.includes(atual)) meses.unshift(atual);
  const f = S.caixaMes;
  const lista = f === 'tudo' ? movs : movs.filter((m) => (m.data || '').startsWith(f));
  const ent = lista.filter((m) => m.valor > 0).reduce((a, m) => a + m.valor, 0);
  const sai = lista.filter((m) => m.valor < 0).reduce((a, m) => a + m.valor, 0);
  const nomeMes = (k) => MES[+k.slice(5, 7) - 1].slice(0, 3) + '/' + k.slice(2, 4);
  topo('Caixa', { sub: 'Quanto dinheiro eu tenho' });
  tela(`
    <div class="hero">
      <div class="lbl">Dinheiro em caixa agora</div>
      <div class="big" style="${r.caixa < 0 ? 'color:#f87171' : ''}">${brl(r.caixa)}</div>
      <div class="row">
        <div><span>Investido em estoque</span><b>${brl(r.investido)}</b></div>
        <div><span>Patrimônio</span><b>${brl(r.patrimonio)}</b></div>
      </div>
    </div>
    <div class="bgrid mb">
      <button class="btn" data-a="lanc" data-t="entrada" style="color:var(--ok)">${I.in} Entrada</button>
      <button class="btn" data-a="lanc" data-t="saida" style="color:var(--bad)">${I.out} Saída</button>
    </div>
    <div class="chips">
      <button class="chip ${f === 'tudo' ? 'on' : ''}" data-a="cxMes" data-k="tudo">Tudo</button>
      ${meses.slice(0, 12).map((m) => `<button class="chip ${f === m ? 'on' : ''}" data-a="cxMes" data-k="${m}">${nomeMes(m)}</button>`).join('')}
    </div>
    <div class="kpis">
      <div class="kpi"><span>Entradas</span><b class="pos">${brl(ent)}</b></div>
      <div class="kpi"><span>Saídas</span><b class="neg">${brl(Math.abs(sai))}</b></div>
    </div>
    <div class="card">
      <h3>Movimentações <span class="r">${lista.length}</span></h3>
      ${lista.length ? `<div class="lines">${lista.map((m) => `
        <div class="line" ${m.vid ? `data-a="irV" data-id="${m.vid}" style="cursor:pointer"` : ''}>
          <span class="ic ${m.valor >= 0 ? 'in' : 'out'}">${m.valor >= 0 ? I.in : I.out}</span>
          <div class="grow">${esc(m.desc)}<small>${fmtData(m.data)}${m.avulso ? ' · avulso' : ''}</small></div>
          <span class="v ${m.valor >= 0 ? 'pos' : 'neg'}">${brlS(m.valor)}</span>
          ${m.avulso ? `<button class="x" data-a="delLanc" data-id="${m.id}">${I.x}</button>` : ''}
        </div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nada neste período.</p>'}
      <p class="muted" style="margin:10px 0 0">Saldo inicial: ${brl(S.cfg.saldoInicial)} · <a href="#/ajustes" style="color:var(--acc)">alterar</a>. Compras, despesas e vendas dos veículos entram aqui sozinhas.</p>
    </div>
  `);
}, 'caixa');
A.cxMes = (el) => { S.caixaMes = el.dataset.k; render(true); };
A.irV = (el) => { location.hash = '#/v/' + el.dataset.id; };
A.delLanc = async (el, e) => { e.stopPropagation(); if (!confirm('Excluir lançamento?')) return; await DB.del('lancamentos', el.dataset.id); S.lanc = S.lanc.filter((l) => l.id !== el.dataset.id); render(true); };
A.lanc = (el) => {
  const t = el.dataset.t;
  const s = sheet(`<h2>${t === 'entrada' ? 'Nova entrada' : 'Nova saída'}<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <form class="f" id="fl">
      <div class="chips" style="flex-wrap:wrap">${(t === 'entrada' ? ['Aporte', 'Comissão recebida', 'Sinal/reserva', 'Outros'] : ['Retirada', 'Aluguel/pátio', 'Anúncios', 'Combustível', 'Outros']).map((r) => `<button type="button" class="chip" data-a="lancRap" data-t="${r}">${r}</button>`).join('')}</div>
      <label class="l">Descrição<input class="i" name="desc" required></label>
      <div class="f2"><label class="l">Valor<input class="i" name="valor" inputmode="decimal" required placeholder="R$"></label>
      <label class="l">Data<input class="i" type="date" name="data" value="${hoje()}"></label></div>
      <button class="btn pri block">${I.check} Lançar</button></form>`);
  $('#fl', s).addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const l = { id: uid(), tipo: t, desc: fd.get('desc'), valor: num(fd.get('valor')), data: fd.get('data') || hoje() };
    await DB.put('lancamentos', l); S.lanc.push(l); fecharSheet(); toast('Lançado ✓'); render(true);
  });
};
A.lancRap = (el) => { $('#fl [name=desc]').value = el.dataset.t; $('#fl [name=valor]').focus(); };

/* ---------------- FERRAMENTAS ---------------- */
rota(/^\/ferramentas(?:\?(\w+))?$/, (sec) => {
  topo('Ferramentas', { sub: 'Placa · FIPE · calculadoras' });
  tela(`
    <div class="card" id="sec-placa">
      <h3>${I.plate} Consultar placa</h3>
      ${blocoConsulta()}
    </div>

    <div class="card" id="sec-calc">
      <h3>${I.calc} Estou ganhando ou perdendo?</h3>
      <div class="f">
        <div class="f2"><label class="l">Paguei<input class="i" id="cCompra" inputmode="decimal" placeholder="R$"></label><label class="l">Gastei (despesas)<input class="i" id="cDesp" inputmode="decimal" placeholder="R$"></label></div>
        <label class="l">Vou vender / vendi por<input class="i" id="cVenda" inputmode="decimal" placeholder="R$"></label>
      </div>
      <div id="cRes" class="result zero"><span>Resultado</span><b>—</b><span>&nbsp;</span></div>
      <hr class="s">
      <div class="f2"><label class="l">Quero lucrar (%)<input class="i" id="cMeta" inputmode="decimal" value="${num(S.cfg.metaMargem) || 10}"></label><div class="l">Preciso vender por<b id="cSug" style="font-size:20px;color:var(--txt);padding-top:10px">—</b></div></div>
      <div class="f2 mt"><label class="l">Consigo vender por<input class="i" id="cMerc" inputmode="decimal" placeholder="R$ (preço de mercado)"></label><div class="l">Posso pagar no máximo<b id="cMax" style="font-size:20px;color:var(--txt);padding-top:10px">—</b></div></div>
      <p class="muted" style="margin:6px 0 0">“Posso pagar no máximo” já desconta as despesas e a % de lucro — ótimo pra avaliar rolo.</p>
    </div>

    <div class="card" id="sec-fipe">
      <h3>${I.tag} Tabela FIPE</h3>
      <div id="fipeBox"></div>
    </div>

    <div class="card" id="sec-fin">
      <h3>${I.money} Simular financiamento</h3>
      <div class="f">
        <div class="f2"><label class="l">Valor do veículo<input class="i" id="fValor" inputmode="decimal" placeholder="R$"></label><label class="l">Entrada<input class="i" id="fEnt" inputmode="decimal" placeholder="R$"></label></div>
        <div class="f2"><label class="l">Juros ao mês (%)<input class="i" id="fTaxa" inputmode="decimal" value="1,99"></label><label class="l">Parcelas<select class="i" id="fN">${[12, 18, 24, 36, 48, 60].map((n) => `<option ${n === 48 ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      </div>
      <div id="fRes" class="result zero"><span>Parcela</span><b>—</b><span>&nbsp;</span></div>
      <button class="btn block mt" data-a="copiarFin">${I.copy} Copiar texto da simulação</button>
    </div>

    <div class="card" id="sec-links">
      <h3>${I.link} Links rápidos</h3>
      <div class="bgrid">
        ${[['Gerenciador de Anúncios', 'https://adsmanager.facebook.com/'], ['Meta Business Suite', 'https://business.facebook.com/latest/home'], ['Criar anúncio Marketplace', 'https://www.facebook.com/marketplace/create/vehicle'], ['Anunciar na OLX', 'https://www.olx.com.br/'], ['Webmotors', 'https://www.webmotors.com.br/'], ['Tabela FIPE oficial', 'https://veiculos.fipe.org.br/'], ['Instagram', 'https://www.instagram.com/'], ['TikTok', 'https://www.tiktok.com/upload']]
          .map(([t, u]) => `<button class="btn sm" data-a="abrirUrl" data-u="${u}">${I.ext} ${t}</button>`).join('')}
      </div>
    </div>
  `);
  // calculadora
  const calc = () => {
    const c = num($('#cCompra').value), d = num($('#cDesp').value), v = num($('#cVenda').value), m = num($('#cMeta').value) / 100, merc = num($('#cMerc').value);
    const custo = c + d, l = v - custo;
    $('#cRes').className = 'result ' + (!v || !custo ? 'zero' : l >= 0 ? 'lucro' : 'preju');
    $('#cRes').innerHTML = v && custo ? `<span>${l >= 0 ? 'Você está GANHANDO' : 'Você está PERDENDO'}</span><b>${brlS(l)}</b><span>custo ${brl(custo)} · margem ${pct(l / custo)}</span>` : '<span>Resultado</span><b>—</b><span>Preencha quanto pagou e o valor de venda</span>';
    $('#cSug').textContent = custo ? brl(Math.ceil(custo * (1 + m))) : '—';
    $('#cMax').textContent = merc ? brl(Math.max(0, Math.floor(merc / (1 + m) - d))) : '—';
  };
  $$('#sec-calc input').forEach((i) => i.addEventListener('input', calc)); calc();
  // financiamento
  const fin = () => {
    const P = num($('#fValor').value) - num($('#fEnt').value), i = num($('#fTaxa').value) / 100, n = +$('#fN').value;
    const pmt = P > 0 ? (i ? (P * i) / (1 - Math.pow(1 + i, -n)) : P / n) : 0;
    S.finTxt = pmt ? `${num($('#fEnt').value) ? 'Entrada de ' + brl(num($('#fEnt').value)) + ' + ' : ''}${n}x de ${brl(pmt, true)}*\n*Simulação com juros de ${$('#fTaxa').value}% a.m., sujeita a aprovação de crédito.` : '';
    $('#fRes').className = 'result ' + (pmt ? 'lucro' : 'zero');
    $('#fRes').innerHTML = pmt ? `<span>${n} parcelas de</span><b>${brl(pmt, true)}</b><span>total financiado ${brl(P)} · total pago ${brl(pmt * n)}</span>` : '<span>Parcela</span><b>—</b><span>&nbsp;</span>';
  };
  $$('#sec-fin input, #sec-fin select').forEach((i) => i.addEventListener('input', fin)); fin();
  fipeUI($('#fipeBox'));
  if (sec) setTimeout(() => $('#sec-' + sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}, 'ferramentas');
A.placaTool = async (el) => {
  const p = placaFmt($('#placaQ').value);
  if (p.length < 7) { toast('Digite a placa completa'); $('#placaQ').focus(); return; }
  const a = S.cfg.atalhosPlaca[+el.dataset.i];
  await copiar(p, false); toast('Placa ' + p + ' copiada ✓');
  abrir(a.url.replace(/\{PLACA\}/g, p));
};
A.copiarFin = () => (S.finTxt ? copiar(S.finTxt) : toast('Preencha a simulação'));

/* ---------------- FIPE (API gratuita parallelum) ---------------- */
const FIPE = {
  async j(u) { if (S.fipeCache[u]) return S.fipeCache[u]; const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return (S.fipeCache[u] = await r.json()); },
  t2: (t) => (t === 'moto' ? 'motorcycles' : 'cars'),
  t1: (t) => (t === 'moto' ? 'motos' : 'carros'),
  async marcas(t) {
    try { const d = await this.j(`https://fipe.parallelum.com.br/api/v2/${this.t2(t)}/brands`); this.api = 2; return d.map((x) => ({ c: x.code, n: x.name })); }
    catch { const d = await this.j(`https://parallelum.com.br/fipe/api/v1/${this.t1(t)}/marcas`); this.api = 1; return d.map((x) => ({ c: x.codigo, n: x.nome })); }
  },
  async modelos(t, b) {
    if (this.api === 2) return (await this.j(`https://fipe.parallelum.com.br/api/v2/${this.t2(t)}/brands/${b}/models`)).map((x) => ({ c: x.code, n: x.name }));
    return (await this.j(`https://parallelum.com.br/fipe/api/v1/${this.t1(t)}/marcas/${b}/modelos`)).modelos.map((x) => ({ c: x.codigo, n: x.nome }));
  },
  async anos(t, b, m) {
    if (this.api === 2) return (await this.j(`https://fipe.parallelum.com.br/api/v2/${this.t2(t)}/brands/${b}/models/${m}/years`)).map((x) => ({ c: x.code, n: x.name }));
    return (await this.j(`https://parallelum.com.br/fipe/api/v1/${this.t1(t)}/marcas/${b}/modelos/${m}/anos`)).map((x) => ({ c: x.codigo, n: x.nome }));
  },
  async valor(t, b, m, a) {
    if (this.api === 2) { const d = await this.j(`https://fipe.parallelum.com.br/api/v2/${this.t2(t)}/brands/${b}/models/${m}/years/${a}`); return { valor: num(d.price), ref: d.referenceMonth, codigo: d.codeFipe, modelo: d.model, ano: d.modelYear, comb: d.fuel }; }
    const d = await this.j(`https://parallelum.com.br/fipe/api/v1/${this.t1(t)}/marcas/${b}/modelos/${m}/anos/${a}`);
    return { valor: num(d.Valor), ref: d.MesReferencia, codigo: d.CodigoFipe, modelo: d.Modelo, ano: d.AnoModelo, comb: d.Combustivel };
  },
};

function fipeUI(box, v) {
  const st = { t: v?.tipo || 'carro', marcas: [], modelos: [], anos: [] };
  const opt = (arr, ph, sel) => `<option value="">${ph}</option>` + arr.map((o) => `<option value="${esc(o.c)}" ${String(o.c) === String(sel) ? 'selected' : ''}>${esc(o.n)}</option>`).join('');
  box.innerHTML = `
    <div class="seg mb" data-fp="tipo"><button type="button" class="${st.t === 'carro' ? 'on' : ''}" data-k="carro">Carro</button><button type="button" class="${st.t === 'moto' ? 'on' : ''}" data-k="moto">Moto</button></div>
    <div class="f">
      <select class="i" data-fp="marca"><option>Carregando marcas…</option></select>
      <input class="i hide" data-fp="filtro" placeholder="Filtrar modelo (ex: civic exl)">
      <select class="i" data-fp="modelo" disabled><option>Modelo</option></select>
      <select class="i" data-fp="ano" disabled><option>Ano</option></select>
    </div>
    <div data-fp="res"></div>`;
  const q = (k) => box.querySelector(`[data-fp="${k}"]`);
  const erro = (e) => { q('res').innerHTML = `<div class="fipebox"><span class="muted">Não consegui consultar a FIPE agora (${esc(e.message)}).</span><button class="btn sm mt" data-a="abrirUrl" data-u="https://veiculos.fipe.org.br/">Abrir site da FIPE</button></div>`; };
  const carregaMarcas = async () => {
    q('marca').innerHTML = '<option>Carregando marcas…</option>';
    try {
      st.marcas = await FIPE.marcas(st.t);
      const pre = v?.marca ? st.marcas.find((m) => slug(m.n).includes(slug(v.marca)) || slug(v.marca).includes(slug(m.n))) : null;
      q('marca').innerHTML = opt(st.marcas, 'Escolha a marca', pre?.c);
      if (pre) q('marca').dispatchEvent(new Event('change'));
    } catch (e) { q('marca').innerHTML = '<option>Sem conexão com a FIPE</option>'; erro(e); }
  };
  const renderModelos = () => {
    const f = slug(q('filtro').value);
    const arr = f ? st.modelos.filter((m) => f.split('-').every((p) => slug(m.n).includes(p))) : st.modelos;
    q('modelo').innerHTML = opt(arr, `Escolha o modelo (${arr.length})`);
  };
  q('tipo').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    st.t = b.dataset.k; q('tipo').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    q('modelo').disabled = q('ano').disabled = true; q('filtro').classList.add('hide'); q('res').innerHTML = ''; carregaMarcas();
  });
  q('marca').addEventListener('change', async () => {
    const b = q('marca').value; if (!b) return;
    q('modelo').innerHTML = '<option>Carregando…</option>'; q('ano').disabled = true; q('res').innerHTML = '';
    try {
      st.modelos = await FIPE.modelos(st.t, b);
      q('filtro').classList.remove('hide'); q('modelo').disabled = false;
      if (v?.modelo && !q('filtro').value) q('filtro').value = String(v.modelo).split(' ').slice(0, 1).join(' ');
      renderModelos();
    } catch (e) { erro(e); }
  });
  q('filtro').addEventListener('input', renderModelos);
  q('modelo').addEventListener('change', async () => {
    const m = q('modelo').value; if (!m) return;
    q('ano').innerHTML = '<option>Carregando…</option>'; q('res').innerHTML = '';
    try { st.anos = await FIPE.anos(st.t, q('marca').value, m); q('ano').disabled = false; q('ano').innerHTML = opt(st.anos, 'Escolha o ano'); }
    catch (e) { erro(e); }
  });
  q('ano').addEventListener('change', async () => {
    const a = q('ano').value; if (!a) return;
    q('res').innerHTML = '<div class="fipebox muted">Consultando…</div>';
    try {
      const r = await FIPE.valor(st.t, q('marca').value, q('modelo').value, a);
      st.r = r;
      q('res').innerHTML = `<div class="fipebox"><span class="muted">${esc(r.modelo)} · ${esc(String(r.ano).replace('32000', '0 km'))} · ${esc(r.comb || '')}</span>
        <b>${brl(r.valor)}</b><span class="muted">Ref. ${esc(r.ref)} · código ${esc(r.codigo)}</span>
        ${v ? `<button class="btn pri block mt" data-fp="salvar">${I.check} Salvar FIPE neste veículo</button>` : `<button class="btn sm mt" data-a="copiarTxt" data-t="FIPE ${esc(r.modelo)} ${esc(r.ano)}: ${brl(r.valor)} (${esc(r.ref)})">${I.copy} Copiar</button>`}</div>`;
      const sv = q('salvar');
      if (sv) sv.onclick = async () => { v.fipe = { valor: r.valor, ref: r.ref, codigo: r.codigo, modelo: r.modelo }; await salvarV(v); fecharSheet(); toast('FIPE salva ✓'); render(true); };
    } catch (e) { erro(e); }
  });
  carregaMarcas();
}
A.fipeV = (el) => {
  const v = getV(el.dataset.id);
  const s = sheet(`<h2>FIPE · ${esc(nomeV(v))}<button class="icon-btn" data-a="fechar">${I.x}</button></h2><div id="fipeS"></div>
    <hr class="s"><label class="l">Ou digite o valor manualmente<input class="i" id="fipeMan" inputmode="decimal" placeholder="R$" value="${v.fipe?.valor ? fmtN(v.fipe.valor) : ''}"></label>
    <button class="btn block mt" id="fipeManOk">Salvar valor digitado</button>`);
  fipeUI($('#fipeS', s), v);
  $('#fipeManOk', s).onclick = async () => { const val = num($('#fipeMan').value); v.fipe = val ? { valor: val, ref: 'manual ' + fmtData(hoje()) } : null; await salvarV(v); fecharSheet(); render(true); };
};

/* ---------------- AJUSTES ---------------- */
rota(/^\/ajustes(?:\?(\w+))?$/, async (sec) => {
  const c = S.cfg;
  topo('Ajustes', { voltar: '#/' });
  const inp = (k, label, attrs = '') => `<label class="l">${label}<input class="i" name="${k}" value="${esc(c[k] ?? '')}" ${attrs}></label>`;
  tela(`
    <form class="card f" id="fcfg">
      <h3>Seus dados</h3>
      ${inp('nomeLoja', 'Nome da loja / página')}
      <div class="f2">${inp('vendedor', 'Seu nome')}${inp('whatsapp', 'WhatsApp (com DDD)', 'inputmode="tel" placeholder="43999998888"')}</div>
      ${inp('cidade', 'Cidade (aparece nos anúncios)')}
      ${inp('slogan', 'Slogan (vai no card e nas mensagens)', 'placeholder="Revenda no particular • Não somos loja"')}
      <label class="l">Hashtags padrão (Instagram)<textarea class="i" name="hashtags" style="min-height:70px">${esc(c.hashtags || '')}</textarea></label>
      <div class="f2"><label class="l">Saldo inicial do caixa<input class="i" name="saldoInicial" inputmode="decimal" value="${fmtN(c.saldoInicial)}"></label>${inp('metaMargem', 'Meta de lucro (%)', 'inputmode="decimal"')}</div>
      <div class="f2">${inp('diasAlerta', 'Alerta: parado há (dias)', 'inputmode="numeric"')}${inp('diasSemPostar', 'Alerta: sem divulgar (dias)', 'inputmode="numeric"')}</div>
      <button class="btn pri block">${I.check} Salvar</button>
    </form>

    <div id="sec-msg">${cardModelos()}</div>

    <div class="card">
      <h3>${I.ia} Inteligência artificial (Gemini)</h3>
      <p class="muted" style="margin:0 0 10px">Lê a arte do veículo, cadastra em lote e escreve textos. A chave fica na Vercel (<b>GEMINI_API_KEY</b>), nunca no código.</p>
      <div class="bgrid"><button class="btn" data-a="iaTeste">${I.check} Testar IA</button><a class="btn" href="#/lote">${I.layers} Cadastro em lote</a></div>
    </div>

    <div class="card">
      <h3>Grupos e páginas <span class="r">${(c.grupos || []).length}</span></h3>
      <div class="lines">${(c.grupos || []).map((g, i) => `<div class="line"><div class="grow"><b>${esc(g.nome)}</b><small style="word-break:break-all">${esc(g.url || 'sem link')}</small></div><button class="x" data-a="delGrupo" data-i="${i}">${I.trash}</button></div>`).join('')}</div>
      <form class="f mt" id="fgrp">
        <input class="i" name="nome" placeholder="Nome do grupo (ex: Carros Jacarezinho)" required>
        <input class="i" name="url" placeholder="Link do grupo (Facebook ou WhatsApp)" inputmode="url">
        <button class="btn block">${I.plus} Adicionar grupo</button>
      </form>
    </div>

    <div class="card">
      <h3>Checklist de divulgação</h3>
      <textarea class="i" id="tCanais" style="min-height:150px">${esc((c.canais || []).join('\n'))}</textarea>
      <p class="muted" style="margin:6px 0 10px">Um canal por linha.</p>
      <h3>Atalhos de consulta de placa</h3>
      <textarea class="i" id="tAtalhos" style="min-height:120px;font-size:13px">${esc((c.atalhosPlaca || []).map((a) => a.nome + ' | ' + a.url).join('\n'))}</textarea>
      <p class="muted" style="margin:6px 0 10px">Formato: <b>Nome | link</b>. Use {PLACA} no link onde a placa deve entrar.</p>
      <h3>Apps de consulta</h3>
      <textarea class="i" id="tApps" style="min-height:120px;font-size:13px">${esc((c.appsPlaca || []).map((a) => [a.nome, a.ios || '', a.android || ''].join(' | ')).join('\n'))}</textarea>
      <p class="muted" style="margin:6px 0 10px">Formato: <b>Nome | link App Store | link Play Store</b> (pode deixar link vazio: busca pelo nome).</p>
      <button class="btn block" data-a="salvarListas">${I.check} Salvar listas</button>
    </div>

    <div class="card">
      <h3>Aparência</h3>
      <div class="seg">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, t]) => `<button class="${(c.tema || 'auto') === k ? 'on' : ''}" data-a="tema" data-k="${k}">${t}</button>`).join('')}</div>
    </div>

    <div class="card">
      <h3>Backup e código <span class="r" id="espaco"></span></h3>
      <p class="muted" style="margin:0 0 10px">Fotos e vídeos ficam salvos neste celular. Faça backup de vez em quando (salve o .zip no Google Drive).</p>
      <div class="f">
        <button class="btn pri block" data-a="backup">${I.download} Backup completo (.zip com fotos e vídeos)</button>
        <label class="btn block">${I.upload} Restaurar backup<input type="file" accept=".zip,application/zip" class="hide" id="restZip"></label>
        <label class="btn block">${I.image} Importar pacote de fotos/vídeos/legendas (.zip)<input type="file" accept=".zip,application/zip" class="hide" id="pacZip"></label>
        <button class="btn block" data-a="gerarDados">${I.copy} Gerar dados.js (gravar no código)</button>
        <button class="btn block" data-a="recarregar">${I.refresh} Recarregar dados do código</button>
      </div>
    </div>
    <a class="btn block danger" href="/sair">${I.lock} Sair (pedir senha de novo)</a>
    <p class="muted center mt">Garagem · v2 (IA) · dados versão ${(await DB.get('kv', 'versao')) || 1}</p>
  `);
  navigator.storage?.estimate?.().then((e) => { const el = $('#espaco'); if (el) el.textContent = (e.usage / 1048576).toFixed(0) + ' MB usados'; });

  $('#fcfg').addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    for (const [k, val] of fd.entries()) c[k] = ['saldoInicial', 'metaMargem', 'diasAlerta', 'diasSemPostar'].includes(k) ? num(val) : String(val).trim();
    c.whatsapp = String(c.whatsapp).replace(/\D/g, '');
    await salvarCfg(); toast('Ajustes salvos ✓'); render(true);
  });
  $('#fgrp').addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    (c.grupos ||= []).push({ nome: String(fd.get('nome')).trim(), url: String(fd.get('url')).trim() });
    await salvarCfg(); toast('Grupo adicionado ✓'); render(true);
  });
  $('#restZip').addEventListener('change', (e) => e.target.files[0] && restaurar(e.target.files[0]));
  $('#pacZip').addEventListener('change', (e) => e.target.files[0] && importarPacote(e.target.files[0]));
  if (sec) setTimeout(() => $('#sec-' + sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}, 'inicio');

A.delGrupo = async (el) => { if (!confirm('Remover grupo?')) return; S.cfg.grupos.splice(+el.dataset.i, 1); await salvarCfg(); render(true); };
A.salvarListas = async () => {
  S.cfg.canais = $('#tCanais').value.split('\n').map((s) => s.trim()).filter(Boolean);
  S.cfg.atalhosPlaca = $('#tAtalhos').value.split('\n').map((l) => { const [n, ...u] = l.split('|'); return { nome: (n || '').trim(), url: u.join('|').trim() }; }).filter((a) => a.nome && a.url);
  S.cfg.appsPlaca = $('#tApps').value.split('\n').map((l) => { const [n, ios, and] = l.split('|').map((x) => (x || '').trim()); return { nome: n, ios, android: and }; }).filter((a) => a.nome);
  await salvarCfg(); toast('Listas salvas ✓');
};
A.tema = async (el) => { S.cfg.tema = el.dataset.k; await salvarCfg(); aplicarTema(); render(true); };

A.gerarDados = async () => {
  const versao = ((await DB.get('kv', 'versao')) || 1) + 1;
  const obj = { versao, config: S.cfg, veiculos: S.veiculos, lancamentos: S.lanc };
  const txt = `// =============================================================
//  DADOS DO SISTEMA — gerado pelo app em ${fmtData(hoje())}
//  Substitua o arquivo public/dados.js no GitHub por este.
//  Fotos/vídeos do celular NÃO vão aqui (use o backup .zip).
// =============================================================
window.DADOS = ${JSON.stringify(obj, null, 2)};
`;
  await DB.put('kv', versao, 'versao');
  const file = new File([txt], 'dados.js', { type: 'text/javascript' });
  sheet(`<h2>dados.js gerado<button class="icon-btn" data-a="fechar">${I.x}</button></h2>
    <p class="muted" style="margin-top:0">Versão ${versao}. No GitHub, abra <b>public/dados.js</b> → editar (lápis) → apague tudo → cole → <b>Commit</b>. A Vercel publica sozinha em ~1 minuto.</p>
    <div class="f"><button class="btn pri block" id="dCopy">${I.copy} Copiar conteúdo</button><button class="btn block" id="dShare">${I.share} Salvar / enviar arquivo</button></div>`, (s) => {
    $('#dCopy', s).onclick = () => copiar(txt);
    $('#dShare', s).onclick = () => compartilhar({ files: [file] });
  });
};
A.recarregar = async () => {
  if (!confirm('Substituir veículos, caixa e ajustes deste celular pelo que está no código (dados.js)?\nFotos/vídeos do celular continuam salvos.')) return;
  await importarDoCodigo(); await carregar(); aplicarTema(); toast('Dados recarregados do código ✓'); location.hash = '#/';
};

/* backup .zip */
A.backup = async () => {
  if (!window.JSZip) return toast('Aguarde carregar e tente de novo');
  toast('Gerando backup… pode demorar com vídeos', 60000);
  const zip = new JSZip();
  const ms = (await DB.all('midias')) || [];
  zip.file('dados.json', JSON.stringify({ versao: await DB.get('kv', 'versao'), config: S.cfg, veiculos: S.veiculos, lancamentos: S.lanc,
    midias: ms.map(({ blob, ...m }) => m) }, null, 1));
  for (const m of ms) zip.file('midias/' + m.id, m.blob, { binary: true, compression: 'STORE' });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const file = new File([blob], `garagem-backup-${hoje()}.zip`, { type: 'application/zip' });
  toast('Backup pronto ✓');
  if (navigator.canShare?.({ files: [file] }) && confirm('Enviar o backup para o Google Drive/WhatsApp? (Cancelar = baixar no aparelho)')) await compartilhar({ files: [file] });
  else baixar(file, file.name);
};
async function restaurar(f) {
  if (!window.JSZip) return toast('Aguarde carregar e tente de novo');
  if (!confirm('Restaurar este backup? Tudo que está no app agora será substituído.')) return;
  try {
    toast('Restaurando…', 60000);
    const zip = await JSZip.loadAsync(f);
    const d = JSON.parse(await zip.file('dados.json').async('string'));
    for (const s of ['veiculos', 'lancamentos', 'midias']) await DB.clear(s);
    for (const v of d.veiculos || []) await DB.put('veiculos', v);
    for (const l of d.lancamentos || []) await DB.put('lancamentos', l);
    for (const m of d.midias || []) {
      const zf = zip.file('midias/' + m.id); if (!zf) continue;
      const blob = new Blob([await zf.async('arraybuffer')], { type: m.mime });
      await DB.put('midias', { ...m, blob });
    }
    await DB.put('kv', d.config || {}, 'config');
    if (d.versao) await DB.put('kv', d.versao, 'versao');
    Object.values(S.urls).forEach((u) => URL.revokeObjectURL(u)); S.urls = {};
    await carregar(); aplicarTema(); toast('Backup restaurado ✓'); location.hash = '#/';
  } catch (e) { alert('Não consegui restaurar: ' + e.message); }
}

/* ---------------- start ---------------- */
iniciar();
