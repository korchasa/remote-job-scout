# Software Requirements Specification

## System Overview

Web app for remote job search with AI analysis. Node.js runtime, Express.js backend, modular architecture.

## Functional Requirements

### FR-1: Settings ✅ COMPLETED

- **Purpose**: User-configurable search settings stored client-side, sent to server in single request
- **Usage**: User configures positions list, sources, language/country filters. Settings auto-restore from localStorage on reload. Search sends complete config once
- **Acceptance**:
  - Settings: positions list, blacklist items, selected sources
  - Supports language/country filters; countries as allowed values array
  - Persists to localStorage, auto-loads on app start
  - Search sends single consolidated request with current settings

### FR-2: Multi-Stage Search ✅ COMPLETED

- **Purpose**: 3-stage pipeline (Collect → Filter → Enrich) with HTTP polling progress, pause/resume, per-stage statistics
- **Usage**: User starts search from UI, monitors progress via polling, pauses collection, resumes later, views per-stage stats after completion. New search clears previous results before new data arrives
- **Acceptance**:
  - ✅ 3-stage pipeline with explicit transitions, states: pending, running, completed, failed, paused, skipped
  - ✅ Progress via REST API with HTTP polling, real-time UI display
  - ✅ Pause/Resume changes current stage state without data loss
  - ✅ New search clears previous client results before new session start
  - ✅ Statistics: per-stage breakdown incl. filtering results, enrichment metrics (see FR-4/FR-5)

### FR-3: Collection (Stage 1) ✅ COMPLETED

- **Purpose**: Multi-source vacancy collection with parallel processing, exponential backoff, YAML serialization, intermediate progress updates. Tracks token costs for LLM-based sources
- **Usage**: User enables Indeed, LinkedIn, OpenAI WebSearch sources. System processes requests in parallel with concurrency limits, retries on failures (429/403/network) using exponential backoff, writes YAML dumps, provides progress updates. LLM sources display token costs
- **Acceptance**:
  - ✅ Sources: Indeed GraphQL, LinkedIn, Glassdoor GraphQL, OpenAI WebSearch
  - ✅ Parallel processing with configurable concurrency limit
  - ✅ Exponential backoff retries with failure reason logging
  - ✅ Intermediate progress available, displayed in UI during execution
  - ✅ Collected vacancies serialized to YAML during processing
  - ✅ LLM sources track tokens/costs, aggregates shown in progress panel

### FR-4: Filtering (Stage 2)

- **Purpose**: Auto-filter collected vacancies by user rules (blacklist/whitelist) with detailed skip reason statistics
- **Usage**: Post-collection, system auto-triggers filtering within session, validates vacancies against settings (company blacklist, keywords, language, country whitelist), generates passed/rejected counters with skip reason breakdown
- **Acceptance**:
  - Filtering auto-starts after collection completion for current session
  - Applies current user settings: blacklist, title/language rules, country whitelist (string array)
  - Generates stage statuses, aggregated statistics
  - Skip reasons available: e.g., title_blacklisted_words, language_requirements, country_filter, company_blacklisted

### FR-5: Обогащение с помощью LLM (этап 3)

- Описание: Обогащение вакансий с использованием LLM (сейчас OpenAI), включая исследование компаний через веб-поиск, трекинг токенов/стоимости и источников обогащения, с корректной обработкой отсутствующих данных.
- Сценарий использования: Пользователь вводит API-ключ LLM на клиенте. Во время обогащения интерфейс отображает расход токенов и оценочную стоимость; при недоступности источников/ошибках обогащение для конкретной вакансии помечается как неудачное без остановки конвейера.
- Критерии приёмки:
  - Интеграция с LLM (сейчас OpenAI) выполняет текстовое обогащение и может использовать веб-поиск для исследования компаний.
  - Отслеживаются токены и стоимость на вакансию; агрегаты отображаются в панели прогресса.
  - Фиксируется источник(и) обогащения для вакансии.
  - Промежуточные результаты обновляются для UI в ходе этапа.

### FR-6: Управление вакансиями

