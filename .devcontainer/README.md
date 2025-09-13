# Dev Container Configuration

Этот dev-container обеспечивает единообразную среду разработки для проекта Remote Job Scout.

## Требования

- Docker Desktop
- VS Code с расширением "Dev Containers"
- Git

## Быстрый старт

1. Откройте проект в VS Code
2. Нажмите `Ctrl+Shift+P` (или `Cmd+Shift+P` на Mac)
3. Выберите "Dev Containers: Reopen in Container"
4. Дождитесь сборки контейнера и установки зависимостей

## Что включено

### Расширения VS Code

- TypeScript и JavaScript поддержка
- ESLint для проверки кода
- Prettier для форматирования
- Tailwind CSS IntelliSense
- React snippets
- Docker поддержка
- Test Explorer

### Системные зависимости

- Node.js 18
- Git
- Bash
- cURL
- OpenSSH

### Глобальные npm пакеты

- TypeScript
- tsx
- nodemon
- @types/node

## Порты

- **3000** - Frontend (React)
- **3001** - Backend (Express)

## Команды разработки

После открытия в контейнере используйте:

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
./run dev

# Проверка кода
./run check

# Форматирование кода
./run format

# Запуск тестов
./run test
```

## Переменные окружения

Скопируйте `.devcontainer/dev.env.example` в `.env` и настройте под свои нужды.

## Устранение проблем

### Контейнер не запускается

1. Убедитесь, что Docker Desktop запущен
2. Проверьте, что порты 3000 и 3001 свободны
3. Пересоберите контейнер: "Dev Containers: Rebuild Container"

### Зависимости не устанавливаются

1. Удалите `node_modules` и `package-lock.json`
2. Пересоберите контейнер
3. Проверьте подключение к интернету

### Проблемы с производительностью

1. Увеличьте память для Docker Desktop
2. Используйте `.dockerignore` для исключения ненужных файлов
3. Проверьте настройки файловой системы Docker

## Интеграция с GitHub Codespaces

Этот dev-container также работает в GitHub Codespaces без дополнительной настройки.
