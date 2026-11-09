// =============================================================
//  IA DO APP (Google Gemini) — roda na Vercel, protegida pela senha
//  A chave NÃO fica no código: na Vercel vá em
//  Settings > Environment Variables >  GEMINI_API_KEY = sua chave
//  (opcional) GEMINI_MODEL = modelo do Gemini (padrão: gemini-2.5-flash, depois 3.6-flash, 3.5-flash-lite)
//
//  POST /api/ia  { acao: 'ler',   imagem: <base64>, mime: 'image/jpeg', loja: {...} }
//                { acao: 'texto', veiculo: {...}, canal, tom, instrucao, loja: {...} }
//                { acao: 'teste' }
// =============================================================
export const config = { maxDuration: 120 };

// Modelos atuais (nov/2026). O gemini-2.0-flash foi desligado pelo Google em 01/06/2026.
// GEMINI_MODEL (Vercel) ou o modelo que o "Testar IA" achou mais rápido vêm primeiro.
const MODELOS_PADRAO = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'];
const PRAZO_TOTAL = +process.env.IA_PRAZO_TOTAL_MS || 105000;      // ms: sempre responde antes da Vercel cortar (maxDuration 120 s)
const PRAZO_TENTATIVA = +process.env.IA_PRAZO_TENTATIVA_MS || 55000;   // ms: uma chamada travada não segura o resto

// "Pensar" deixa o Gemini 2.5/3 bem mais lento (principal suspeito do 504). Para ler uma arte não precisa.
function cfgPensar(modelo) {
  if (/^gemini-2\.5/.test(modelo)) return { thinkingBudget: 0 };
  if (/^gemini-3/.test(modelo)) return { thinkingLevel: 'low' };
  return null;
}
const modeloValido = (m) => typeof m === 'string' && /^gemini-[\w.-]{2,40}$/.test(m);

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
    combustivel: { type: 'STRING', description: 'Flex, Gasolina, Etanol, Diesel, Elétrico, Híbrido, GNV ou vazio' },
    cambio: { type: 'STRING', description: 'Manual, Automático, CVT, Automatizado ou vazio' },
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

// uma chamada ao Gemini com tempo-limite
async function umaChamada(ep, key, body, ms) {
  const t0 = Date.now();
  try {
    const r = await fetch(ep.url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: AbortSignal.timeout(Math.max(3000, ms)) });
    const txt = await r.text();
    return { r, txt, ms: Date.now() - t0 };
  } catch (e) {
    const demorou = e.name === 'TimeoutError' || e.name === 'AbortError';
    return { erro: demorou ? `demorou mais de ${Math.round(ms / 1000)} s` : 'sem conexão: ' + e.message, demorou, ms: Date.now() - t0 };
  }
}

