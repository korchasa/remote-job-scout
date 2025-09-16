/**
 * Client-Side Filtering Utilities (FR-11: Client-Side Job Actions)
 *
 * Этот модуль предоставляет функции для фильтрации вакансий на стороне клиента
 * на основе действий пользователя (скрытые вакансии и заблокированные компании).
 * Фильтрация применяется после получения данных от сервера, обеспечивая
 * персонализированный вид списка вакансий.
 *
 * Основная ответственность:
 * - Фильтрация скрытых вакансий по идентификатору
 * - Фильтрация вакансий заблокированных компаний по названию
 * - Комбинированная фильтрация с учётом обоих типов действий
 * - Статистика отфильтрованных элементов
 *
 * Связанные компоненты:
 * - JobListView: использует функции для отображения отфильтрованного списка
 * - useClientJobActions: предоставляет данные о действиях пользователя
 * - MainDashboard: координирует фильтрацию перед отображением
 */

import type { JobPost, HiddenJob, BlockedCompany } from '../../../shared/schema.ts';

/**
 * Результаты клиентской фильтрации
 * Содержит отфильтрованные вакансии и статистику скрытых элементов
 */
export interface ClientSideFilteringResult {
  /** Вакансии, прошедшие клиентскую фильтрацию */
  filteredJobs: JobPost[];
  /** Вакансии, скрытые из-за действий пользователя */
  hiddenJobs: JobPost[];
  /** Статистика по причинам скрытия */
  stats: {
    totalHidden: number;
    hiddenByAction: number;
    hiddenByCompany: number;
  };
}

/**
 * Фильтрует вакансии на основе скрытых вакансий
 *
 * Проверяет каждый идентификатор вакансии на совпадение со списком
 * скрытых вакансий пользователя.
 *
 * @param jobs - Список вакансий для фильтрации
 * @param hiddenJobs - Список скрытых вакансий пользователя
 * @returns Отфильтрованные вакансии и статистика
 */
export function filterHiddenJobs(
  jobs: JobPost[],
  hiddenJobs: HiddenJob[],
): { filtered: JobPost[]; hidden: JobPost[] } {
  const hiddenJobIds = new Set(hiddenJobs.map((job) => job.jobId));

  const filtered: JobPost[] = [];
  const hidden: JobPost[] = [];

  for (const job of jobs) {
    if (hiddenJobIds.has(job.id)) {
      hidden.push(job);
    } else {
      filtered.push(job);
    }
  }

  return { filtered, hidden };
}

/**
 * Фильтрует вакансии на основе заблокированных компаний
 *
 * Проверяет название компании каждой вакансии на совпадение со списком
 * заблокированных компаний пользователя (без учёта регистра).
 *
 * @param jobs - Список вакансий для фильтрации
 * @param blockedCompanies - Список заблокированных компаний пользователя
 * @returns Отфильтрованные вакансии и статистика
 */
export function filterBlockedCompanies(
  jobs: JobPost[],
  blockedCompanies: BlockedCompany[],
): { filtered: JobPost[]; blocked: JobPost[] } {
  const blockedCompanyNames = new Set(
    blockedCompanies.map((company) => company.companyName.toLowerCase()),
  );

  const filtered: JobPost[] = [];
  const blocked: JobPost[] = [];

  for (const job of jobs) {
    if (blockedCompanyNames.has(job.company.toLowerCase())) {
      blocked.push(job);
    } else {
      filtered.push(job);
    }
  }

  return { filtered, blocked };
}

/**
 * Применяет полную клиентскую фильтрацию к списку вакансий
 *
 * Комбинирует фильтрацию по скрытым вакансиям и заблокированным компаниям,
 * обеспечивая комплексное применение всех клиентских фильтров пользователя.
 *
 * @param jobs - Исходный список вакансий
 * @param hiddenJobs - Список скрытых вакансий пользователя
 * @param blockedCompanies - Список заблокированных компаний пользователя
 * @returns Полный результат фильтрации с детальной статистикой
 */
export function applyClientSideFiltering(
  jobs: JobPost[],
  hiddenJobs: HiddenJob[],
  blockedCompanies: BlockedCompany[],
): ClientSideFilteringResult {
  // Сначала фильтруем скрытые вакансии
  const { filtered: afterHiddenFilter, hidden: hiddenByAction } = filterHiddenJobs(
    jobs,
    hiddenJobs,
  );

  // Затем фильтруем заблокированные компании
  const { filtered: finalFiltered, blocked: hiddenByCompany } = filterBlockedCompanies(
    afterHiddenFilter,
    blockedCompanies,
  );

  return {
    filteredJobs: finalFiltered,
    hiddenJobs: [...hiddenByAction, ...hiddenByCompany],
    stats: {
      totalHidden: hiddenByAction.length + hiddenByCompany.length,
      hiddenByAction: hiddenByAction.length,
      hiddenByCompany: hiddenByCompany.length,
    },
  };
}

/**
 * Проверяет, скрыта ли конкретная вакансия действиями пользователя
 *
 * Утилитарная функция для быстрой проверки статуса вакансии без
 * необходимости в полном процессе фильтрации.
 *
 * @param job - Вакансия для проверки
 * @param hiddenJobs - Список скрытых вакансий
 * @param blockedCompanies - Список заблокированных компаний
 * @returns true если вакансия должна быть скрыта
 */
export function isJobHiddenByClient(
  job: JobPost,
  hiddenJobs: HiddenJob[],
  blockedCompanies: BlockedCompany[],
): boolean {
  // Проверяем, скрыта ли вакансия напрямую
  const isHidden = hiddenJobs.some((hidden) => hidden.jobId === job.id);
  if (isHidden) return true;

  // Проверяем, заблокирована ли компания
  const isCompanyBlocked = blockedCompanies.some(
    (blocked) => blocked.companyName.toLowerCase() === job.company.toLowerCase(),
  );

  return isCompanyBlocked;
}

/**
 * Получает причины скрытия вакансии
 *
 * Анализирует все возможные причины скрытия конкретной вакансии
 * и возвращает детальный список причин. Приоритет отдается
 * прямому скрытию вакансии над блокировкой компании.
 *
 * @param job - Вакансия для анализа
 * @param hiddenJobs - Список скрытых вакансий
 * @param blockedCompanies - Список заблокированных компаний
 * @returns Массив причин скрытия вакансии (максимум 1 причина для приоритета)
 */
export function getJobHiddenReasons(
  job: JobPost,
  hiddenJobs: HiddenJob[],
  blockedCompanies: BlockedCompany[],
): string[] {
  // Приоритет прямому скрытию вакансии
  const hiddenJob = hiddenJobs.find((hidden) => hidden.jobId === job.id);
  if (hiddenJob) {
    return [`Hidden (${hiddenJob.hiddenReason})`];
  }

  // Если не скрыта напрямую, проверяем блокировку компании
  const blockedCompany = blockedCompanies.find(
    (blocked) => blocked.companyName.toLowerCase() === job.company.toLowerCase(),
  );
  if (blockedCompany) {
    return [`Company blocked (${blockedCompany.reason})`];
  }

  return [];
}
