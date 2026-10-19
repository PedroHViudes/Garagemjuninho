# Garagem — gestão de veículos (carros e motos)

App de celular para: mídias de cada veículo, divulgação rápida (WhatsApp, Instagram, Facebook, Marketplace, Meta Ads, OLX, TikTok), caixa, lucro/prejuízo, FIPE e consulta de placa.
Grátis na Vercel, protegido por senha.

## Publicar (uma vez só, ~10 min)
1. Crie uma conta em **github.com** e um repositório **privado** chamado `garagem`.
2. Envie todos os arquivos desta pasta (botão *Add file → Upload files*; dá pelo celular ou PC).
3. Entre em **vercel.com** com a conta do GitHub → *Add New → Project* → escolha `garagem` → **Deploy**.
4. Na Vercel: *Settings → Environment Variables* → crie **`SENHA_APP`** com a sua senha → salve.
5. *Deployments* → nos 3 pontinhos do último → **Redeploy**.
6. Abra o link no celular, digite a senha e use *Adicionar à tela inicial* para virar app.

A senha fica só na Vercel (não aparece no código). Sem ela ninguém vê nada, nem o código.

## Onde ficam os dados
- **Veículos, caixa e ajustes**: no celular + podem ser gravados no código (`public/dados.js`).
  No app: *Ajustes → Gerar dados.js* → cole no GitHub → a Vercel atualiza sozinha.
- **Fotos e vídeos**: salvos no próprio celular (no app). Faça *Ajustes → Backup completo (.zip)* de vez em quando e guarde no Google Drive.
  Se quiser fotos fixas no código, suba em `public/midias/nome-do-carro/` e liste no campo *Fotos/vídeos que estão no código*.

## Dicas de uso
- **Compartilhar**: na aba *Mídias* marque as fotos/vídeos → botão verde → escolha WhatsApp/Instagram/Facebook. O texto do anúncio já vai copiado — é só colar na legenda.
- **Card pronto**: gera uma imagem com foto, preço e seu WhatsApp (Feed ou Status/Story).
- **Grupos**: cadastre seus grupos em *Ajustes*; na aba *Divulgar*, “Postar” copia o texto, abre o grupo e marca a data.
- **Rolo/troca**: em *Registrar venda* ligue “Entrou veículo na troca” — ele já entra no estoque com o valor da troca, e no caixa entra só a diferença.
- **Consulta de placa**: os atalhos ficam em *Ajustes* (formato `Nome | link com {PLACA}`). Dá para trocar pelo app/site que você usa.

## Importar fotos, vídeos e legendas de uma vez (pacote .zip)
*Ajustes → Importar pacote*. Formato do .zip — uma pasta por veículo:
```
pacote.zip
└─ honda-civic-2019/            ← nome da pasta = marca modelo ano
   ├─ info.json                 ← opcional: {"marca","modelo","anoMod","km","precoAnuncio","placa",...}
   ├─ legenda.txt               ← legenda do post/Reels
   ├─ 01.jpg, 02.jpg, video.mp4
   └─ stories/                  ← tudo aqui vira STORY
      ├─ story1.mp4
      └─ legenda.txt            ← legenda do story
```
Se o veículo já existe (mesmo nome/placa) as mídias são somadas a ele; se não, ele é criado.
