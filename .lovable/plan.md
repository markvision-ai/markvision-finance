# План: серверная часть для Telegram-бота

Бот (n8n / отдельный сервис) будет дергать наши эндпоинты вместо самописных SQL. Вся логика, валидация, AI-резолверы и отправка сообщений в Telegram — на нашей стороне.

## 1. Инфраструктура

- Подключить коннектор **Telegram** (`standard_connectors--connect`) — нужен `TELEGRAM_API_KEY` для отправки ответов и уведомлений.
- Убедиться, что включён Lovable AI Gateway (`LOVABLE_API_KEY` уже есть) — используем `google/gemini-2.5-flash` для парсинга текста и резолва сущностей.
- Общий секрет `BOT_SHARED_SECRET` (HMAC) — бот подписывает каждый запрос, мы проверяем подпись. Добавим через `secrets--add_secret`.
- Хелперы в `src/lib/bot/`:
  - `verify-signature.ts` — проверка HMAC.
  - `resolve-user.ts` — `chat_id → user_id` через существующую `get_user_by_chat_id`.
  - `ai.ts` — обёртка над AI Gateway с JSON-схемами.
  - `tg.ts` — `sendMessage` через connector gateway.

## 2. Эндпоинты `/api/public/bot/*` (TanStack server routes)

Каждый: POST, HMAC-проверка, Zod-валидация, резолв user_id, понятный JSON-ответ + опционально текст для отправки в чат.

**Красный блок ТЗ (закрывает 100%):**

| Route | Что делает |
|---|---|
| `POST /api/public/bot/parse` | Универсальный AI-парсер: принимает `{chat_id, text}` → возвращает `{intent, payload}` (expense / income / debt_payment / goal_contribution / create_debt / create_goal / task / todo / close_task / reschedule_task / status_query). Бот сам решает, какой следующий эндпоинт дернуть, либо вызывает `/execute`. |
| `POST /api/public/bot/execute` | Принимает `{chat_id, intent, payload}` → выполняет соответствующий INSERT/UPDATE, возвращает текст для ответа. Внутри маршрутизирует на хелперы ниже. |
| `POST /api/public/bot/income` | INSERT в `incomes` (amount, client_name, category_id?, received_at). AI-категоризация по описанию. |
| `POST /api/public/bot/debt-payment` | AI-резолвер: текст «по ипотеке 30к» → выбирает `debt_id` из активных `debts` пользователя по эмбеддингу/нечёткому совпадению. INSERT в `debt_payments` (триггер сам уменьшит остаток). |
| `POST /api/public/bot/goal-contribution` | AI-резолвер цели → INSERT в `goal_contributions` (триггер обновит `current_amount`). |
| `POST /api/public/bot/create-debt` | Парсит «новый кредит на машину 1.8млн на 5 лет» → INSERT в `debts` (kind, name, initial_amount, current_balance, monthly_payment, end_date). |
| `POST /api/public/bot/create-goal` | «цель квартира 5млн к декабрю 2027» → INSERT в `goals`. |

**Жёлтый блок (удобство):**

| Route | Что делает |
|---|---|
| `POST /api/public/bot/close-task` | AI находит `tasks.id` по описанию → `UPDATE status='done'`. |
| `POST /api/public/bot/reschedule-task` | Находит задачу, парсит новую дату → `UPDATE starts_at/ends_at`. (GCal patch — позже, если будет интеграция.) |
| `POST /api/public/bot/status-query` | «сколько потратил сегодня», «остаток по ипотеке», «сколько до цели X» → SQL агрегаты → текстовый ответ. |

**Cron-эндпоинты (тоже под `/api/public/bot/`):**

| Route | Расписание | Что делает |
|---|---|---|
| `POST /api/public/bot/cron/weekly-report` | Вс 19:00 (`0 19 * * 0`) | По каждому `telegram_users` собирает: расходы/доходы за неделю, % бюджета по категориям, прогресс целей → шлёт в TG. |
| `POST /api/public/bot/cron/payment-reminders` | Ежедневно 10:00 (`0 10 * * *`) | Находит `debts` с `monthly_payment` и датой платежа в окне -3 дня → шлёт «не забудь внести 25000 по ипотеке». |
| `POST /api/public/bot/cron/anomaly-alerts` | Ежечасно (`0 * * * *`) | Сравнивает сегодняшние траты по категории со средним за 30 дней; если >2× — шлёт алерт. |

