#!/usr/bin/env python3
"""Gera o site Vivace (estático) em site2/. Caminhos absolutos /vivace/..."""
import argparse, json, re, html, shutil, urllib.parse, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser(description="Gera o site da Vivace (HTML estático).")
ap.add_argument("--base", default="/", help="prefixo dos caminhos: / (site oficial) ou /vivace/ (cópia de teste)")
ap.add_argument("--out", default=str(HERE.parent / "dist"), help="pasta de saída (a pasta assets/ precisa estar nela)")
ap.add_argument("--url", default="https://vivace.ind.br", help="endereço público do site")
ap.add_argument("--noindex", action="store_true", help="pede para o Google não indexar (use só em teste)")
ARGS = ap.parse_args()

OUT = pathlib.Path(ARGS.out)
BASE = ARGS.base if ARGS.base.endswith("/") else ARGS.base + "/"
SITE = ARGS.url.rstrip("/")
ROBOTS = "noindex, nofollow" if ARGS.noindex else "index, follow"
WA = "5511995164432"
TEL = "+5511995164432"
prods = json.load(open(HERE / "products.json"))

def esc(s): return html.escape(s, quote=True)
def wa(msg): return f"https://wa.me/{WA}?text=" + urllib.parse.quote(msg)

# ---- categorias (ordem do site) -------------------------------------------
CATS = [
 dict(id="roldanas", key="KIT ROLDANA", nome="Kit Roldana", titulo="Kits de roldana",
      uso="As rodinhas que fazem cada vidro correr (deslizar) no trilho da sacada. Todas as roldanas também são vendidas avulsas."),
 dict(id="batentes", key="KIT BATENTE", nome="Kit Batente", titulo="Kits de batente",
      uso="Para o vidro que abre como uma porta (porta de abrir). O kit junta roldanas e a peça que sustenta o vidro."),
 dict(id="estacionamentos", key="Estacionamentos para Vidros", nome="Estacionamentos", titulo="Estacionamentos para vidros",
      uso="Guiam os vidros na hora de abrir e deixam cada vidro “estacionado” empilhado de lado quando a sacada está aberta."),
 dict(id="saidas", key="Saída de Roldanas", nome="Saída de roldana", titulo="Saídas de roldana",
      uso="Peças de guia e acabamento na ponta do trilho, no ponto em que as roldanas entram e saem."),
 dict(id="fechaduras", key="FECHADURAS", nome="Fechaduras", titulo="Fechaduras",
      uso="Trancam o vidro e dão segurança à sacada."),
 dict(id="aparadores", key="APARADORES", nome="Aparadores", titulo="Aparadores",
      uso="Seguram o vidro aberto, para ele não bater nem voltar sozinho."),
 dict(id="acabamentos", key="ACABAMENTOS", nome="Acabamentos", titulo="Acabamentos e vedação",
      uso="Tampas, limitadores, borrachas e escovas de vedação: dão acabamento e fecham as frestas."),
]

