// =============================================================
//  SENHA DO APP  (roda na Vercel antes de qualquer página abrir)
//  A senha NÃO fica no código: você cadastra ela na Vercel em
//  Settings > Environment Variables >  SENHA_APP = sua senha
//  Sem a senha ninguém consegue ver nem o código nem seus dados.
// =============================================================
import { next } from '@vercel/functions';

export const config = {
  // protege tudo, menos o ícone/manifest (necessários p/ instalar o app)
  matcher: ['/((?!icon\\.svg|icon-192\\.png|icon-512\\.png|manifest\\.webmanifest|marca/logo-192\\.jpg).*)'],
};

const COOKIE = 'garagem_auth';

async function gerarToken(senha) {
  const dados = new TextEncoder().encode('garagem-v1::' + senha);
  const hash = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function lerCookie(req, nome) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + nome + '=([^;]+)'));
  return m ? m[1] : '';
}

function iguais(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function paginaLogin(erro = false, status = 401) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f1115"><title>Garagem · Entrar</title>
<link rel="icon" href="/icon.svg"><link rel="manifest" href="/manifest.webmanifest">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;
font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0f1115;color:#f3f4f6;padding:24px}
.box{width:100%;max-width:360px;text-align:center}
.logo{width:96px;height:96px;border-radius:50%;margin:0 auto 18px;display:block;object-fit:cover}
h1{font-size:22px;margin:0 0 6px}p{color:#9ca3af;margin:0 0 22px;font-size:14px}
input{width:100%;font-size:18px;padding:15px 16px;border-radius:14px;border:1px solid #2a2f3a;background:#171a21;color:#fff;outline:none;text-align:center;letter-spacing:2px}
input:focus{border-color:#f59e0b}
button{margin-top:12px;width:100%;font-size:17px;font-weight:700;padding:15px;border:0;border-radius:14px;background:#f59e0b;color:#111;cursor:pointer}
.err{color:#f87171;font-size:14px;margin-top:12px}
</style></head><body><form class="box" method="POST" action="/entrar">
<img class="logo" src="/marca/logo-192.jpg" alt="" onerror="this.src='/icon.svg'">
<h1>Garagem</h1><p>Área restrita · digite sua senha</p>
<input type="password" name="senha" autocomplete="current-password" placeholder="••••••" autofocus required>
<button type="submit">Entrar</button>
${erro ? '<div class="err">Senha incorreta</div>' : ''}
</form></body></html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const senha = process.env.SENHA_APP;

  if (!senha) {
    return new Response(
      'Falta configurar a senha: na Vercel vá em Settings > Environment Variables, crie SENHA_APP e faça Redeploy.',
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  const token = await gerarToken(senha);

  // Envio do formulário de login
  if (url.pathname === '/entrar' && request.method === 'POST') {
    const form = await request.formData();
    const digitada = String(form.get('senha') || '');
    if (iguais(digitada, senha)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/',
          'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    await new Promise((r) => setTimeout(r, 1200)); // atrasa tentativas erradas
    return paginaLogin(true);
  }

  // Sair
  if (url.pathname === '/sair') {
    return new Response(null, {
      status: 303,
      headers: { Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` },
    });
  }

  if (iguais(lerCookie(request, COOKIE), token)) return next();

  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ erro: 'Sessão expirada: abra o app e digite a senha de novo' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  return paginaLogin(false);
}
