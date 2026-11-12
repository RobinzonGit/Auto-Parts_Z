# Auto Parts — склад автозапчастей (MVP)

Клиентское SPA-приложение для учёта автозапчастей на складе: каталог с поиском и фото,
запросы на закупку, роли «Пользователь / Модератор / Администратор», кнопка-облачко
для поиска в интернете в Google или Яндекс (только для администратора).

**Без бэкенда.** Все данные хранятся в браузере: метаданные и аккаунты — в
`localStorage`, фото запчастей — в `IndexedDB`. Приложение работает как обычный
HTML/JS-проект в Visual Studio Code и разворачивается на Netlify или в Docker.

---

## Возможности

- Регистрация и вход (bcrypt-хэши паролей, сессия в localStorage).
- Каталог запчастей: поиск по наименованию/артикулу/ячейке, фильтр по статусу, пагинация.
- Карточка запчасти с фото, ценой (авторасчёт или ручное переопределение), ячейкой склада.
- Запросы на закупку: пользователь отправляет, модератор меняет статусы, админ удаляет.
- Импорт позиций из CSV/JSON с валидацией каждой строки.
- **Поиск в интернете (кнопка-облачко, только администратор):** поиск по наименованию
  и(или) артикулу с выбором поисковой системы — Google или Яндекс (подробнее ниже).
- Тёмная/светлая тема (переключатель в AppBar), русский интерфейс.
- Клиентское логирование: `window.__autopartsLogger.dump()` в консоли браузера.

## Технологии

| Слой | Технология |
| --- | --- |
| UI | React 18 + TypeScript (strict), Material UI v5, React Router v6 |
| Состояние | Zustand |
| Формы и валидация | React Hook Form + Zod |
| Хранилище | localStorage (структурированные данные) + IndexedDB (фото) |
| Пароли | bcryptjs (хэшируется в браузере) |
| Сборка | Vite 5 |
| Деплой | Netlify / Docker (nginx) |

## Быстрый старт (VS Code)

