import { defineConfig } from 'vitest/config';
import os from 'node:os';

const cpuCount = os.cpus()?.length ?? 2;
const envMax = Number.parseInt(process.env.VITEST_MAX_THREADS || '', 10);
const maxThreads =
  Number.isFinite(envMax) && envMax > 0 ? envMax : Math.max(2, Math.floor(cpuCount / 2));

export default defineConfig({
  test: {
    // Настраиваем окружение для тестирования React компонентов
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Запускаем тестовые файлы параллельно в пулах потоков (threads)
    pool: 'threads',
    poolOptions: {
      threads: {
        // Минимум 1 поток, максимум половина доступных ядер (можно переопределить VITEST_MAX_THREADS)
        minThreads: 1,
        maxThreads,
      },
    },
    // По умолчанию параллелим тестовые файлы; внутри файла тесты идут последовательно, если не указано иначе
    sequence: {
      concurrent: true,
      shuffle: false,
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'references/**',
      // Исключаем интеграционные тесты из основного запуска
      'src/**/*.integration.{test,spec}.ts',
      'tests/integration/**/*.{test,spec}.ts',
    ],
    testTimeout: 10000,
  },
});
