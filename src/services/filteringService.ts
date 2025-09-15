/**
 * Filtering Service (FR-4: Filtering Stage 2)
 *
 * Этот сервис реализует вторую стадию многоэтапного поиска вакансий - автоматическую фильтрацию
 * собранных вакансий по пользовательским правилам. Отвечает за применение черных списков,
 * фильтров по странам, требованиям к языкам и другим критериям.
 *
 * Основная ответственность:
 * - Автоматический запуск после завершения стадии сбора
 * - Применение пользовательских настроек фильтрации
 * - Генерация детальной статистики причин пропуска вакансий
 * - Интеграция с мульти-стейдж оркестратором для обновления прогресса
 *
 * Связанные компоненты:
 * - MultiStageSearchOrchestrator: вызывает фильтрацию после сбора
 * - FilteringStatsDashboard: отображает результаты фильтрации в UI
 * - SettingsService: предоставляет настройки фильтрации
 */

import type { SearchRequest, Vacancy } from '../types/database.js';

/**
 * Результат фильтрации вакансий
 * Содержит отфильтрованные и пропущенные вакансии с детальной статистикой
 */
export interface FilteringResult {
  /** Успешно ли прошла фильтрация */
  success: boolean;
  /** Вакансии, прошедшие фильтрацию */
  filteredVacancies: Vacancy[];
  /** Вакансии, пропущенные из-за фильтров */
  skippedVacancies: Vacancy[];
  /** Общее количество обработанных вакансий */
  totalProcessed: number;
  /** Количество прошедших фильтрацию */
  filteredCount: number;
  /** Количество пропущенных */
  skippedCount: number;
  /** Статистика причин пропуска по категориям */
  reasons: { [reason: string]: number };
  /** Ошибки, возникшие во время фильтрации */
  errors: string[];
}

/**
 * Сервис фильтрации вакансий по пользовательским правилам
 *
 * Реализует FR-4: Filtering (Stage 2) - автоматическую фильтрацию после сбора вакансий.
 * Применяет все активные фильтры пользователя и генерирует детальную статистику.
 */
