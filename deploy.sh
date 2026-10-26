#!/usr/bin/env bash
# ============================================================
# Деплой статических файлов сайта на сервер по SSH (scp).
# Один раз заполните три переменные ниже — дальше просто: bash deploy.sh
# ============================================================

SERVER_USER=""    # пользователь на сервере, например: root
SERVER_HOST=""    # адрес сервера, например: 203.0.113.10 или mysite.ru
SERVER_PATH=""    # папка сайта на сервере, например: /var/www/qrweb

# Файлы, которые уезжают на сервер (config.js — реальный, со ссылкой СБП)
FILES=(index.html style.css app.js config.js)

if [ -z "$SERVER_USER" ] || [ -z "$SERVER_HOST" ] || [ -z "$SERVER_PATH" ]; then
  echo "Заполните SERVER_USER / SERVER_HOST / SERVER_PATH в начале deploy.sh"
  exit 1
fi

if [ ! -f config.js ]; then
  echo "config.js не найден. Скопируйте образец и вставьте ссылку СБП:"
  echo "    cp config.example.js config.js"
  exit 1
fi

echo "Деплой на ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH} ..."
ssh "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${SERVER_PATH}'" || exit 1

for f in "${FILES[@]}"; do
  scp "$f" "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/" || exit 1
  echo "  ок: $f"
done

echo "Готово. Если меняли файлы — поднимите номер версии ?v= в index.html."
