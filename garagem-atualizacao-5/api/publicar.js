// =============================================================
//  PUBLICAR LINK DO VEÍCULO (protegido pela senha do app)
//  Guarda as fotos e os dados de anúncio no Vercel Blob para a
//  página pública /c/<id> funcionar com qualquer veículo do app.
//  Para ativar: Vercel > Storage > Create > Blob > Connect ao projeto
//  (isso cria a variável BLOB_READ_WRITE_TOKEN) e faça Redeploy.
//
//  POST { acao: 'status' }
//  POST { acao: 'foto',   id, nome, mime, b64 }     -> { url }
//  POST { acao: 'salvar', id, dados }               -> { ok, link }
//  POST { acao: 'apagar', id }
// =============================================================
import { put, del, list } from '@vercel/blob';

export const config = { maxDuration: 60 };
const ID_OK = /^[a-z0-9][a-z0-9-]{0,79}$/;
const NOME_OK = /^[\w.-]{1,120}$/;
const MIME_OK = /^image\/(jpeg|png|webp)$/;
const temBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

// só o que pode aparecer para o cliente (nunca custo, despesas, lucro ou placa)
function limpar(d = {}) {
  const s = (x, n = 200) => String(x ?? '').slice(0, n);
  const urls = (a) => (Array.isArray(a) ? a : []).map((u) => String(u)).filter((u) => /^(https:\/\/|http:\/\/localhost[:/]|\/midias\/)/.test(u)).slice(0, 60);
  const L = d.loja || {};
  return {
    id: s(d.id, 80), tipo: d.tipo === 'moto' ? 'moto' : 'carro', marca: s(d.marca), modelo: s(d.modelo),
    anoFab: s(d.anoFab, 4), anoMod: s(d.anoMod, 4), km: s(d.km, 12), cor: s(d.cor, 40), combustivel: s(d.combustivel, 40), cambio: s(d.cambio, 40),
    precoAnuncio: Number(d.precoAnuncio) || 0, opcionais: s(d.opcionais, 2000), descricao: s(d.descricao, 4000),
    aceitaTroca: !!d.aceitaTroca, financia: !!d.financia, status: ['disponivel', 'reservado', 'vendido'].includes(d.status) ? d.status : 'disponivel',
    fotos: urls(d.fotos), videos: urls(d.videos),
    loja: { nomeLoja: s(L.nomeLoja, 80), slogan: s(L.slogan, 120), whatsapp: s(L.whatsapp, 20).replace(/\D/g, ''), cidade: s(L.cidade, 60), logo: s(L.logo, 300) },
    atualizado: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  try {
    if (b.acao === 'status') {
      if (!temBlob()) return res.status(200).json({ blob: false });
      try { await list({ limit: 1, prefix: 'carros/' }); return res.status(200).json({ blob: true }); }
      catch (e) { return res.status(200).json({ blob: false, erro: 'Blob configurado mas recusou: ' + e.message }); }
    }
    if (!temBlob()) return res.status(503).json({ erro: 'Falta ativar o armazenamento: na Vercel vá em Storage > Create > Blob, conecte ao projeto e faça Redeploy.' });
    const id = String(b.id || '');
    if (!ID_OK.test(id)) return res.status(400).json({ erro: 'id inválido' });

    if (b.acao === 'foto') {
      if (!NOME_OK.test(String(b.nome || '')) || !MIME_OK.test(String(b.mime || '')) || !b.b64) return res.status(400).json({ erro: 'foto inválida' });
      const buf = Buffer.from(String(b.b64), 'base64');
      if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ erro: 'foto grande demais' });
      const r = await put(`carros/${id}/${b.nome}`, buf, { access: 'public', contentType: b.mime, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
      return res.status(200).json({ url: r.url });
    }
    if (b.acao === 'salvar') {
      const d = limpar({ ...b.dados, id });
      await put(`carros/${id}.json`, JSON.stringify(d), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
      return res.status(200).json({ ok: true, link: `/c/${id}` });
    }
    if (b.acao === 'apagar') {
      const { blobs } = await list({ prefix: `carros/${id}` });
      const alvo = blobs.filter((x) => x.pathname === `carros/${id}.json` || x.pathname.startsWith(`carros/${id}/`)).map((x) => x.url);
      if (alvo.length) await del(alvo);
      return res.status(200).json({ ok: true, apagados: alvo.length });
    }
    return res.status(400).json({ erro: 'acao inválida' });
  } catch (e) {
    console.log('[publicar]', e);
    return res.status(500).json({ erro: 'Não consegui salvar o link: ' + (e.message || e) });
  }
}
