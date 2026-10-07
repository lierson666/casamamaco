# Site oficial da Vivace — como publicar

Site estático (HTML + CSS + JS + imagens), sem banco de dados e sem build de Node.
Estilo caderno de Da Vinci (KV dos folders), com vinho e verde do logo.

```
vivace-oficial/
├─ dist/                      ← O SITE PRONTO. É isto que vai para o servidor.
├─ vivace-site-oficial.zip    ← o mesmo conteúdo de dist/, em um arquivo só
├─ deploy.sh                  ← publica por SFTP (faz backup antes)
└─ fonte/                     ← para editar o site (textos, produtos, estilo)
   ├─ build.py   products.json   style.css   main.js
```

## Publicar (jeito recomendado)

No Terminal, dentro desta pasta:

```bash
./deploy.sh
```

O script gera o site, baixa um **backup do que está no ar**, envia o site novo e confere se
`https://vivace.ind.br` responde. A senha do SFTP é pedida na hora. **Não fica salva em arquivo.**

Dados do servidor: SFTP · `187.77.50.154` · porta 22 · usuário `site` · pasta `/public`.

## Publicar sem o script

Envie **o conteúdo da pasta `dist/`** (não a pasta em si) para `/public` no servidor, por qualquer
programa SFTP (Cyberduck, FileZilla, Transmit) ou pelo painel da Hostinger. O zip
`vivace-site-oficial.zip` tem o mesmo conteúdo.

## Antes de divulgar (conferir com a Raíssa)

- [ ] **Textos "para que serve"** de cada categoria (estacionamento, saída de roldana, batente). Foram escritos em linguagem simples a partir do catálogo e do setor; confirmar se estão tecnicamente certos. Ficam em `fonte/build.py`, na lista `CATS`.
- [ ] **Kit Napoli**: não tem composição nem observações. O catálogo antigo não trazia esse kit com esse nome.
- [ ] **Kit Batente Veneto**: sem lista "Vem com" (o catálogo antigo tinha duas versões diferentes).
- [ ] **CEP**: não aparece no site. O site antigo dizia 04216-020 e o Google registra 04215-020. Confirmar e, se quiser, incluir.
- [ ] **E-mail** `acessorios@vivace.ind.br` está ativo e é lido?
- [ ] **Horário** (seg a sex, 8h–17h), **envio em até 7 dias** e **"mais de 13 anos"** vieram do folder. Confirmar que continuam valendo.
- [ ] Testar o botão "Pedir no WhatsApp" de 2 ou 3 produtos e o botão "Como chegar".

## Editar e republicar

1. Mude o texto/produto em `fonte/` (`build.py` tem as categorias e detalhes dos produtos; `products.json` tem a lista de peças e imagens).
2. `python3 fonte/build.py` regenera `dist/`. (Exige só Python 3.)
3. `./deploy.sh` publica.

Nova peça: coloque a foto recortada (`.webp`, fundo transparente) em `dist/assets/p/` e inclua a linha em
`fonte/products.json`.

## Cópia de teste (sem indexar no Google)

```bash
python3 fonte/build.py --base /vivace/ --noindex --out /tmp/vivace-teste
```

## Voltar atrás

O `deploy.sh` guarda o que estava no ar em `backups/site-no-ar-antes-de-…/public`. Para desfazer,
envie esse conteúdo de volta para `/public`.

## O que o site já tem

- Funciona sem rolagem lateral de 320 px a telas grandes; botões grandes para toque;
  barra fixa "WhatsApp / Ligar" no celular.
- Guia "Qual peça eu preciso?" para quem não conhece os nomes técnicos; busca de peças.
- 31 peças reais (fotos recortadas dos folders), cada uma com botão que já abre o WhatsApp com o nome da peça.
- Loja com mapa do Google e "Como chegar"; formulário que abre o WhatsApp.
- Prontos para o Google: `robots.txt`, `sitemap.xml`, dados estruturados de loja, ícone da aba, imagem de compartilhamento.
- O conteúdo funciona mesmo sem JavaScript (JS só faz busca, destaque do menu e o formulário).