- Описание: Современный адаптивный интерфейс для просмотра и управления вакансиями: карточки, детали, переходы на внешние ссылки, базовое управление чёрным списком, темы.
- Сценарий использования: Пользователь просматривает список карточек, открывает модальное окно с деталями, переходит по внешней ссылке на оригинальное объявление, управляет чёрным списком через доступные действия. Интерфейс корректно работает на мобильных и десктопах, поддерживает светлую/тёмную темы.
- Критерии приёмки:
  - Доступны список вакансий и модальное окно с деталями с плавной навигацией.
  - Внешние ссылки открываются в новой вкладке с безопасными атрибутами.
  - Базовые операции управления чёрным списком доступны в UI; серверные изменения выполняются через соответствующие API (если применимо на текущем этапе).
  - Интерфейс адаптивен, поддерживает переключение тем; выбор темы сохраняется.
  - Исключается избыточный трафик за счёт оптимизированного взаимодействия клиент-сервер.

### FR-7: Избранное

- Описание: Интерфейс для сохранения и просмотра избранных вакансий с действием «Добавить в избранное» и локальной персистентностью пользовательских пометок.
- Сценарий использования: Пользователь отмечает вакансию как избранную, просматривает список избранных на отдельном экране, при этом при блокировке, обновляются параметры поиска.
- Критерии приёмки:
  - Действие «Добавить в избранное» в карточке и в модальном окне.
  - Существует отдельный экран/вкладка «Избранное» со списком сохранённых вакансий.
  - Избранные вакансии персистируются локально (localStorage) и применяются при рендеринге.
  - При блокировке вакансии, ее работодатель добавляется в чёрный список и обновляются параметры поиска.

### FR-8: Сохранение и восстановление снимков сессии

- Описание: Сервер должен сохранять снимки сессий поиска (прогресс и результаты) в файловую систему и восстанавливать их при запуске.
- Сценарий использования: Пользователь запускает многоэтапный поиск; сервер неожиданно перезапускается; после перезапуска пользователь видит сессию с соответствующей меткой (завершена/приостановлена/остановлена) и может возобновить или просмотреть результаты.
- Критерии приёмки:
  - Снимки записываются в `data/sessions/<sessionId>.json` во время обработки и при переходе между этапами.
  - Клиент хранит сессии в localStorage и восстанавливает их при запуске.
  - При запуске сервера ранее завершённые сессии доступны для просмотра только для чтения; сессии в процессе восстанавливаются как остановленные/приостановленные без потери данных.
  - После восстановления не происходит дублирования обработки; возобновление продолжается с правильных границ этапов.

### FR-9: Расчёт и отображение ETA

- Описание: Система должна вычислять и отображать оценку оставшегося времени (ETA) для каждого этапа на основе скорости обработки и оставшегося объёма работы.
- Сценарий использования: Во время сбора из нескольких источников пользователь видит на панели мониторинга процент выполнения и ETA, который обновляется со временем.
- Критерии приёмки:
  - ETA рассчитывается по формуле `(всего - обработано) / скорость × 60` (в минутах) с сглаживанием для уменьшения скачков.
  - ETA и процент выполнения доступны через API и отображаются в интерфейсе прогресса.
  - Когда работа завершается, ETA становится 0, и этап немедленно переходит к следующему.

### FR-11: Сохранение действий на стороне клиента (скрытие/блокировка)

- Описание: Скрытие вакансий и блокировка работодателей хранятся и применяются только на клиенте и не отправляются на сервер.
- Сценарий использования: Пользователь скрывает вакансию и блокирует компанию; после перезагрузки страницы эти действия сохраняются через localStorage, а сервер не изменяется.
- Критерии приёмки:
  - localStorage хранит списки скрытых идентификаторов вакансий и заблокированных названий компаний.
  - заблокированные работодатели и скрытые вакансии отфильтровываются на стадии фильтрации.
  - пользователь может просмотреть список скрытых вакансий на отдельном экране, в коротком виде: название, работодатель, дата и кнопкой восстановления.
  - список скрытых вакансий передается на сервер в параметре запроса, с полями: работодатель, название вакансии.
  - после восстановления вакансии, она перестает отфильтровываться.

### FR-12: Валидация ввода на основе схем и ответы об ошибках