# ---- detalhes reais (do catálogo anterior e dos folders) ---------------------
MAT_K = "Inox e poliacetal"
MAT_B = "Inox, alumínio e nylon com fibra"
D = {
 ("KIT ROLDANA","Kit Veneto s/ Regulagem"): dict(comp=["1 roldana tripla","1 roldana dupla","1 sem regulagem","1 pino guia"], mat=MAT_K),
 ("KIT ROLDANA","Kit Veneto c/ Regulagem"): dict(comp=["1 roldana tripla","1 roldana dupla","1 com regulagem","1 pino guia"], mat=MAT_K),
 ("KIT ROLDANA","Kit Siena"): dict(uso="Usada em sacadas com trilho triplo, superior e inferior.", comp=["2 roldanas triplas","2 roldanas duplas"], mat=MAT_K),
 ("KIT ROLDANA","Kit Verona"): dict(uso="Usada em sacadas sem pino guia, usando a roldana dupla no lugar.", comp=["1 roldana tripla","1 roldana dupla","2 roldanas sem regulagem"], mat=MAT_K),
 ("KIT ROLDANA","Kit Sorrento"): dict(uso="Usada em sacadas sem pino guia, usando a roldana única no lugar.", comp=["1 roldana tripla","1 roldana dupla","1 roldana sem regulagem","1 roldana única"], mat=MAT_K),
 ("KIT BATENTE","Kit Veneto"): dict(uso="Kit utilizado na porta de abrir.", mat=MAT_B),
 ("KIT BATENTE","Kit Siena"): dict(uso="Kit utilizado na porta de abrir, no trilho triplo superior e inferior.", comp=["2 triplos","2 pinos guia"], mat=MAT_B),
 ("KIT BATENTE","Kit Napoli"): dict(uso="Kit utilizado na porta de abrir.", mat=MAT_B),
 ("KIT BATENTE","Kit Sorrento"): dict(uso="Kit utilizado na porta de abrir.", comp=["1 batente duplo","1 batente triplo","1 roldana única"], mat=MAT_B),
 ("Estacionamentos para Vidros","Antiqueda"): dict(uso="Guia os vidros na hora de abrir. Sistema antiqueda com 3 cavidades.", mat="Nylon com fibra"),
 ("Estacionamentos para Vidros","Duplo"): dict(uso="Guia os vidros na hora de abrir. Sistema com 3 cavidades.", mat="Nylon com fibra"),
 ("Estacionamentos para Vidros","Simples"): dict(uso="Guia os vidros na hora de abrir. 3 cavidades, apenas de um lado.", mat="Nylon com fibra"),
 ("Estacionamentos para Vidros","Simples Alumínio"): dict(uso="Estacionamento simples, em alumínio.", mat="Alumínio"),
 ("FECHADURAS","Fechadura Leito"): dict(uso="Instalada no leito do vidro, para vidro de 10 mm.", mat="Alumínio com pintura eletrostática"),
 ("FECHADURAS","Fechadura Vidro-Vidro"): dict(uso="Fechadura colante, para vidros de 10 mm.", mat="Alumínio com pintura eletrostática e fita 3M"),
 ("FECHADURAS","Fechadura Leito c/ Contra"): dict(uso="Instalada no leito do vidro, para vidro de 10 mm, com contra-fechadura.", mat="Alumínio com pintura eletrostática"),
 ("Saída de Roldanas","Kit Saída Ravena"): dict(comp=["1 saída superior","1 saída inferior"], mat="Alumínio, nas cores preto e branco"),
 ("APARADORES","Aparador para vidros"): dict(uso="Suporte para manter o vidro aberto, em alumínio e inox. Tamanhos: 20, 35 e 55 cm. Cores: preto, branco e fosco."),
 ("APARADORES","Kit Aparador para Vidros"): dict(uso="Apenas as peças avulsas do suporte em alumínio. Cores: preto, branco e fosco."),
}

def nice(name):  # limpa espaços e capitaliza "Veneto " etc.
    return re.sub(r"[\s\x00-\x1f]+"," ",name).strip()

by_cat = {c["key"]: [] for c in CATS}
for p in prods:
    p["name"] = nice(p["name"])
    by_cat[p["cat"]].append(p)
assert sum(len(v) for v in by_cat.values()) == len(prods) == 31

ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.3.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.1.1.6-.1 1.3z"/></svg>'
ICON_TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>'
ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m3 7 9 6 9-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'