1. Установите [Node.js 18+](https://nodejs.org) (рекомендуется 20 LTS).
2. Откройте папку проекта в VS Code.
3. В интегрированном терминале (`Ctrl+\``):

```bash
npm install
npm run dev
```

4. Откройте http://localhost:5173 .

## npm-скрипты

| Скрипт | Назначение |
| --- | --- |
| `npm run dev` | Дев-сервер Vite с HMR |
| `npm run build` | Проверка типов (`tsc --noEmit`) + сборка в `dist/` |
| `npm run preview` | Локальный просмотр production-сборки |
| `npm run lint` | ESLint |
| `npm run format` | Prettier по каталогу `src` |

## Тестовые учётные записи

Создаются автоматически при первом запуске (если база пуста):

| Роль | Email | Пароль |
| --- | --- | --- |
| Администратор | `admin@autoparts.local` | `Admin123!` |
| Модератор | `moderator@autoparts.local` | `Moder123!` |
| Пользователь | `user@autoparts.local` | `User123!` |

Также создаются 10 тестовых запчастей и 3 запроса на закупку.

## Роли и права

| Действие | user | moderator | admin |
| --- | :-: | :-: | :-: |
| Каталог, поиск, карточки | + | + | + |
| Запросы на закупку (создание, отмена своих) | + | + | + |
| Профиль, смена пароля | + | + | + |
| CRUD запчастей, импорт CSV/JSON | — | + | + |
| Просмотр всех запросов, смена статусов | — | + | + |
| Просмотр списка пользователей | — | + | + |
| **Кнопка-облачко: поиск в интернете** | — | — | **+** |
| Назначение ролей, удаление пользователей | — | — | + |
| Удаление запросов | — | — | + |

Защита двухуровневая: маршруты (`ProtectedRoute`) и сами репозитории
(`requireRole`) проверяют права независимо друг от друга.

---

## Поиск в интернете: кнопка-облачко (только администратор)

**Где находится кнопка.** Значок-облачко (`CloudOutlined`) отображается у администратора:

- в AppBar (шапка приложения) — доступен глобально;
- на странице «Каталог запчастей» — в заголовке и в каждой строке таблицы
  (с предзаполнением наименования и артикула выбранной позиции);
- в карточке запчасти;
- в разделе «Управление запчастями».

**Как работает.**

1. Нажатие открывает диалог «Поиск в интернете».
2. Поля «Наименование» и/или «Артикул» — достаточно заполнить хотя бы одно
   (проверяется Zod-схемой `webSearchSchema`).
3. Выбор поисковой системы: **Google** или **Яндекс** (переключатель).
   Выбранная система запоминается в `localStorage` (`autoparts.webSearch.engine`).
4. Кнопка «Открыть в Google/Яндекс» формирует URL и открывает новую вкладку:
   - Google: `https://www.google.com/search?q=<наименование + артикул>`
   - Яндекс: `https://yandex.ru/search/?text=<наименование + артикул>`

**Ключевые файлы.**

- `src/utils/webSearch.ts` — сборка запроса/URL и открытие вкладки;
- `src/features/search/schemas.ts` — Zod-схема формы и проверка роли admin;
- `src/components/web-search/WebSearchButton.tsx` — кнопка-облачко (рендерится только при `role === 'admin'`);
- `src/components/web-search/WebSearchDialog.tsx` — диалог поиска.

**Безопасность.** Вкладка открывается с `noopener,noreferrer`; строка запроса
чистится от управляющих символов; кнопка скрыта для остальных ролей, а в
диалоге есть повторная проверка роли (защита от подделки DOM). Данные при этом
не покидают браузер — приложение лишь формирует ссылку во внешнюю систему.

---

## Структура проекта

```
auto-parts/
├── index.html                    # Корневая HTML-страница (lang="ru")
├── package.json / tsconfig.json / vite.config.ts
├── netlify.toml                  # Сборка + SPA-редирект для Netlify
├── Dockerfile / nginx.conf       # Контейнеризация (nginx + SPA fallback)
├── .env.example                  # Заготовка VITE_FIREBASE_* для будущего перехода
├── public/
└── src/
    ├── components/               # UI-компоненты
    │   ├── AppLayout.tsx         # AppBar + Drawer + снекбар
    │   ├── ProtectedRoute.tsx / GuestRoute.tsx
    │   ├── DataTable.tsx / ConfirmDialog.tsx / FormTextField.tsx …
    │   ├── web-search/           # Кнопка-облачко и диалог веб-поиска
    │   ├── component/            # Форма создания/редактирования запчасти
    │   └── request/              # Диалог запроса на закупку
    ├── pages/                    # Страницы (в т.ч. admin/)
    ├── features/                 # Zod-схемы и утилиты доменов
    │   ├── auth/ components/ requests/
    │   └── search/               # Схема и права для веб-поиска
    ├── services/                 # Слой данных (репозитории)
    │   ├── repositories/         # Интерфейсы + Local-реализации
    │   ├── storage/              # localDb (localStorage) и photoStore (IndexedDB)
    │   ├── seed.ts               # Демо-данные при первом запуске
    │   └── index.ts              # Единая точка выбора реализаций
    ├── store/                    # Zustand-сторы (auth, components, requests, ui)
    ├── hooks/                    # useAuth, useComponents, useRequests, …
    ├── theme/                    # MUI-тема (light/dark)
    ├── types/                    # Доменные типы (Component, User, Request…)
    ├── utils/                    # webSearch, calc, format, image, logger…
    ├── router/index.tsx          # Карта маршрутов
    ├── App.tsx / main.tsx
    └── vite-env.d.ts
```

## Хранение данных

- `localStorage`, ключ `autoparts.db` — пользователи (с bcrypt-хэшами), сессии,
  запчасти (без фото), запросы. Поле `schemaVersion` контролирует совместимость:
  при несовместимой версии данные сбрасываются с предупреждением.
- `IndexedDB`, база `autoparts-photos` — фото запчастей (data URL) по id позиции.
  Фото вынесено в IndexedDB, чтобы не упереться в квоту localStorage (~5 МБ).
- Выбранная тема — `autoparts.theme`, последняя поисковая система — `autoparts.webSearch.engine`.

**Сброс данных (отладка):** в консоли браузера выполните
`localStorage.clear(); indexedDB.deleteDatabase('autoparts-photos'); location.reload();`
— при следующем запуске сидирование создаст демо-данные заново.

## Импорт из CSV/JSON

Раздел «Запчасти» → «Импорт». Первая строка CSV — заголовки; разделитель `;` или `,`
определяется автоматически. Поддерживаются русские альтернативы колонок
(наименование, артикул, закупка, наценка, ячейка, количество…). Пример:

```csv
name;article;purchasePrice;markupPercent;warehouseCell;quantity;note
Колодки тормозные передние;BP-4521;1850;30;A-01-02;10;Для Toyota Camry
Фильтр масляный;OF-310;420;35;A-02-01;40
```

Каждая строка валидируется Zod-схемой; ошибки выводятся построчно и такие строки
пропускаются. Цена при импорте всегда рассчитывается из закупки и наценки.

---

## Сборка и деплой

### Netlify

**Вариант 1 — Git.** Подключите репозиторий: Build command `npm run build`,
Publish directory `dist`. Файл `netlify.toml` уже настроен (включая SPA-редирект).

**Вариант 2 — перетаскиванием.** Выполните `npm run build` и перетащите папку
`dist` на [app.netlify.com/drop](https://app.netlify.com/drop).

### Docker

```bash
docker build -t auto-parts .
docker run --rm -p 8080:80 auto-parts
```

Откройте http://localhost:8080 . Внутри — multi-stage сборка (node:20-alpine →
nginx:alpine) с настроенным SPA-fallback (`nginx.conf`).

---

## Переход на Firebase (подготовлен)

Архитектура отделена от реализации: UI общается только с интерфейсами
репозиториев, а реализация выбирается в одном файле — `src/services/index.ts`.

1. `npm install firebase` и заполните `.env` по образцу `.env.example`
   (`VITE_FIREBASE_*`).
2. Создайте каталог `src/services/firebase/` и реализуйте классы, повторяющие
   интерфейсы из `src/services/repositories/`:
   - `FirebaseAuthRepository implements AuthRepository` — Firebase Auth
     (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword` …),
     роли — через custom claims (`admin`, `moderator`);
   - `FirebaseComponentRepository implements ComponentRepository` — коллекция
     `components` в Firestore, фото — Firebase Storage;
   - `FirebaseRequestRepository implements RequestRepository` — коллекция `requests`.
3. Замените реализации в `src/services/index.ts`:
   ```ts
   export const repositories: Repositories = {
     auth: new FirebaseAuthRepository(),
     components: new FirebaseComponentRepository(),
     requests: new FirebaseRequestRepository(),
   };
   ```
4. Правила Firestore (пример, роли через custom claims):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function role() {
      return request.auth != null
        ? request.auth.token.role
        : '';
    }
    match /components/{id} {
      allow read: if request.auth != null;
      allow write: if role() in ['moderator', 'admin'];
    }
    match /requests/{id} {
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid || role() in ['moderator', 'admin']);
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if role() in ['moderator', 'admin'];
    }
    match /users/{id} {
      allow read: if request.auth != null && role() in ['moderator', 'admin'];
      allow update: if request.auth != null && request.auth.uid == request.resource.id;
    }
  }
}
```

## Безопасность на клиенте

- Пароли никогда не хранятся в открытом виде — только bcrypt-хэш.
- Все вводимые данные валидируются Zod-схемами (формы) и повторно в репозиториях.
- Внешние ссылки открываются с `rel="noopener noreferrer"` / `noopener,noreferrer`;
  поле `searchUrl` принимает только http/https.
- Фото: проверка MIME (`image/*`) и размера (до 2 МБ), сжатие перед сохранением.
- Кнопка-облачко доступна только роли admin (скрытие в UI + проверка в логике).

## Архитектурные решения (отступления и уточнения ТЗ)

1. **Фото хранятся в IndexedDB**, а в `localStorage` остаётся только признак
   `hasPhoto` — иначе квота localStorage исчерпывается уже на десятке фото.
2. **Email не редактируется** в профиле MVP (идентификатор входа), меняется имя и пароль.
3. **Пользователь не может удалить чужой запрос** — только отменить свой новый;
   удаление доступно администратору (в ТЗ не уточнено, выбран наиболее безопасный вариант).
4. **Запросы не изменяют остатки склада** — это запросы на закупку, не списание.
5. Цены в каталоге видны всем авторизованным; закупочная цена и наценка — только staff.
6. Регистрация автоматически выполняет вход под новой учётной записью.

## Ограничения MVP

- Данные живут в конкретном браузере (нет синхронизации между устройствами).
- Роли и права проверяются только на клиенте — при переходе на Firebase
  они дублируются правилами безопасности сервера.
- Восстановление пароля по email отсутствует.
- Блок «Тестовые аккаунты» на странице входа — только для демо; уберите его
  перед боевым использованием.
