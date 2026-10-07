#!/usr/bin/env bash
# Publica o site da Vivace no servidor oficial (vivace.ind.br) por SFTP.
#   1) gera o site (pasta dist/)  2) baixa um backup do que está no ar
#   3) envia o site novo          4) confere se o site responde
# A senha é pedida na hora pelo próprio sftp. Ela NÃO fica salva em nenhum arquivo.
# Uso:  ./deploy.sh
set -euo pipefail

HOST="187.77.50.154"
USUARIO="site"
PASTA_REMOTA="/public"
SITE="https://vivace.ind.br"

cd "$(dirname "$0")"

echo "==> 1/4 Gerando o site (dist/)"
python3 fonte/build.py

BACKUP="backups/site-no-ar-antes-de-$(date +%Y-%m-%d_%H%M)"
echo
echo "Vai publicar em $SITE (servidor $HOST, pasta $PASTA_REMOTA)."
echo "Antes, vou baixar uma cópia do que está no ar para: $BACKUP"
read -r -p "Continuar? [s/N] " resp
[[ "$resp" =~ ^[sS]$ ]] || { echo "Cancelado. Nada foi enviado."; exit 0; }

mkdir -p "$BACKUP"
echo
echo "==> 2/4 Backup  |  3/4 Envio   (o sftp vai pedir a senha do usuário '$USUARIO')"
sftp -oPreferredAuthentications=password,publickey -oPubkeyAuthentication=yes "$USUARIO@$HOST" <<EOF
lcd $BACKUP
get -r $PASTA_REMOTA .
lcd dist
cd $PASTA_REMOTA
put index.html
put produtos.html
put style.css
put main.js
put favicon.svg
put robots.txt
put sitemap.xml
put -r assets
ls -la
bye
EOF

echo
echo "==> 4/4 Conferindo o site no ar"
for p in / /style.css /produtos.html /assets/img/logo.webp /robots.txt; do
  printf "%-26s " "$SITE$p"; curl -s -o /dev/null -m 15 -w "%{http_code}\n" "$SITE$p" || echo "sem resposta"
done
echo
echo "Pronto. Abra $SITE no celular e no computador."
echo "Para desfazer: envie de volta o conteúdo de $BACKUP/public para $PASTA_REMOTA."
