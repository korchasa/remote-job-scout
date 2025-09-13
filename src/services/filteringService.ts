/**
 * Filtering Service
 * Выполняет предварительную фильтрацию вакансий по настройкам пользователя
 */

import type { SearchRequest, Vacancy } from '../types/database.js';

export interface FilteringResult {
  success: boolean;
  filteredVacancies: Vacancy[];
  skippedVacancies: Vacancy[];
  totalProcessed: number;
  filteredCount: number;
  skippedCount: number;
  reasons: { [reason: string]: number };
  errors: string[];
}

export class FilteringService {
  /**
   * Выполняет фильтрацию вакансий по настройкам пользователя
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
    if (!this.matchesCountryFilter(vacancy, settings.filters.countries)) {
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
   */
  private containsBlacklistedWords(text: string, blacklistedWords: string[]): boolean {
    if (!blacklistedWords || blacklistedWords.length === 0) {
      return false;
    }

    const lowerText = text.toLowerCase();
    return blacklistedWords.some((word) => lowerText.includes(word.toLowerCase()));
  }

  /**
   * Проверяет соответствие фильтрам по странам
   */
  private matchesCountryFilter(
    vacancy: Vacancy,
    countryFilters: Array<{ name: string; type: 'blacklist' | 'whitelist' }>,
  ): boolean {
    if (!countryFilters || countryFilters.length === 0) {
      return true;
    }

    const vacancyCountry = vacancy.country?.toLowerCase() ?? '';

    for (const filter of countryFilters) {
      const filterCountry = filter.name.toLowerCase();

      if (filter.type === 'blacklist' && vacancyCountry.includes(filterCountry)) {
        return false;
      }

      if (filter.type === 'whitelist' && !vacancyCountry.includes(filterCountry)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Проверяет соответствие требованиям к языкам
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
   */
  private parseVacancyData(vacancy: Vacancy): Record<string, unknown> {
    try {
      return vacancy.data ? JSON.parse(vacancy.data) : {};
    } catch {
      return {};
    }
  }
}
