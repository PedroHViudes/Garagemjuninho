// =============================================================
//  IA DO APP (Google Gemini) — roda na Vercel, protegida pela senha
//  A chave NÃO fica no código: na Vercel vá em
//  Settings > Environment Variables >  GEMINI_API_KEY = sua chave
//  (opcional) GEMINI_MODEL = modelo do Gemini (padrão: gemini-2.5-flash)
//
//  POST /api/ia  { acao: 'ler',   imagem: <base64>, mime: 'image/jpeg', loja: {...} }
//                { acao: 'texto', veiculo: {...}, canal, tom, instrucao, loja: {...} }
//                { acao: 'teste' }
// =============================================================
export const config = { maxDuration: 60 };

const MODELOS_PADRAO = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

const SCHEMA_VEICULO = {
  type: 'OBJECT',
  properties: {
    tipo: { type: 'STRING', enum: ['carro', 'moto'] },
    marca: { type: 'STRING' },
    modelo: { type: 'STRING', description: 'Modelo + versão, ex: "Palio ELX 1.4"' },
    anoFab: { type: 'INTEGER', nullable: true },
    anoMod: { type: 'INTEGER', nullable: true },
    km: { type: 'INTEGER', nullable: true },
    cor: { type: 'STRING' },
    combustivel: { type: 'STRING', enum: ['', 'Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido', 'GNV'] },
    cambio: { type: 'STRING', enum: ['', 'Manual', 'Automático', 'CVT', 'Automatizado', 'Semi-automático'] },
    placa: { type: 'STRING' },
    precoAnuncio: { type: 'NUMBER', nullable: true },
    opcionais: { type: 'ARRAY', items: { type: 'STRING' } },
    destaques: { type: 'ARRAY', items: { type: 'STRING' } },
    procedencia: { type: 'ARRAY', items: { type: 'STRING' } },
    pendencias: { type: 'ARRAY', items: { type: 'STRING' } },
    condicoes: { type: 'ARRAY', items: { type: 'STRING' } },
    aceitaTroca: { type: 'BOOLEAN', nullable: true },
    financia: { type: 'BOOLEAN', nullable: true },
    legenda: { type: 'STRING' },
    legendaStory: { type: 'STRING' },
    confianca: { type: 'STRING', enum: ['alta', 'media', 'baixa'] },
    avisos: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['tipo', 'marca', 'modelo', 'opcionais', 'destaques', 'pendencias', 'condicoes', 'legenda', 'legendaStory', 'confianca', 'avisos'],
};

const REGRAS_TEXTO = (loja) => `
REGRAS DOS TEXTOS (obrigatórias):
- Português do Brasil, tom moderno, direto, vendedor e TRANSPARENTE. Público local: ${loja.cidade || 'Jacarezinho - PR'}.
- NUNCA invente nada que não esteja nos dados: não invente opcionais, km, ano, financiamento, troca, "sem leilão" etc.
- Se houver pendência (sinistro, leilão, remarcado, média/grande monta), inclua um bloco "⚠️ TRANSPARÊNCIA TOTAL:" com "❌ <pendência>" e a frase "É por isso que ele está nesse preço." + recomendar cotar o seguro.
- Se informaram "sem leilão/sem sinistro", inclua um bloco "🛡️ PROCEDÊNCIA:" com "✔️".
- Estrutura do post: linha de título com emoji (🚗 carro, 🏍️ moto, 🛻 picape) em CAIXA ALTA; uma frase curta de valor terminando em 👇; itens com ✅ (🆕 para itens novos); "💰 R$ X.XXX"; condições (🏦 financia, 💳 cartão, 🔄 troca, 🚫 não troca, 🔒 valor fixo) só se informadas;
  CTA: 📲 Comenta "<MODELO EM CAIXA ALTA>" que te chamo no Direct / ou fala direto no WhatsApp: ${loja.whatsapp || ''};
  13 a 17 hashtags no fim, terminando com o bloco local ${loja.hashtagsLocais || '#nortedoparana #carros43 #jacarezinho #jacarezinhopr'} (motos: use #motos43 no lugar de #carros43).
${loja.slogan ? `- Pode citar o slogan "${loja.slogan}" de forma natural (não obrigatório).` : ''}
- Story: no máximo 4 linhas curtas (modelo + 2 argumentos + preço/condição), sem hashtags.`;

function promptLer(loja) {
  return `Você é especialista em anúncios de veículos usados. A imagem é a ARTE DE ANÚNCIO (card) ou uma foto de um veículo à venda.
Leia TODAS as informações escritas na imagem e devolva o JSON pedido.
- marca/modelo: separe a marca (ex: "Fiat") do modelo+versão (ex: "Palio ELX 1.4"). Se for "Gol G4 1.6 Power", marca "Volkswagen".
- anoFab/anoMod: "2025/2026" => anoFab 2025, anoMod 2026. Um ano só => os dois iguais.
- km: número inteiro (ex: "apenas 4 mil km" => 4000). Sem km na imagem => null.
- precoAnuncio: número (ex: "R$ 33.990,00" => 33990). Sem preço => null.
- opcionais: itens de equipamento (ar-condicionado, direção hidráulica, vidros elétricos...).
- destaques: diferenciais (pneus novos, revisado, único dono, nota fiscal, manual e chave reserva, documento pago...).
- procedencia: só "Sem sinistro", "Sem leilão", "Documento em dia", "Recibo em branco" quando estiver escrito.
- pendencias: sinistro, leilão, remarcado, média/grande monta — só se estiver escrito.
- condicoes: financiamento, cartão, troca, "não abaixo o valor", "não faço na promissória", "só venda" etc.
- aceitaTroca/financia: true/false somente se estiver claro; senão null.
- placa: só preencha se for uma FOTO REAL e a placa estiver legível. Em artes geradas por IA a placa costuma ser inventada: nesse caso deixe "" e diga em avisos.
- NÃO copie o telefone, a cidade ou slogans como "Revenda no particular • Não somos loja" para os campos do veículo.
- confianca: quão segura foi a leitura. avisos: qualquer dúvida (texto ilegível, dado faltando, possível erro da arte).
- legenda: escreva a legenda completa do post (Instagram/Reels) seguindo as regras abaixo.
- legendaStory: texto curto para story.
${REGRAS_TEXTO(loja)}`;
}

const CANAIS = {
  instagram: 'legenda de post/Reels do Instagram (com hashtags no fim)',
  whatsapp: 'mensagem para Status/grupos de WhatsApp: use *negrito* do WhatsApp no título e no preço, SEM hashtags, no máximo 18 linhas',
  story: 'texto curto de story (até 4 linhas), sem hashtags',
  facebook: 'post para Facebook/Marketplace, linguagem simples, sem hashtags ou no máximo 3',
  olx: 'anúncio para OLX/Webmotors: primeira linha "TÍTULO: ..." (até 60 caracteres) e depois descrição em parágrafos, sem emojis, sem hashtags',
  tiktok: 'legenda curta de TikTok (até 4 linhas) com 5 a 8 hashtags',
};
const TONS = {
  direto: 'direto e objetivo',
  emocional: 'emocional, destacando sonho/conquista do carro próprio',
  urgencia: 'com senso de urgência (oportunidade, preço abaixo), sem mentir',
  premium: 'sofisticado e premium (para carros mais caros ou de colecionador)',
  divertido: 'leve e divertido, com gírias locais moderadas',
};

function promptTexto(v, canal, tom, instrucao, loja) {
  return `Escreva UM texto de divulgação para o veículo abaixo.
Formato: ${CANAIS[canal] || CANAIS.instagram}.
Tom: ${TONS[tom] || TONS.direto}.
${instrucao ? `Pedido extra do vendedor: ${instrucao}` : ''}
Loja: ${loja.nomeLoja || ''} · WhatsApp ${loja.whatsapp || ''} · ${loja.cidade || ''}.
DADOS DO VEÍCULO (use só isto):
${JSON.stringify(v, null, 1)}
${REGRAS_TEXTO(loja)}
Responda em JSON: {"texto": "..."}`;
}

// Chaves "AIza..." = Google AI Studio (generativelanguage). Chaves "AQ...." = Vertex AI (modo express).
// Tenta o endpoint certo primeiro e, se a chave for recusada ali, tenta o outro.
function endpoints(key, modelo) {
  const m = encodeURIComponent(modelo);
  const studio = { nome: 'AI Studio', url: `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent` };
  const vertex = { nome: 'Vertex', url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${m}:generateContent` };
  return /^AQ\./.test(key) ? [vertex, studio] : [studio, vertex];
}

async function chamarGemini(parts, schema) {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!key) { const e = new Error('Falta configurar GEMINI_API_KEY na Vercel (Settings > Environment Variables) e fazer Redeploy.'); e.status = 500; throw e; }
  const modelos = [...new Set([process.env.GEMINI_MODEL, ...MODELOS_PADRAO].filter(Boolean))];
  const recusado = {};            // endpoint que recusou a chave (401/403) não é tentado de novo
  let ultimoErro;
  for (const modelo of modelos) {
    for (const ep of endpoints(key, modelo)) {
      if (recusado[ep.nome]) continue;
      for (const comSchema of (schema ? [true, false] : [false])) {
        const body = {
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json', ...(comSchema ? { responseSchema: schema } : {}) },
        };
        let r, txt;
        try {
          r = await fetch(ep.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
          txt = await r.text();
        } catch (e) { ultimoErro = new Error(`Sem conexão com o Gemini (${ep.nome}): ${e.message}`); break; }
        if (!r.ok) {
          ultimoErro = new Error(`Gemini ${modelo} (${ep.nome}): HTTP ${r.status} ${txt.slice(0, 300)}`); ultimoErro.status = r.status;
          if (r.status === 429) { ultimoErro.message = 'Limite do Gemini atingido. Espere 1 minuto e tente de novo.'; throw ultimoErro; }
          if (r.status === 401 || r.status === 403) { recusado[ep.nome] = ultimoErro; break; }
          if (r.status === 400 && comSchema) continue;   // tenta sem schema
          break;                                         // 404/5xx: próximo endpoint/modelo
        }
        let d; try { d = JSON.parse(txt); } catch { ultimoErro = new Error('Resposta inválida do Gemini'); break; }
        const out = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
        if (!out) { ultimoErro = new Error('Gemini não devolveu texto (' + (d.candidates?.[0]?.finishReason || d.promptFeedback?.blockReason || '?') + ')'); break; }
        try { return { json: JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, '')), modelo: modelo + ' · ' + ep.nome }; }
        catch { ultimoErro = new Error('Resposta da IA não veio em JSON'); if (!comSchema) break; }
      }
    }
    if (Object.keys(recusado).length >= 2) {
      const e = new Error('Chave do Gemini recusada. Confira GEMINI_API_KEY na Vercel (sem espaços) e se a API do Gemini está ativada para essa chave. Detalhe: ' + String(recusado['AI Studio']?.message || recusado.Vertex?.message).slice(0, 220));
      e.status = 401; throw e;
    }
  }
  throw ultimoErro || new Error('Falha ao chamar o Gemini');
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const loja = b.loja || {};
    if (b.acao === 'teste') {
      const r = await chamarGemini([{ text: 'Responda {"ok": true}' }]);
      return res.status(200).json({ ok: true, modelo: r.modelo });
    }
    if (b.acao === 'ler') {
      if (!b.imagem) return res.status(400).json({ erro: 'Envie a imagem' });
      const r = await chamarGemini([{ text: promptLer(loja) }, { inlineData: { mimeType: b.mime || 'image/jpeg', data: b.imagem } }], SCHEMA_VEICULO);
      return res.status(200).json({ dados: r.json, modelo: r.modelo });
    }
    if (b.acao === 'texto') {
      const r = await chamarGemini([{ text: promptTexto(b.veiculo || {}, b.canal, b.tom, String(b.instrucao || '').slice(0, 500), loja) }],
        { type: 'OBJECT', properties: { texto: { type: 'STRING' } }, required: ['texto'] });
      return res.status(200).json({ texto: r.json.texto || '', modelo: r.modelo });
    }
    return res.status(400).json({ erro: 'acao inválida' });
  } catch (e) {
    return res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 500).json({ erro: e.message || String(e) });
  }
}