def card(c, p):
    d = D.get((p["cat"], p["name"]), {})
    uso = d.get("uso")
    comp = d.get("comp")
    mat = d.get("mat")
    msg = f"Olá, Vivace! Quero saber preço e prazo: {p['name']} ({c['nome']})."
    h = [f'<article class="card" data-search="{esc((p["name"]+" "+c["nome"]+" "+(uso or "")+" "+" ".join(comp or [])).lower())}">']
    h.append(f'<div class="card-img"><img src="{BASE}assets/p/{p["img"]}" width="{p["w"]}" height="{p["h"]}" alt="{esc(p["name"])} — {esc(c["nome"])}" loading="lazy" decoding="async"></div>')
    h.append('<div class="card-body">')
    h.append(f'<h3>{esc(p["name"])}</h3>')
    if uso: h.append(f'<p class="use">{esc(uso)}</p>')
    if comp:
        h.append('<div class="comp"><p class="lbl">Vem com</p><ul>' + "".join(f"<li>{esc(x)}</li>" for x in comp) + "</ul></div>")
    if mat: h.append(f'<p class="mat"><span class="lbl">Material</span> {esc(mat)}</p>')
    h.append(f'<a class="btn btn-wine btn-block" href="{wa(msg)}" target="_blank" rel="noopener">{ICON_WA}<span>Pedir no WhatsApp</span></a>')
    h.append('</div></article>')
    return "".join(h)

sections = []
chips = []
for c in CATS:
    items = by_cat[c["key"]]
    chips.append(f'<a href="#{c["id"]}" data-spy="{c["id"]}">{esc(c["nome"])}</a>')
    sections.append(
        f'<section class="cat" id="{c["id"]}" aria-labelledby="h-{c["id"]}">'
        f'<header class="cat-head"><p class="kicker">{len(items)} {"modelo" if len(items)==1 else "modelos"}</p>'
        f'<h2 id="h-{c["id"]}">{esc(c["titulo"])}</h2><p class="cat-use">{esc(c["uso"])}</p></header>'
        f'<div class="grid">' + "".join(card(c,p) for p in items) + '</div></section>')

