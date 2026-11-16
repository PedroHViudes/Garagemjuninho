'use strict';
/* =============================================================
   Link para o cliente: página pública /c/<id> com todas as fotos
   e o botão "Chamar no WhatsApp" (número principal do app).
   As fotos do celular vão para o Vercel Blob (api/publicar).
   ============================================================= */
I.link = svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>');

const linkDe = (v) => `${location.origin}/c/${v.id}`;
const noCodigo = (v) => (D.veiculos || []).some((x) => x.id === v.id);
S.linkBlob = null;   // null = ainda não perguntou ao servidor

async function apiPublicar(body) {
  let r;
  try { r = await fetch('/api/publicar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new Error('Sem internet para publicar o link'); }
  let d = null; try { d = await r.json(); } catch {}
  if (!d) throw new Error(r.status === 401 ? 'Sessão expirada: abra o app e digite a senha de novo' : r.status === 404 ? 'A função de publicar não está no site (envie a pasta api/ ao GitHub)' : 'Servidor não respondeu (' + r.status + ')');
  if (!r.ok) throw new Error(d.erro || 'Erro ' + r.status);
  return d;
}
async function blobAtivo() {
  if (S.linkBlob === null) { try { S.linkBlob = !!(await apiPublicar({ acao: 'status' })).blob; } catch { S.linkBlob = false; } }
  return S.linkBlob;
}
// só dados de anúncio: nada de custo, despesas, lucro ou placa
function dadosPublicos(v, fotos, videos) {
  const c = S.cfg;
  return {
    id: v.id, tipo: v.tipo, marca: v.marca, modelo: v.modelo, anoFab: v.anoFab, anoMod: v.anoMod, km: v.km, cor: v.cor,
    combustivel: v.combustivel, cambio: v.cambio, precoAnuncio: num(v.precoAnuncio), opcionais: v.opcionais, descricao: v.descricao,
    aceitaTroca: v.aceitaTroca, financia: v.financia, status: v.status, fotos, videos,
    loja: { nomeLoja: c.nomeLoja || '', slogan: c.slogan || '', whatsapp: c.whatsapp || '', cidade: c.cidade || '', logo: c.logo ? '/' + c.logo : '' },
  };
}

// publica (ou atualiza) o link. onProg(texto, feitos, total)
async function publicarLink(v, onProg = () => {}) {
  if (!(await blobAtivo())) {
    if (noCodigo(v)) { v.link = { url: linkDe(v), em: hoje(), soCodigo: true }; await salvarVsemLink(v); return v.link; }
    throw Object.assign(new Error('Para gerar link de veículos cadastrados no celular, ative o armazenamento de fotos na Vercel (Storage › Create › Blob › Connect) e faça Redeploy.'), { precisaBlob: true });
  }
  const ms = midiasDe(v);
  const fotosM = ms.filter((m) => m.tipo === 'foto');
  const enviadas = { ...(v.link?.fotos || {}) };
  const fotos = [];
  let i = 0;
  for (const m of fotosM) {
    i++;
    if (m.codigo) { fotos.push(m.src); continue; }
    if (!enviadas[m.id]) {
      onProg(`Enviando foto ${i} de ${fotosM.length}…`, i - 1, fotosM.length);
      const { b64, mime } = await imgBase64(new File([m.blob], m.nome || 'foto.jpg', { type: m.mime || m.blob.type }), 1600);
      const nome = String(m.id).replace(/[^\w-]/g, '').slice(0, 60) + '.jpg';
      enviadas[m.id] = (await apiPublicar({ acao: 'foto', id: v.id, nome, mime: mime || 'image/jpeg', b64 })).url;
    }
    fotos.push(enviadas[m.id]);
  }
  for (const k of Object.keys(enviadas)) if (!fotosM.some((m) => m.id === k)) delete enviadas[k];   // foto apagada no app
  const videos = ms.filter((m) => m.tipo === 'video' && m.codigo).map((m) => m.src);
  onProg('Montando a página…', fotosM.length, fotosM.length);
  await apiPublicar({ acao: 'salvar', id: v.id, dados: dadosPublicos(v, fotos, videos) });
  v.link = { url: linkDe(v), em: hoje(), fotos: enviadas };
  await salvarVsemLink(v);
  return v.link;
}

// quando o veículo muda (preço, vendido, fotos…), atualiza a página sozinho
const _salvarVOriginal = salvarV;
async function salvarVsemLink(v) { return _salvarVOriginal(v); }
const linkTimers = {};
salvarV = async function (v) {
  await _salvarVOriginal(v);
  if (v.link && !v.link.soCodigo && S.linkBlob !== false) {
    clearTimeout(linkTimers[v.id]);
    linkTimers[v.id] = setTimeout(() => publicarLink(getV(v.id) || v).catch((e) => console.warn('link:', e.message)), 4000);
  }
};

function cardLink(v) {
  const L = v.link;
  return `<div class="card link-card">
    <h3>${I.link} Link para o cliente</h3>
    <p class="muted" style="margin:0 0 10px">Uma página com <b>todas as fotos</b> e o botão <b>Chamar no WhatsApp</b> ${S.cfg.whatsapp ? `(${esc(fone(S.cfg.whatsapp))})` : ''}. O cliente não precisa de senha.</p>
    <div id="linkBox">${L ? `
      <div class="link-url"><input class="i" readonly value="${esc(L.url)}" onclick="this.select()"></div>
      <div class="bgrid three mt">
        <button class="btn" data-a="linkCopiar" data-id="${v.id}">${I.copy} Copiar</button>
        <button class="btn wa" data-a="linkEnviar" data-id="${v.id}">${I.share} Enviar</button>
        <button class="btn" data-a="linkAbrir" data-id="${v.id}">${I.ext} Abrir</button>
      </div>
      <button class="btn sm block mt" data-a="linkGerar" data-id="${v.id}">${I.refresh} Atualizar fotos e dados do link</button>
      ${L.soCodigo ? '<p class="muted" style="margin:8px 0 0">Este link mostra os dados do código (GitHub). Para mostrar fotos novas e mudanças feitas no celular, ative o armazenamento (Ajustes › Link para o cliente).</p>' : `<p class="muted" style="margin:8px 0 0">Atualizado ${fmtData(L.em)} · muda sozinho quando você edita o veículo.</p>`}`
    : `<button class="btn pri block" data-a="linkGerar" data-id="${v.id}">${I.link} Gerar link do veículo</button>`}</div>
  </div>`;
}

A.linkGerar = async (el) => {
  const v = getV(el.dataset.id), box = $('#linkBox');
  const capa = midiasDe(v).find((m) => m.tipo === 'foto');
  const ld = iaLoader(box, { img: capa?.src || '', etapas: ['Preparando as fotos…'], esperado: 8, cancelar: false });
  try {
    await publicarLink(v, (t) => { const e = $('.ia-etapa', box); if (e) e.textContent = t; });
    ld.parar(); toast('Link pronto ✓'); render(true);
  } catch (e) {
    ld.parar();
    box.innerHTML = `<div class="ia-st bad">${I.alert}<div>${esc(e.message)}${e.precisaBlob ? '<br><a href="#/ajustes?link">Como ativar</a>' : ''}</div></div>
      <button class="btn block mt" data-a="linkGerar" data-id="${v.id}">${I.refresh} Tentar de novo</button>`;
  }
};
A.linkCopiar = (el) => copiar(getV(el.dataset.id).link.url);
A.linkAbrir = (el) => abrir(getV(el.dataset.id).link.url);
A.linkEnviar = (el) => {
  const v = getV(el.dataset.id);
  const preco = num(v.precoAnuncio) ? brl(v.precoAnuncio) : '';
  compartilhar({ text: `${v.tipo === 'moto' ? '🏍️' : '🚗'} ${nomeV(v)} ${anoV(v)}${preco ? ' — ' + preco : ''}\n📸 Veja todas as fotos: ${v.link.url}`, title: nomeV(v) });
};

// cartão em Ajustes: status do armazenamento
function cardLinkAjustes() {
  return `<div class="card" id="sec-link">
    <h3>${I.link} Link para o cliente</h3>
    <p class="muted" style="margin:0 0 8px">Cada veículo pode ter um link com todas as fotos e o botão de WhatsApp (${S.cfg.whatsapp ? esc(fone(S.cfg.whatsapp)) : 'cadastre seu WhatsApp acima'}). Para veículos cadastrados no celular, as fotos ficam guardadas no <b>Vercel Blob</b> (grátis no plano Hobby).</p>
    <ol class="muted" style="margin:0 0 10px;padding-left:20px">
      <li>Na Vercel, abra o projeto › <b>Storage</b> › <b>Create</b> › <b>Blob</b>.</li>
      <li>Conecte ao projeto (cria a variável <b>BLOB_READ_WRITE_TOKEN</b>).</li>
      <li>Vá em <b>Deployments</b> › <b>Redeploy</b>.</li>
    </ol>
    <div id="blobSt"></div>
    <button class="btn block" data-a="linkTeste">${I.check} Verificar armazenamento</button>
  </div>`;
}
A.linkTeste = async () => {
  const st = $('#blobSt'); st.innerHTML = '<div class="ia-st">Verificando…</div>';
  S.linkBlob = null;
  try { const d = await apiPublicar({ acao: 'status' }); S.linkBlob = !!d.blob;
    st.innerHTML = d.blob ? `<div class="ia-st ok">${I.check}<div>Armazenamento ativo ✓ — pode gerar links de qualquer veículo.</div></div>`
      : `<div class="ia-st bad">${I.alert}<div>${esc(d.erro || 'Ainda não ativado. Siga os passos acima e faça Redeploy.')}<br><small>Sem isso, só os veículos que já estão no código (GitHub) têm link.</small></div></div>`;
  } catch (e) { st.innerHTML = `<div class="ia-st bad">${I.alert}<div>${esc(e.message)}</div></div>`; }
};
