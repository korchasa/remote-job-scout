import { defineConfig } from 'vitest/config';
import os from 'node:os';

const cpuCount = os.cpus()?.length ?? 2;
const envMax = Number.parseInt(process.env.VITEST_MAX_THREADS || '', 10);
const maxThreads =
  Number.isFinite(envMax) && envMax > 0 ? envMax : Math.max(1, Math.floor(cpuCount / 4)); // Меньше потоков для интеграционных тестов

export default defineConfig({
  test: {
    // Интеграционные тесты запускаем с меньшим параллелизмом из-за сетевых запросов
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads,
      },
    },
    // Последовательный запуск для интеграционных тестов
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    include: ['tests/integration/**/*.{test,spec}.ts', 'src/**/*.integration.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'references/**'],
    testTimeout: 60000, // Увеличенный таймаут для интеграционных тестов
    retry: 2, // Повтор неудачных тестов
    slowTestThreshold: 10000, // Порог для медленных тестов
  },
});
