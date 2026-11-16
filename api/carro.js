// =============================================================
//  PÁGINA PÚBLICA DO VEÍCULO  —  link para o cliente: /c/<id>
//  Aberta SEM senha (o middleware libera /c/ e /api/carro).
//  Mostra só dados de anúncio (nunca custo, lucro ou placa).
//  De onde vêm os dados:
//   1) do link publicado pelo app (Vercel Blob: carros/<id>.json)
//   2) se não houver, do dados.js do código (veículos já no GitHub)
// =============================================================
import { head } from '@vercel/blob';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ID_OK = /^[a-z0-9][a-z0-9-]{0,79}$/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (x) => { const n = typeof x === 'number' ? x : parseFloat(String(x ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const brl = (n) => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
const fone = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t || ''; };
const ehVideo = (u) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);

let cacheCodigo = null;
function dadosDoCodigo() {
  if (cacheCodigo) return cacheCodigo;
  try {
    const src = readFileSync(join(process.cwd(), 'public', 'dados.js'), 'utf8');
    const ctx = { window: {} };
    vm.runInNewContext(src, ctx, { timeout: 1000 });
    cacheCodigo = ctx.window.DADOS || null;
  } catch (e) { console.log('[carro] sem dados.js', e.message); cacheCodigo = null; }
  return cacheCodigo;
}

// monta o objeto público a partir do dados.js (mesmo formato que o app publica)
function publicoDoCodigo(id) {
  const D = dadosDoCodigo(); if (!D) return null;
  const v = (D.veiculos || []).find((x) => x.id === id); if (!v) return null;
  const c = D.config || {};
  const lista = (v.midiasCodigo || []).filter(Boolean);
  const capa = String(v.capaId || '').replace(/^cod:/, '');
  if (capa && lista.includes(capa)) lista.unshift(...lista.splice(lista.indexOf(capa), 1));   // capa escolhida no app vem primeiro
  const midias = lista.map((p) => '/' + String(p).replace(/#story$/i, '').replace(/^\//, ''));
  return {
    id: v.id, tipo: v.tipo, marca: v.marca, modelo: v.modelo, anoFab: v.anoFab, anoMod: v.anoMod, km: v.km, cor: v.cor,
    combustivel: v.combustivel, cambio: v.cambio, precoAnuncio: v.precoAnuncio, opcionais: v.opcionais, descricao: v.descricao,
    aceitaTroca: v.aceitaTroca, financia: v.financia, status: v.status || 'disponivel',
    fotos: midias.filter((u) => !ehVideo(u)), videos: midias.filter(ehVideo),
    loja: { nomeLoja: c.nomeLoja, slogan: c.slogan, whatsapp: c.whatsapp, cidade: c.cidade, logo: c.logo ? '/' + c.logo : '' },
  };
}

async function publicoDoBlob(id) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const h = await head(`carros/${id}.json`);
    const r = await fetch(h.url + (h.url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { if (!/not found|BlobNotFound/i.test(String(e?.name) + e?.message)) console.log('[carro] blob', e.message); return null; }
}

function pagina(v, origem) {
  const L = v.loja || {};
  const nome = [v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo';
  const ano = v.anoFab && v.anoMod && String(v.anoFab) !== String(v.anoMod) ? `${v.anoFab}/${v.anoMod}` : v.anoMod || v.anoFab || '';
  const preco = num(v.precoAnuncio) ? brl(num(v.precoAnuncio)) : 'Consulte';
  const km = num(v.km) ? Math.round(num(v.km)).toLocaleString('pt-BR') + ' km' : '';
  const vendido = v.status === 'vendido';
  const fotos = (v.fotos || []).map((u) => (u.startsWith('/') ? origem + u : u));
  const videos = (v.videos || []).map((u) => (u.startsWith('/') ? origem + u : u));
  const zap = String(L.whatsapp || '').replace(/\D/g, '');
  const link = `${origem}/c/${v.id}`;
  const msg = vendido ? `Olá! Vi o ${nome} ${ano} no seu link, mas ele já foi vendido. Tem outro parecido?` : `Olá! Vi o ${nome} ${ano} (${preco}) e tenho interesse. Ainda está disponível?\n${link}`;
  const wa = zap ? `https://wa.me/${zap.length <= 11 ? '55' + zap : zap}?text=${encodeURIComponent(msg)}` : '';
  const ops = String(v.opcionais || '').split(/\s*[,;\n]\s*/).filter(Boolean);
  const fichas = [['Ano', ano], ['KM', km], ['Câmbio', v.cambio], ['Combustível', v.combustivel], ['Cor', v.cor]].filter(([, x]) => x);
  const conds = [v.financia && 'Financia', v.aceitaTroca && 'Aceita troca'].filter(Boolean);
  const descr = String(v.descricao || '').trim();
  const logo = L.logo ? (L.logo.startsWith('/') ? origem + L.logo : L.logo) : '';
  const titulo = `${nome} ${ano}${vendido ? ' · VENDIDO' : ' · ' + preco}`;
  const desc = [km, v.cambio, L.cidade, L.nomeLoja].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
${fotos[0] ? `<meta property="og:image" content="${esc(fotos[0])}">` : ''}<meta property="og:url" content="${esc(link)}">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0f1115">
${logo ? `<link rel="icon" href="${esc(logo)}">` : ''}
<style>
:root{--bg:#0f1115;--card:#181b22;--line:#262b35;--txt:#f3f4f6;--txt2:#a6adbb;--acc:#f59e0b;--wa:#25d366}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
body{padding-bottom:calc(92px + env(safe-area-inset-bottom));overflow-x:clip}
.top{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top) + 12px) 16px 12px}
.top img{width:40px;height:40px;border-radius:50%;object-fit:cover}.top b{font-size:15px;display:block}.top small{color:var(--txt2);font-size:12px}
.gal{position:relative;max-width:720px;margin:0 auto}
.slides{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;background:#000}
.slides::-webkit-scrollbar{display:none}
.slides>*{flex:0 0 100%;scroll-snap-align:center;aspect-ratio:4/3;width:100%;object-fit:contain;background:#000;cursor:zoom-in;display:block}
.cont{position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.6);color:#fff;font-size:13px;font-weight:700;padding:4px 10px;border-radius:99px}
.seta{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:#fff;font-size:22px;cursor:pointer;display:none}
.seta.e{left:8px}.seta.d{right:8px}@media(hover:hover){.seta{display:block}}
.thumbs{display:flex;gap:6px;overflow-x:auto;padding:8px 16px;max-width:720px;margin:0 auto;scrollbar-width:none}
.thumbs button{flex:none;width:64px;height:48px;border-radius:8px;overflow:hidden;border:2px solid transparent;padding:0;background:#000;cursor:pointer;opacity:.6}
.thumbs button.on{border-color:var(--acc);opacity:1}.thumbs img,.thumbs video{width:100%;height:100%;object-fit:cover}
main{max-width:720px;margin:0 auto;padding:6px 16px 24px}
h1{font-size:24px;line-height:1.2;margin:8px 0 4px;letter-spacing:-.3px}
.preco{font-size:30px;font-weight:900;color:var(--acc);margin:4px 0 10px}
.vend{display:inline-block;background:#dc2626;color:#fff;font-weight:800;padding:6px 12px;border-radius:99px;margin:6px 0}
.fichas{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px 0}
.ficha{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.ficha small{color:var(--txt2);font-size:12px;display:block}.ficha b{font-size:15px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.tag{background:rgba(245,158,11,.14);color:var(--acc);font-weight:700;font-size:13px;padding:6px 11px;border-radius:99px}
h2{font-size:16px;margin:20px 0 8px}
ul.ops{list-style:none;padding:0;margin:0;display:grid;gap:6px}ul.ops li{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:14.5px}
ul.ops li::before{content:"✓ ";color:var(--wa);font-weight:800}
.descr{white-space:pre-line;color:#dfe3ea;line-height:1.5;font-size:15px}
.loja{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:22px}
.loja img{width:52px;height:52px;border-radius:50%;object-fit:cover}.loja small{color:var(--txt2);display:block;font-size:13px}
.barra{position:fixed;left:0;right:0;bottom:0;background:rgba(15,17,21,.94);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:10px 16px calc(10px + env(safe-area-inset-bottom));z-index:5}
.barra .in{max-width:720px;margin:0 auto;display:flex;gap:10px;align-items:center}
.barra .p{flex:none;font-weight:900;color:var(--acc);font-size:18px}
.wa{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--wa);color:#06260f;text-decoration:none;font-weight:800;font-size:17px;padding:14px;border-radius:14px}
.wa svg{width:22px;height:22px}
.lb{position:fixed;inset:0;background:#000;z-index:10;display:none;flex-direction:column}
.lb.on{display:flex}.lb .slides{flex:1}.lb .slides>*{aspect-ratio:auto;height:100%;cursor:default}
.lb .x{position:absolute;top:calc(env(safe-area-inset-top) + 10px);right:12px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:22px;z-index:2;cursor:pointer}
.vazio{aspect-ratio:4/3;display:grid;place-items:center;color:var(--txt2);background:var(--card)}
</style></head><body>
<header class="top">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><b>${esc(L.nomeLoja || '')}</b><small>${esc(L.slogan || '')}</small></div></header>
<section class="gal">
  ${fotos.length || videos.length ? `<div class="slides" id="sl">${fotos.map((u, i) => `<img src="${esc(u)}" alt="${esc(nome)} — foto ${i + 1}" ${i ? 'loading="lazy"' : ''} data-i="${i}">`).join('')}${videos.map((u) => `<video src="${esc(u)}" controls playsinline preload="metadata"></video>`).join('')}</div>
  <span class="cont" id="ct">1 / ${fotos.length + videos.length}</span>
  <button class="seta e" data-d="-1" aria-label="Anterior">‹</button><button class="seta d" data-d="1" aria-label="Próxima">›</button>` : '<div class="vazio">Fotos em breve</div>'}
</section>
${fotos.length + videos.length > 1 ? `<div class="thumbs" id="th">${fotos.map((u, i) => `<button data-i="${i}" class="${i ? '' : 'on'}" aria-label="Foto ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}${videos.map((u, k) => `<button data-i="${fotos.length + k}" aria-label="Vídeo"><video src="${esc(u)}#t=0.5" muted preload="metadata"></video></button>`).join('')}</div>` : ''}
<main>
  <h1>${esc(nome)}${ano ? ` <span style="color:var(--txt2);font-weight:600">${esc(ano)}</span>` : ''}</h1>
  ${vendido ? '<div class="vend">VENDIDO</div>' : `<div class="preco">${esc(preco)}</div>`}
  ${conds.length && !vendido ? `<div class="tags">${conds.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>` : ''}
  ${fichas.length ? `<div class="fichas">${fichas.map(([k, x]) => `<div class="ficha"><small>${esc(k)}</small><b>${esc(x)}</b></div>`).join('')}</div>` : ''}
  ${ops.length ? `<h2>Itens e opcionais</h2><ul class="ops">${ops.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
  ${descr ? `<h2>Sobre o veículo</h2><div class="descr">${esc(descr)}</div>` : ''}
  <div class="loja">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><b>${esc(L.nomeLoja || '')}</b><small>${esc([L.cidade, zap ? fone(zap) : ''].filter(Boolean).join(' · '))}</small></div></div>
</main>
${wa ? `<div class="barra"><div class="in">${vendido ? '' : `<span class="p">${esc(preco)}</span>`}<a class="wa" id="wa" href="${esc(wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.1-3.4-8.4z"/></svg>${vendido ? 'Ver outros veículos' : 'Chamar no WhatsApp'}</a></div></div>` : ''}
<div class="lb" id="lb"><button class="x" aria-label="Fechar">✕</button><div class="slides" id="lbs">${fotos.map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div></div>
<script>
(function(){var sl=document.getElementById('sl');if(!sl)return;var n=sl.children.length,ct=document.getElementById('ct'),th=document.getElementById('th'),lb=document.getElementById('lb'),lbs=document.getElementById('lbs');
function at(){return Math.round(sl.scrollLeft/sl.clientWidth)}
function ir(i){i=Math.max(0,Math.min(n-1,i));sl.scrollTo({left:i*sl.clientWidth,behavior:'smooth'})}
sl.addEventListener('scroll',function(){var i=at();ct.textContent=(i+1)+' / '+n;if(th){[].forEach.call(th.children,function(b,k){b.classList.toggle('on',k===i)});var b=th.children[i];if(b)b.scrollIntoView({block:'nearest',inline:'center'})}},{passive:true});
if(th)th.addEventListener('click',function(e){var b=e.target.closest('button');if(b)ir(+b.dataset.i)});
document.querySelectorAll('.seta').forEach(function(b){b.onclick=function(){ir(at()+(+b.dataset.d))}});
sl.addEventListener('click',function(e){var im=e.target.closest('img');if(!im)return;lb.classList.add('on');document.body.style.overflow='hidden';lbs.scrollLeft=(+im.dataset.i)*lbs.clientWidth});
lb.querySelector('.x').onclick=function(){lb.classList.remove('on');document.body.style.overflow=''};
document.addEventListener('keydown',function(e){if(e.key==='Escape')lb.querySelector('.x').click();if(e.key==='ArrowRight')ir(at()+1);if(e.key==='ArrowLeft')ir(at()-1)});})();
</script>
</body></html>`;
}

function naoEncontrado(origem) {
  const D = dadosDoCodigo(); const c = D?.config || {};
  const zap = String(c.whatsapp || '').replace(/\D/g, '');
  const wa = zap ? `https://wa.me/55${zap}?text=${encodeURIComponent('Olá! Vi um anúncio de vocês e queria saber dos veículos disponíveis.')}` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Veículo não encontrado</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0f1115;color:#f3f4f6;font-family:system-ui,sans-serif;text-align:center;padding:24px}
a{display:inline-block;margin-top:16px;background:#25d366;color:#06260f;font-weight:800;padding:14px 20px;border-radius:14px;text-decoration:none}p{color:#a6adbb}</style></head>
<body><div><h1>Veículo não encontrado</h1><p>Este anúncio saiu do ar ou o link está incompleto.</p>${wa ? `<a href="${wa}">Chamar no WhatsApp</a>` : ''}</div></body></html>`;
}

export default async function handler(req, res) {
  const id = String(req.query?.id || new URL(req.url, 'http://x').searchParams.get('id') || '').toLowerCase();
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origem = `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  if (!ID_OK.test(id)) { res.setHeader('cache-control', 'no-store'); return res.status(404).send(naoEncontrado(origem)); }
  const v = (await publicoDoBlob(id)) || publicoDoCodigo(id);
  if (!v) { res.setHeader('cache-control', 'no-store'); return res.status(404).send(naoEncontrado(origem)); }
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).send(pagina(v, origem));
}