guide = [
 ("Meu vidro corre (desliza)", "Você vai precisar de roldanas, estacionamento e saída de roldana.", [("roldanas","Roldanas"),("estacionamentos","Estacionamentos"),("saidas","Saídas")],
  '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="14" width="22" height="34" rx="2"/><rect x="24" y="18" width="22" height="34" rx="2"/><path d="M50 30h10M56 25l5 5-5 5"/></svg>'),
 ("Meu vidro abre como porta", "Escolha o kit de batente e uma fechadura.", [("batentes","Batentes"),("fechaduras","Fechaduras")],
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 8h26l14 6v42H12z"/><path d="M38 8v48"/><circle cx="32" cy="34" r="2.2"/></svg>'),
 ("Preciso trancar ou segurar o vidro", "Fechaduras trancam. Aparadores seguram o vidro aberto.", [("fechaduras","Fechaduras"),("aparadores","Aparadores")],
  '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="28" width="36" height="26" rx="3"/><path d="M22 28v-8a10 10 0 0 1 20 0v8"/><circle cx="32" cy="41" r="3"/></svg>'),
 ("Quero vedar e dar acabamento", "Borrachas, escovas, tampas e limitadores.", [("acabamentos","Acabamentos")],
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 40c8-10 14 10 24 0s16 10 24 0"/><path d="M8 26c8-10 14 10 24 0s16 10 24 0"/></svg>'),
]
guide_html = "".join(
  f'<article class="gcard"><div class="gicon">{ic}</div><h3>{esc(t)}</h3><p>{esc(s)}</p><p class="glinks">' +
  "".join(f'<a href="#{i}">{esc(n)} {ICON_ARROW}</a>' for i,n in links) + '</p></article>'
  for t,s,links,ic in guide)

faq = [
 ("Não sei qual kit escolher. E agora?", "Sem problema. Mande no WhatsApp uma foto da sacada (e do trilho, se puder) e as medidas do vidro. A gente indica a peça certa."),
 ("Vocês vendem roldana avulsa?", "Sim. Todas as roldanas são vendidas avulsas, não só em kit."),
 ("Enviam para fora de São Paulo?", "Sim. Enviamos para todo o Brasil em até 7 dias."),
 ("Tem preço especial para revenda?", "Tem. Temos tabela com descontos especiais para revenda. Peça a sua pelo WhatsApp."),
 ("Posso retirar na loja?", "Pode. Os produtos ficam à pronta entrega na nossa loja, no Ipiranga, em São Paulo. Atendimento de segunda a sexta, das 8h às 17h."),
 ("Como peço o preço de uma peça?", "Toque em “Pedir no WhatsApp” no produto. A conversa já abre com o nome da peça escrito, é só enviar."),
]
faq_html = "".join(f'<details class="qa"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in faq)

facts = [("Mais de 13 anos","no mercado vidreiro"),("Todo o Brasil","envio em até 7 dias"),("Roldanas avulsas","vendemos todas"),("Pronta entrega","na loja, em São Paulo")]
facts_html = "".join(f'<li><strong>{esc(a)}</strong><span>{esc(b)}</span></li>' for a,b in facts)

steps = [
 ("Escolha a peça","Veja o catálogo abaixo. Se não souber qual é, mande uma foto da sacada e as medidas."),
 ("Fale no WhatsApp","Toque no botão verde ou vinho. Atendimento de segunda a sexta, das 8h às 17h."),
 ("Receba em casa ou retire","Enviamos para todo o Brasil em até 7 dias. Em São Paulo, retire na loja."),
]
steps_html = "".join(f'<li><span class="num" aria-hidden="true">{i}</span><div><h3>{esc(t)}</h3><p>{esc(d)}</p></div></li>' for i,(t,d) in enumerate(steps,1))

msg_geral = "Olá, Vivace! Vim pelo site e gostaria de ajuda para escolher as peças."
ENDERECO = "Rua Lima e Silva 626A, Ipiranga, São Paulo - SP"
maps = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(ENDERECO)
rota = "https://www.google.com/maps/dir/?api=1&destination=" + urllib.parse.quote(ENDERECO)
embed = "https://www.google.com/maps?q=" + urllib.parse.quote(ENDERECO) + "&output=embed&hl=pt-BR"

LDJSON = json.dumps({
  "@context": "https://schema.org", "@type": "Store", "name": "Vivace",
  "description": "Acessórios para envidraçamento de sacada: roldanas, batentes, fechaduras, aparadores e acabamentos.",
  "url": SITE + "/", "telephone": "+55 11 99516-4432", "email": "acessorios@vivace.ind.br",
  "image": SITE + BASE + "assets/img/sacada-1800.webp",
  "address": {"@type": "PostalAddress", "streetAddress": "Rua Lima e Silva, 626a", "addressLocality": "São Paulo",
              "addressRegion": "SP", "addressNeighborhood": "Ipiranga", "addressCountry": "BR"},
  "openingHoursSpecification": [{"@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "08:00", "closes": "17:00"}],
}, ensure_ascii=False)

PAGE = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ece2cb">
<title>Vivace | Peças para sacada de vidro, feitas por vidraceiros</title>
<meta name="description" content="Roldanas, batentes, fechaduras, aparadores e acabamentos para sacada de vidro. Feitos por vidraceiros, para vidraceiros. Envio para todo o Brasil em até 7 dias. Peça pelo WhatsApp.">
<meta property="og:title" content="Vivace | Peças para sacada de vidro">
<meta property="og:description" content="Obras de arte, feitas à mão. Roldanas, batentes, fechaduras e acabamentos para sacada de vidro.">
<meta property="og:image" content="{SITE}{BASE}assets/img/sacada-1800.webp">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}{BASE}">
<meta property="og:locale" content="pt_BR">
<link rel="canonical" href="{SITE}{BASE}">
<meta name="robots" content="{ROBOTS}">
<link rel="icon" href="{BASE}favicon.svg" type="image/svg+xml">
<link rel="preload" as="image" href="{BASE}assets/img/sacada-1800.webp" imagesrcset="{BASE}assets/img/sacada-900.webp 900w, {BASE}assets/img/sacada-1800.webp 1800w" imagesizes="100vw" fetchpriority="high">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Pinyon+Script&family=Playfair+Display+SC:wght@400;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{BASE}style.css">
<script type="application/ld+json">{LDJSON}</script>
</head>
<body>
<a class="skip" href="#produtos">Pular para os produtos</a>

<header class="top" id="topo">
  <div class="wrap top-in">
    <a class="brand" href="#topo" aria-label="Vivace — início">
      <img class="logo-dark" src="{BASE}assets/img/logo.webp" width="700" height="160" alt="Vivace">
      <img class="logo-light" src="{BASE}assets/img/logo-claro.webp" width="700" height="160" alt="" aria-hidden="true">
    </a>
    <button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>
    <nav class="menu" id="menu" aria-label="Principal">
      <a href="#topo">Início</a>
      <a href="#entenda">Qual peça?</a>
      <a href="#produtos">Produtos</a>
      <a href="#como-comprar">Como comprar</a>
      <a href="#duvidas">Dúvidas</a>
      <a href="#contato" class="cta">Contato</a>
    </nav>
  </div>
  <noscript><style>.menu{{position:static!important;display:flex!important;flex-wrap:wrap;transform:none!important;background:none!important;padding:0 var(--gut) 8px!important;border:0!important}}.burger{{display:none!important}}.top{{position:absolute}}</style></noscript>
</header>

<main>
<section class="hero">
  <img class="hero-photo" src="{BASE}assets/img/sacada-1800.webp" srcset="{BASE}assets/img/sacada-900.webp 900w, {BASE}assets/img/sacada-1800.webp 1800w" sizes="100vw" width="1800" height="1199" alt="" fetchpriority="high">
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <p class="since">Desde 2012 · Ipiranga, São Paulo</p>
    <p class="script">Obras de arte, feitas à mão</p>
    <h1>Peças para a sua <em>sacada de vidro</em></h1>
    <p class="lead">Roldanas, batentes, fechaduras e acabamentos criados por vidraceiros, para vidraceiros.</p>
    <p class="lead-2">Não sabe qual peça você precisa? <strong>Mande uma foto no WhatsApp</strong> e a gente te ajuda a escolher.</p>
    <div class="hero-cta">
      <a class="btn btn-wine" href="{wa(msg_geral)}" target="_blank" rel="noopener">{ICON_WA}<span>Falar no WhatsApp</span></a>
      <a class="btn btn-green" href="#produtos"><span>Ver as peças</span>{ICON_ARROW}</a>
    </div>
  </div>
</section>
<div class="wrap"><ul class="facts">{facts_html}</ul></div>

<section class="guide" id="entenda" aria-labelledby="h-entenda">
  <div class="wrap">
    <header class="sec-head center">
      <p class="kicker">Comece por aqui</p>
      <h2 id="h-entenda">Qual peça eu preciso?</h2>
      <p>Escolha a situação que parece com a da sua sacada. A gente leva você até as peças certas.</p>
    </header>
    <div class="gguide">{guide_html}</div>
    <p class="guide-help">Ainda ficou na dúvida? <a href="{wa(msg_geral)}" target="_blank" rel="noopener">Mande uma foto e as medidas no WhatsApp</a>.</p>
  </div>
</section>

<section class="catalog" id="produtos" aria-labelledby="h-prod">
  <div class="wrap">
    <header class="sec-head center">
      <p class="kicker">Catálogo completo</p>
      <h2 id="h-prod">Todas as peças Vivace</h2>
      <p>{len(prods)} modelos. Toque em “Pedir no WhatsApp” e a conversa já abre com o nome da peça.</p>
    </header>
  </div>
  <div class="tools">
    <div class="wrap tools-in">
      <nav class="chips" aria-label="Categorias de produtos">{"".join(chips)}</nav>
      <label class="search"><span class="sr">Buscar peça</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="Buscar peça (ex.: siena, fechadura)" autocomplete="off">
      </label>
    </div>
  </div>
  <div class="wrap" id="lista">
    {"".join(sections)}
    <div class="empty" id="vazio" hidden>
      <p class="script">Não achou?</p>
      <p>Não encontramos essa peça no catálogo. Mande uma foto no WhatsApp que a gente procura para você.</p>
      <a class="btn btn-wine" href="{wa(msg_geral)}" target="_blank" rel="noopener">{ICON_WA}<span>Chamar no WhatsApp</span></a>
    </div>
  </div>
</section>

<section class="how" id="como-comprar" aria-labelledby="h-como">
  <div class="wrap">
    <header class="sec-head center">
      <p class="kicker">Simples e sem burocracia</p>
      <h2 id="h-como">Como comprar</h2>
    </header>
    <ol class="steps">{steps_html}</ol>
    <div class="perks">
      <p><strong>Roldanas avulsas</strong> — vendemos todas, não só em kit.</p>
      <p><strong>Revenda</strong> — tabela com descontos especiais.</p>
      <p><strong>Pronta entrega</strong> — na nossa loja, em São Paulo.</p>
    </div>
  </div>
</section>

<section class="legacy" aria-labelledby="h-legado">
  <div class="wrap legacy-grid">
    <figure class="plate portrait"><img src="{BASE}assets/img/raissa.webp" width="900" height="1244" alt="Desenho de Raíssa Mattenhauer, à frente da Vivace" loading="lazy" decoding="async"></figure>
    <div class="legacy-copy">
      <p class="kicker">Produtos criados de vidraceiros para vidraceiros</p>
      <h2 id="h-legado">Legado <span class="script big">Mattenhauer</span></h2>
      <p>A Vivace é referência nacional quando o assunto são acessórios para envidraçamento de sacada, pois nasceu, literalmente, dentro de uma empresa do ramo.</p>
      <p>A Vivace está há mais de 13 anos no mercado, construindo uma trajetória marcada por inovação, qualidade e compromisso com o setor vidreiro. Hoje, à frente da empresa está Raíssa, que deu continuidade ao legado de seu pai, reconhecido por seu espírito visionário e inovador no mercado.</p>
      <p>Com força e uma visão feminina moderna, Raíssa segue impulsionando a Vivace, desenvolvendo acessórios atuais e funcionais para atender às necessidades do vidraceiro com excelência.</p>
    </div>
  </div>
</section>

<section class="faq" id="duvidas" aria-labelledby="h-faq">
  <div class="wrap narrow">
    <header class="sec-head center">
      <p class="kicker">Perguntas frequentes</p>
      <h2 id="h-faq">Dúvidas comuns</h2>
    </header>
    {faq_html}
  </div>
</section>

<section class="contact" id="contato" aria-labelledby="h-contato">
  <div class="wrap contact-grid">
    <div class="contact-copy">
      <p class="kicker">Fale com a gente</p>
      <h2 id="h-contato">Vamos conversar?</h2>
      <p>Atendemos vidraçarias e revendas sem burocracia. Chame no WhatsApp ou venha à nossa loja.</p>
      <ul class="info">
        <li>{ICON_WA}<div><small>WhatsApp</small><a href="{wa(msg_geral)}" target="_blank" rel="noopener"><strong>11 99516-4432</strong></a></div></li>
        <li>{ICON_CLOCK}<div><small>Atendimento</small><strong>Segunda a sexta, das 8h às 17h</strong></div></li>
        <li>{ICON_PIN}<div><small>Loja</small><a href="{maps}" target="_blank" rel="noopener"><strong>Rua Lima e Silva, 626a — Ipiranga<br>São Paulo - SP</strong></a></div></li>
        <li>{ICON_MAIL}<div><small>E-mail</small><a href="mailto:acessorios@vivace.ind.br"><strong>acessorios@vivace.ind.br</strong></a></div></li>
      </ul>
      <div class="contact-cta">
        <a class="btn btn-wine" href="{wa(msg_geral)}" target="_blank" rel="noopener">{ICON_WA}<span>Chamar no WhatsApp</span></a>
        <a class="btn btn-ghost" href="tel:{TEL}">{ICON_TEL}<span>Ligar agora</span></a>
      </div>
    </div>
    <form class="form" id="form" novalidate>
      <h3>Prefere escrever aqui?</h3>
      <p class="note">Ao enviar, abrimos o seu WhatsApp com a mensagem pronta.</p>
      <div class="field"><label for="nome">Seu nome</label><input id="nome" name="nome" required autocomplete="name"></div>
      <div class="field"><label for="tel">Seu telefone (opcional)</label><input id="tel" name="tel" type="tel" inputmode="tel" autocomplete="tel"></div>
      <div class="field"><label for="msg">O que você precisa?</label><textarea id="msg" name="msg" rows="4" required placeholder="Ex.: preciso de roldanas para uma sacada com trilho triplo"></textarea></div>
      <button class="btn btn-wine btn-block" type="submit">{ICON_WA}<span>Enviar pelo WhatsApp</span></button>
      <p class="err" id="err" role="alert" hidden>Preencha seu nome e o que você precisa.</p>
    </form>
  </div>
  <div class="wrap map-wrap">
    <div class="map">
      <iframe title="Mapa: loja da Vivace, Rua Lima e Silva, 626a, Ipiranga, São Paulo" src="{embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    </div>
    <div class="map-cta">
      <p><strong>Nossa loja fica no Ipiranga.</strong> Rua Lima e Silva, 626a — São Paulo.</p>
      <a class="btn btn-green" href="{rota}" target="_blank" rel="noopener">{ICON_PIN}<span>Como chegar</span></a>
    </div>
  </div>
  <figure class="museu" aria-hidden="true"><img src="{BASE}assets/img/museu.webp" width="1600" height="1066" alt="" loading="lazy" decoding="async"></figure>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <img src="{BASE}assets/img/logo-claro.webp" width="700" height="160" alt="Vivace" loading="lazy">
    <p>Acessórios para envidraçamento de sacada · Rua Lima e Silva, 626a — Ipiranga, São Paulo</p>
    <p>© <span id="ano">2026</span> Vivace · vivace.ind.br</p>
  </div>
</footer>

<div class="mbar" role="region" aria-label="Contato rápido">
  <a class="btn btn-wine" href="{wa(msg_geral)}" target="_blank" rel="noopener">{ICON_WA}<span>Chamar no WhatsApp</span></a>
  <a class="btn btn-green" href="tel:{TEL}" aria-label="Ligar para a Vivace">{ICON_TEL}<span>Ligar</span></a>
</div>
<a class="wa-fab" href="{wa(msg_geral)}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">{ICON_WA}</a>

<script src="{BASE}main.js" defer></script>
</body>
</html>
'''

OUT.mkdir(parents=True, exist_ok=True)
(OUT/"index.html").write_text(PAGE, encoding="utf-8")
(OUT/"produtos.html").write_text(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Produtos | Vivace</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url={BASE}#produtos">
<link rel="canonical" href="{SITE}{BASE}#produtos"><meta name="robots" content="noindex">
</head><body><p><a href="{BASE}#produtos">Ver os produtos da Vivace</a></p>
<script>location.replace("{BASE}#produtos")</script></body></html>
''', encoding="utf-8")
for f in ("style.css", "main.js"):
    shutil.copy(HERE / f, OUT / f)
(OUT/"favicon.svg").write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7b1e2d"/><path d="M14 16h12l6 22 6-22h12L38 50H26z" fill="#f7f0df"/><path d="M8 52l48-6" stroke="#1f6b45" stroke-width="4" stroke-linecap="round"/></svg>''', encoding="utf-8")
if not ARGS.noindex:
    (OUT/"robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    (OUT/"sitemap.xml").write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{SITE}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url></urlset>
''', encoding="utf-8")
print("ok:", OUT, "base", BASE, "|", ROBOTS)
