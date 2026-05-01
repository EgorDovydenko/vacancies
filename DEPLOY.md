# Деплой на VPS (Ubuntu/Debian)

## 1. Установи Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 2. Скопируй проект на сервер

```bash
git clone <repo-url> /home/ubuntu/vacancies-bot
cd /home/ubuntu/vacancies-bot
npm install
npm run build
```

## 3. Настрой .env

```bash
cp .env.example .env
nano .env   # заполни токены
```

## 4. Запусти как системный сервис (systemd)

```bash
sudo cp vacancies-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vacancies-bot
sudo systemctl start vacancies-bot

# Проверить статус
sudo systemctl status vacancies-bot

# Посмотреть логи
journalctl -u vacancies-bot -f
```

## 5. Обновление бота

```bash
cd /home/ubuntu/vacancies-bot
git pull
npm install
npm run build
sudo systemctl restart vacancies-bot
```

---

## Дёшево запустить на облаке

| Платформа         | Цена      | Замечание                      |
| ----------------- | --------- | ------------------------------ |
| **Railway.app**   | $5/мес    | Простейший деплой через GitHub |
| **Render.com**    | $7/мес    | Background Worker              |
| **Fly.io**        | ~$2/мес   | Маленький инстанс              |
| **VPS (Hetzner)** | €4/мес    | Полный контроль                |
| **VPS (Beget)**   | 190 ₽/мес | Если платишь рублями           |

> Для Railway: просто подключи GitHub-репо, добавь переменные окружения в UI — и всё запустится само.