Cron заводится через `pg_cron` + `pg_net` с `apikey` заголовком (анонимный ключ) — миграция отдельно.

**Зелёный блок (по желанию, во вторую очередь):**

- `POST /api/public/bot/receipt` — принимает URL фото из Telegram, Gemini Vision парсит сумму/категорию/дату → INSERT в `expenses`. Реализуем после красного/жёлтого.
- Повторяющиеся задачи и подключение банка — оставляем за рамками первой итерации (банковский webhook требует отдельных партнёрств).

## 3. AI-резолверы

Один общий хелпер `resolveEntity({userId, kind, text})` в `src/lib/bot/resolve.ts`:

1. Тянет список активных сущностей пользователя (`debts`, `goals`, `tasks`).
2. Передаёт в Gemini короткий JSON: `[{id, name, description}]` + запрос пользователя.
3. Возвращает `{id, confidence}`. Если confidence < 0.6 — бот просит уточнить.

Для парсинга сумм («1.8млн», «30к», «25 000 ₽») — детерминированная функция `parseAmount.ts` (без AI, быстрее и предсказуемее).

## 4. Безопасность

- HMAC SHA-256: `signature = hmac(BOT_SHARED_SECRET, timestamp + "." + body)`. Заголовки `x-bot-signature`, `x-bot-timestamp`. Окно ±5 мин.
- Cron-эндпоинты проверяют `apikey === SUPABASE_ANON_KEY` (стандартный паттерн pg_cron).
- Zod-валидация всех тел (`amount: number().positive().max(1e10)`, `text: string().max(2000)`).
- Никаких PII в ответах cron-эндпоинтов — только то, что и так есть у владельца чата.
- Используем `supabaseAdmin` внутри (бот ходит без пользовательской сессии), но всё фильтруется по `user_id`, полученному из `get_user_by_chat_id`.

## 5. Структура файлов

```
src/
├── routes/api/public/bot/
│   ├── parse.ts
│   ├── execute.ts
│   ├── income.ts
│   ├── debt-payment.ts
│   ├── goal-contribution.ts
│   ├── create-debt.ts
│   ├── create-goal.ts
│   ├── close-task.ts
│   ├── reschedule-task.ts
│   ├── status-query.ts
│   └── cron/
│       ├── weekly-report.ts
│       ├── payment-reminders.ts
│       └── anomaly-alerts.ts
└── lib/bot/
    ├── verify-signature.ts
    ├── resolve-user.ts
    ├── resolve.ts        # AI-резолвер сущностей
    ├── parse-amount.ts
    ├── ai.ts             # обёртка Lovable AI
    └── tg.ts             # sendMessage через connector gateway
```

## 6. Миграция

Одна миграция: включить `pg_cron` + `pg_net`, завести 3 cron-задачи на наши URL. Новых таблиц не нужно — схема уже всё покрывает.

## 7. Очерёдность работ (после approve)

1. Подключить Telegram connector + добавить `BOT_SHARED_SECRET`.
2. Сделать хелперы (`verify-signature`, `resolve-user`, `ai`, `tg`, `parse-amount`, `resolve`).
3. Эндпоинты красного блока (`income`, `debt-payment`, `goal-contribution`, `create-debt`, `create-goal`) + универсальные `parse` / `execute`.
4. Эндпоинты жёлтого блока (`close-task`, `reschedule-task`, `status-query`).
5. Cron-эндпоинты + миграция с pg_cron.
6. Smoke-тест каждого через `invoke-server-function` (с валидной подписью).
7. (Опционально) `receipt` с Vision.

## Что остаётся за бортом первой итерации

- Сам код n8n / Telegram-бота — он в другом репозитории, я только готовлю API.
- Подключение Тинькофф/Сбер — нет публичного API трат для физлиц.
- GCal patch при `reschedule-task` — добавим, когда подключим Google Calendar connector.
- Multi-user/совместный бюджет — RLS позволяет, но нужен отдельный UX (приглашения, общий `household_id`).