async function chamarGemini(parts, schema, { preferido, prazo = PRAZO_TOTAL, maxTokens = 4096 } = {}) {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!key) { const e = new Error('Falta configurar GEMINI_API_KEY na Vercel (Settings > Environment Variables) e fazer Redeploy.'); e.status = 500; throw e; }
  const fim = Date.now() + prazo;
  const modelos = [...new Set([preferido, process.env.GEMINI_MODEL, ...MODELOS_PADRAO].filter(modeloValido))];
  const recusado = {};            // endpoint que recusou a chave (401/403) não é tentado de novo
  const tentativas = [];
  let ultimoErro, limite = false;
  fora: for (const modelo of modelos) {
    proximo: for (const ep of endpoints(key, modelo)) {
      if (recusado[ep.nome]) continue;
      const pensar = cfgPensar(modelo);
      // 1ª: com schema e sem "pensar" · se der 400, 2ª: sem schema e sem config extra
      const variantes = [{ schema: !!schema, pensar: !!pensar }, ...(schema || pensar ? [{ schema: false, pensar: false }] : [])];
      for (const vr of variantes) {
        const resta = fim - Date.now();
        if (resta < 6000) break fora;
        const body = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.3, maxOutputTokens: maxTokens, responseMimeType: 'application/json',
            ...(vr.schema ? { responseSchema: schema } : {}), ...(vr.pensar ? { thinkingConfig: pensar } : {}),
          },
        };
        const c = await umaChamada(ep, key, body, Math.min(PRAZO_TENTATIVA, resta - 2000));
        const tt = { modelo, via: ep.nome, ms: c.ms };
        tentativas.push(tt);
        if (c.erro) { tt.erro = c.erro; ultimoErro = new Error(`${modelo} (${ep.nome}): ${c.erro}`); ultimoErro.status = c.demorou ? 504 : 502; if (c.demorou) break proximo; break; }  // travou: vai direto para outro modelo
        tt.http = c.r.status;
        if (!c.r.ok) {
          let msg = c.txt.slice(0, 300); try { msg = JSON.parse(c.txt).error?.message || msg; } catch {}
          tt.erro = msg.slice(0, 160);
          ultimoErro = new Error(`${modelo} (${ep.nome}): HTTP ${c.r.status} ${msg.slice(0, 200)}`); ultimoErro.status = c.r.status;
          if (c.r.status === 429) { limite = true; break; }          // limite deste modelo: tenta outro modelo
          if (c.r.status === 401 || c.r.status === 403) { recusado[ep.nome] = ultimoErro; break; }
          if (c.r.status === 400) continue;                           // tenta a variante mais simples
          break;                                                      // 404 (modelo não existe) / 5xx: próximo
        }
        let d; try { d = JSON.parse(c.txt); } catch { tt.erro = 'resposta inválida'; ultimoErro = new Error('Resposta inválida do Gemini'); break; }
        const out = (d.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
        if (!out) { tt.erro = 'sem texto'; ultimoErro = new Error('Gemini não devolveu texto (' + (d.candidates?.[0]?.finishReason || d.promptFeedback?.blockReason || '?') + ')'); continue; }
        try {
          const json = JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, ''));
          tt.ok = true;
          console.log('[ia] ok', JSON.stringify(tentativas));
          return { json, modelo: modelo + ' · ' + ep.nome, ms: c.ms, tentativas };
        } catch { tt.erro = 'não veio JSON'; ultimoErro = new Error('Resposta da IA não veio em JSON'); }
      }
    }
    if (Object.keys(recusado).length >= 2) {
      const e = new Error('Chave do Gemini recusada. Confira GEMINI_API_KEY na Vercel (sem espaços), se a API do Gemini/Vertex está ativada para essa chave e faça Redeploy. Detalhe: ' + String(recusado['AI Studio']?.message || recusado.Vertex?.message).slice(0, 220));
      e.status = 401; e.tentativas = tentativas; console.log('[ia] chave recusada', JSON.stringify(tentativas)); throw e;
    }
  }
  console.log('[ia] falhou', JSON.stringify(tentativas));
  let e;
  if (limite && !tentativas.some((t) => t.ok)) { e = new Error('Limite do Gemini atingido. Espere 1 minuto e tente de novo.'); e.status = 429; }
  else if (tentativas.length && tentativas.every((t) => /demorou/.test(t.erro || ''))) { e = new Error('O Gemini está demorando demais para responder agora. Tente de novo em instantes.'); e.status = 504; }
  else e = ultimoErro || new Error('Falha ao chamar o Gemini');
  e.tentativas = tentativas;
  throw e;
}

function resumoFalha(rs = []) {
  if (!rs.length) return 'Nenhum modelo respondeu.';
  if (rs.every((r) => r.http === 401 || r.http === 403)) return 'Chave do Gemini recusada em todos os modelos. Confira a GEMINI_API_KEY na Vercel e faça Redeploy.';
  if (rs.some((r) => r.http === 429)) return 'Limite do Gemini atingido. Espere 1 minuto e teste de novo.';
  if (rs.every((r) => /demorou/.test(r.erro || ''))) return 'O Gemini não respondeu a tempo em nenhum modelo.';
  return 'Nenhum modelo respondeu. Veja os detalhes abaixo.';
}