export class FilteringService {
  /**
   * Выполняет фильтрацию вакансий по настройкам пользователя
   *
   * Основной метод FR-4, который:
   * 1. Обрабатывает каждую вакансию через серию фильтров
   * 2. Собирает статистику причин пропуска
   * 3. Возвращает разделенные списки прошедших/пропущенных вакансий
   *
   * @param vacancies - Список вакансий для фильтрации
   * @param settings - Настройки пользователя с фильтрами
   * @returns Результат фильтрации с детальной статистикой
   */
  filterVacancies(vacancies: Vacancy[], settings: SearchRequest['settings']): FilteringResult {
    const result: FilteringResult = {
      success: true,
      filteredVacancies: [],
      skippedVacancies: [],
      totalProcessed: vacancies.length,
      filteredCount: 0,
      skippedCount: 0,
      reasons: {},
      errors: [],
    };

    try {
      console.log(`🔍 Starting filtering of ${vacancies.length} vacancies`);

      for (const vacancy of vacancies) {
        const filterResult = this.shouldIncludeVacancy(vacancy, settings);

        if (filterResult.include) {
          result.filteredVacancies.push({
            ...vacancy,
            status: 'filtered',
            filtered_at: new Date().toISOString(),
          });
          result.filteredCount++;
        } else {
          result.skippedVacancies.push({
            ...vacancy,
            status: 'skipped',
            skip_reason: filterResult.reason,
            filtered_at: new Date().toISOString(),
          });
          result.skippedCount++;

          // Считаем причины пропуска
          const reason = filterResult.reason ?? 'unknown';
          result.reasons[reason] = (result.reasons[reason] ?? 0) + 1;
        }
      }

      console.log(
        `✅ Filtering completed: ${result.filteredCount} passed, ${result.skippedCount} skipped`,
      );

      if (Object.keys(result.reasons).length > 0) {
        console.log('📊 Skip reasons:', result.reasons);
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      console.error('❌ Filtering failed:', error);
      return result;
    }
  }

  /**
   * Проверяет, должна ли вакансия быть включена в результаты
   *
   * Применяет серию фильтров в порядке приоритета:
   * 1. Черный список компаний (высокий приоритет)
   * 2. Запрещенные слова в названии
   * 3. Запрещенные слова в описании
   * 4. Фильтр по странам (whitelist)
   * 5. Требования к языкам
   *
   * @param vacancy - Вакансия для проверки
   * @param settings - Настройки фильтрации
   * @returns Объект с решением о включении и причиной пропуска
   */
  private shouldIncludeVacancy(
    vacancy: Vacancy,
    settings: SearchRequest['settings'],
  ): { include: boolean; reason?: string } {
    // 1. Проверка черного списка компаний
    if (this.isCompanyBlacklisted(vacancy, settings.filters.blacklistedCompanies)) {
      return { include: false, reason: 'company_blacklisted' };
    }

    // 2. Проверка черного списка слов в названии
    if (this.containsBlacklistedWords(vacancy.title, settings.filters.blacklistedWordsTitle)) {
      return { include: false, reason: 'title_blacklisted_words' };
    }

    // 3. Проверка черного списка слов в описании
    if (
      this.containsBlacklistedWords(
        vacancy.description,
        settings.filters.blacklistedWordsDescription,
      )
    ) {
      return { include: false, reason: 'description_blacklisted_words' };
    }

    // 4. Проверка фильтров по странам
    if (!this.matchesCountryFilter(vacancy, settings.filters.countries || [])) {
      return { include: false, reason: 'country_filter' };
    }

    // 5. Проверка требований к языкам
    if (!this.matchesLanguageRequirements(vacancy, settings.filters.languages)) {
      return { include: false, reason: 'language_requirements' };
    }

    return { include: true };
  }

  /**
   * Проверяет, находится ли компания в черном списке
   *
   * Извлекает название компании из дополнительных данных вакансии
   * и проверяет на совпадение с любым элементом черного списка (без учета регистра).
   *
   * @param vacancy - Вакансия для проверки
   * @param blacklistedCompanies - Массив названий компаний в черном списке
   * @returns true если компания в черном списке
   */
  private isCompanyBlacklisted(vacancy: Vacancy, blacklistedCompanies: string[]): boolean {
    if (!blacklistedCompanies || blacklistedCompanies.length === 0) {
      return false;
    }

    const vacancyData = this.parseVacancyData(vacancy);
    const companyName =
      typeof vacancyData.company === 'string' ? vacancyData.company.toLowerCase() : '';

    return blacklistedCompanies.some((blacklisted) =>
      companyName.includes(blacklisted.toLowerCase()),
    );
  }

  /**
   * Проверяет наличие запрещенных слов в тексте
   *
   * Выполняет поиск каждого запрещенного слова в тексте без учета регистра.
   * Используется для фильтрации по названию и описанию вакансий.
   *
   * @param text - Текст для проверки (название или описание вакансии)
   * @param blacklistedWords - Массив запрещенных слов
   * @returns true если найдено хотя бы одно запрещенное слово
   */
  private containsBlacklistedWords(text: string, blacklistedWords: string[]): boolean {
    if (!blacklistedWords || blacklistedWords.length === 0) {
      return false;
    }

    const lowerText = text.toLowerCase();
    return blacklistedWords.some((word) => lowerText.includes(word.toLowerCase()));
  }

  /**
   * Проверяет соответствие фильтрам по странам (whitelist)
   *
   * Реализует whitelist-подход: если указаны разрешенные страны,
   * вакансия должна соответствовать хотя бы одной из них.
   * Если список пустой - разрешает все страны.
   *
   * @param vacancy - Вакансия для проверки
   * @param allowedCountries - Массив разрешенных стран (whitelist)
   * @returns true если страна вакансии в whitelist или whitelist пустой
   */
  private matchesCountryFilter(vacancy: Vacancy, allowedCountries: string[]): boolean {
    if (!allowedCountries || allowedCountries.length === 0) {
      return true; // If no countries specified, allow all
    }

    const vacancyCountry = vacancy.country?.toLowerCase() ?? '';

    // Check if vacancy country is in the whitelist
    return allowedCountries.some((allowedCountry) =>
      vacancyCountry.includes(allowedCountry.toLowerCase()),
    );
  }

  /**
   * Проверяет соответствие требованиям к языкам
   *
   * Для простоты реализации проверяет наличие английского языка в требованиях
   * и ищет соответствующие ключевые слова в названии и описании вакансии.
   *
   * В будущем можно расширить для поддержки других языков и уровней владения.
   *
   * @param vacancy - Вакансия для проверки
   * @param languageRequirements - Массив языковых требований с уровнем
   * @returns true если требования выполнены или отсутствуют
   */
  private matchesLanguageRequirements(
    vacancy: Vacancy,
    languageRequirements: Array<{ language: string; level: string }>,
  ): boolean {
    if (!languageRequirements || languageRequirements.length === 0) {
      return true;
    }

    // Для простоты - если есть требования к языкам, проверяем наличие английского
    // В будущем можно реализовать более сложную логику анализа описания вакансии
    const hasEnglishRequirement = languageRequirements.some(
      (req) => req.language.toLowerCase() === 'english',
    );

    if (hasEnglishRequirement) {
      const text = (vacancy.title + ' ' + vacancy.description).toLowerCase();
      // Простая проверка на наличие указаний на английский язык
      return text.includes('english') || text.includes('fluent') || text.includes('proficient');
    }

    return true;
  }

  /**
   * Парсит дополнительные данные вакансии из JSON
   *
   * Безопасно парсит JSON-строку из поля vacancy.data.
   * Возвращает пустой объект при ошибках парсинга для устойчивости системы.
   *
   * @param vacancy - Вакансия с данными в формате JSON
   * @returns Распарсенный объект с дополнительными данными или пустой объект
   */
  private parseVacancyData(vacancy: Vacancy): Record<string, unknown> {
    try {
      // Парсим дополнительные данные вакансии, хранящиеся в JSON формате
      return vacancy.data ? JSON.parse(vacancy.data) : {};
    } catch {
      // При ошибке парсинга возвращаем пустой объект для продолжения работы
      return {};
    }
  }
}