- Описание: Все серверные конечные точки должны проверять входные данные по схемам и возвращать стандартизированные ответы об ошибках при неудачной валидации.
- Сценарий использования: Отправляется некорректный запрос поиска; сервер отвечает ошибкой 400 с машинно-читаемым отчётом о валидации.
- Критерии приёмки:
  - Запросы к конечным точкам поиска, действий с вакансиями и настроек проверяются по схемам.
  - При неудаче ответы содержат HTTP 400 с `{ code, message, details }`, где `details` перечисляет ошибки по полям.
  - Корректные запросы передаются в бизнес-логику; некорректные не изменяют состояние.

### FR-13: Операционное логирование и аудит

- Описание: Система должна записывать структурированные логи для действий пользователя, переходов между этапами, повторных попыток и ошибок с маскировкой конфиденциальных данных.
- Сценарий использования: Оператор просматривает логи для анализа неудачного обогащения; в логах отображаются попытки, интервалы задержки и замаскированные API-ключи.
- Критерии приёмки:
  - Логи включают временные метки, идентификаторы сессий, названия этапов, количество попыток и краткие описания ошибок.
  - Секреты (например, ключи LLM) никогда не записываются в логи; маскировка проверяется в тестах.
  - Логи доступны во время разработки через консоль и могут направляться в файлы в Docker.

### FR-14: Обработка API-ключа LLM (только на клиенте)

- Описание: API-ключ LLM (сейчас OpenAI) хранится только на клиенте, передаётся с запросами обогащения и OpenAI WebSearch при необходимости и никогда не сохраняется и не логируется на сервере.
- Сценарий использования: Пользователь вводит API-ключ в интерфейсе; запускается обогащение; перезапуск сервера не сохраняет ключ; в логах сервера ключ не отображается.
- Критерии приёмки:
  - Ключ хранится в localStorage на клиенте и исключён из серверных слоёв хранения.
  - Сервер получает ключ только как часть операций обогащения и OpenAI WebSearch и не записывает его на диск или в логи.
  - Обогащение и OpenAI WebSearch работают с валидным ключом и корректно завершаются с понятными сообщениями при отсутствии или неверности ключа.

## Non-Functional Requirements

### Performance

- UI response < 1s
- 100 jobs processing < 10min
- Parallel request processing

### Reliability

- Graceful API unavailability handling
- Recovery after failures
- Comprehensive logging

### Security

- Input validation all levels
- SQL injection protection
- OpenAI API key client-side only

### Usability

- Intuitive interface
- Responsive design
- Light/dark themes
- Keyboard navigation

## Technical Specifications

### APIs & Integrations

- OpenAI API for LLM processing
- OpenAI WebSearch for global search
- Job scraping: Indeed GraphQL, LinkedIn, Glassdoor GraphQL
- JobSpy reference architecture

### Data Formats

- REST API communication
- JSON data exchange
- YAML job serialization
- HTTP polling for progress
- Express.js middleware

### Session Persistence

- Client: localStorage
- Server: filesystem

### UI/UX

- Modern responsive interface
- Shadcn/ui components
- Accessibility compliance
- Mobile-first design
- Real-time progress tracking

## Current Implementation

- ✅ Node.js 18+ + Express.js server with Zod validation
- ✅ React 19/TypeScript strict + Vite frontend
- ✅ 3-stage search pipeline (Collect → Filter → Enrich) with pause/resume ✅ COMPLETED
- ✅ 4 scrapers: Indeed GraphQL, LinkedIn, Glassdoor GraphQL, OpenAI WebSearch with retry/backoff
- ✅ Job UI with Shadcn/ui (47 components), filtering stats, progress dashboard
- ✅ Docker multi-stage build, development containers
- ✅ OpenAI API integration, token/cost tracking, company research
- ✅ TypeScript strict mode, type-safe schemas
- ✅ Vitest testing (85+ tests pass), React Testing Library
- ✅ ESLint/Prettier code quality, automated checks
- ✅ CLI workflow (`./run` commands)
- ✅ YAML serialization, filesystem session persistence, localStorage client settings
- ✅ HTTP polling, real-time progress, ETA calculation