// Testar IA: testa os modelos ao mesmo tempo e diz qual responde e quão rápido
async function diagnostico() {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const info = {
    chave: key ? (/^AQ\./.test(key) ? 'Vertex AI (começa com AQ.)' : /^AIza/.test(key) ? 'Google AI Studio (começa com AIza)' : 'formato desconhecido') : 'NÃO CONFIGURADA',
    tamanho: key.length, espacos: (process.env.GEMINI_API_KEY || '') !== key, modeloEnv: process.env.GEMINI_MODEL || '',
  };
  if (!key) return { ok: false, info, resultados: [], erro: 'Falta configurar GEMINI_API_KEY na Vercel (Settings > Environment Variables) e fazer Redeploy.' };
  const modelos = [...new Set([process.env.GEMINI_MODEL, ...MODELOS_PADRAO].filter(modeloValido))];
  const jobs = [];
  modelos.forEach((m, i) => endpoints(key, m).forEach((ep, j) => { if (j === 0 || i === 0) jobs.push({ m, ep }); }));
  const resultados = await Promise.all(jobs.map(async ({ m, ep }) => {
    const pensar = cfgPensar(m);
    const body = { contents: [{ role: 'user', parts: [{ text: 'Responda só {"ok": true}' }] }], generationConfig: { temperature: 0, maxOutputTokens: 50, responseMimeType: 'application/json', ...(pensar ? { thinkingConfig: pensar } : {}) } };
    const c = await umaChamada(ep, key, body, 25000);
    if (c.erro) return { modelo: m, via: ep.nome, ok: false, ms: c.ms, erro: c.erro };
    let msg = ''; if (!c.r.ok) { try { msg = JSON.parse(c.txt).error?.message || ''; } catch {} msg = (msg || c.txt).slice(0, 160); }
    return { modelo: m, via: ep.nome, ok: c.r.ok, http: c.r.status, ms: c.ms, erro: c.r.ok ? '' : msg };
  }));
  const bons = resultados.filter((r) => r.ok).sort((a, b) => a.ms - b.ms);
  console.log('[ia] diagnostico', JSON.stringify({ info, resultados }));
  return { ok: !!bons.length, info, resultados, melhor: bons[0] ? bons[0].modelo : '', modelo: bons[0] ? bons[0].modelo + ' · ' + bons[0].via : '' };
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const loja = b.loja || {};
    const preferido = modeloValido(b.modelo) ? b.modelo : '';
    if (b.acao === 'teste') {
      const d = await diagnostico();
      return res.status(d.ok ? 200 : d.info.tamanho ? 502 : 500).json(d.ok ? d : { ...d, erro: d.erro || resumoFalha(d.resultados) });
    }
    if (b.acao === 'ler') {
      if (!b.imagem) return res.status(400).json({ erro: 'Envie a imagem' });
      const r = await chamarGemini([{ text: promptLer(loja) }, { inlineData: { mimeType: b.mime || 'image/jpeg', data: b.imagem } }], SCHEMA_VEICULO, { preferido });
      return res.status(200).json({ dados: r.json, modelo: r.modelo, ms: r.ms });
    }
    if (b.acao === 'texto') {
      const r = await chamarGemini([{ text: promptTexto(b.veiculo || {}, b.canal, b.tom, String(b.instrucao || '').slice(0, 500), loja) }],
        { type: 'OBJECT', properties: { texto: { type: 'STRING' } }, required: ['texto'] }, { preferido, maxTokens: 2048 });
      return res.status(200).json({ texto: r.json.texto || '', modelo: r.modelo });
    }
    return res.status(400).json({ erro: 'acao inválida' });
  } catch (e) {
    return res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 500).json({ erro: e.message || String(e), tentativas: e.tentativas || [] });
  }
}
