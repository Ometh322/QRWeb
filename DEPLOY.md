# Деплой на ВМ вручную (через git)

Репозиторий публичный — клонировать на сервер можно без авторизации.
Реальный `config.js` со ссылкой СБП в git не входит, поэтому создаётся
на сервере один раз и **не перезатирается** при обновлениях через `git pull`.

## Первичная установка (один раз)

```bash
# 1. Подключение к ВМ (с вашей машины)
ssh -l ubuntu 84.252.133.90

# 2. nginx и git (если ещё не установлены)
sudo apt update
sudo apt install -y nginx git

# 3. Папка сайта + клон репозитория
sudo mkdir -p /var/www/qrweb
sudo chown $USER: /var/www/qrweb
git clone https://github.com/Ometh322/QRWeb.git /var/www/qrweb

# 4. Конфиг со ссылкой СБП
cd /var/www/qrweb
cp config.example.js config.js
nano config.js        # вставьте ссылку в SBP_QR_LINK="..." и сохраните (Ctrl+O, Enter, Ctrl+X)

# 5. Направляем nginx на папку сайта
sudo nano /etc/nginx/sites-available/default
#    найдите строку:  root /var/www/html;
#    замените на:     root /var/www/qrweb;

# 6. Проверка и перезагрузка nginx
sudo nginx -t
sudo systemctl reload nginx

# 7. Проверка
curl -s http://localhost/ | head -5
```

Сайт должен открыться по адресу http://84.252.133.90/

Если страница не открывается снаружи, а `curl localhost` работает — файрвол:

```bash
sudo ufw status
# если active:
sudo ufw allow 'Nginx Full'
```

## Обновление сайта (все последующие разы)

После `git push` на вашей машине — на сервере одна команда:

```bash
cd /var/www/qrweb && git pull
```

Или вообще не заходя на сервер, с локальной машины:

```bash
ssh -l ubuntu 84.252.133.90 "cd /var/www/qrweb && git pull"
```

`config.js` не входит в репозиторий, поэтому `git pull` никогда его
не перезапишет — ссылка СБП живёт только на сервере.

Если меняли `style.css` / `app.js` / `config.js` — поднимите номер версии
`?v=` в `index.html` (см. README), иначе браузеры посетителей оставят старую копию.

## Возможные проблемы

| Симптом | Причина / решение |
|---|---|
| `git pull` ругается на локальные изменения | Кто-то правил файлы из репозитория прямо на сервере: `git status`, затем `git checkout -- <файл>` |
| Страница «Welcome to nginx» | Не заменили `root` в `/etc/nginx/sites-available/default` |
| 403 Forbidden | Проверьте, что `root` указывает на папку с `index.html` |
| Сайт работает по localhost, но не снаружи | Порт 80 закрыт: правило в security group облака + `sudo ufw allow 'Nginx Full'` |
