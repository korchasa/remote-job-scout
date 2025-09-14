import type { UserSettings } from '../types/settings';
import { DEFAULT_USER_SETTINGS } from '../types/settings';

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
  clear?(): void;
}

/**
 * Сервис для управления пользовательскими настройками поиска вакансий.
 * Предоставляет методы для загрузки, сохранения и валидации настроек.
 */
export class SettingsService {
  private static readonly STORAGE_KEY = 'remoteJobScout_settings';

  private static getLocalStorage(): LocalStorageLike | null {
    try {
      type GlobalWithLocalStorage = { localStorage?: LocalStorageLike };
      const g = globalThis as unknown as GlobalWithLocalStorage;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Загружает настройки или возвращает настройки по умолчанию.
   * @returns Пользовательские настройки
   */
  static loadSettings(): UserSettings {
    const ls = this.getLocalStorage();
    if (!ls) {
      return { ...DEFAULT_USER_SETTINGS };
    }

    try {
      const raw = ls.getItem(this.STORAGE_KEY);
      if (!raw) {
        const defaults = { ...DEFAULT_USER_SETTINGS };
        this.saveSettings(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw) as UserSettings;
      const validated = this.validateSettings(parsed);
      this.saveSettings(validated);
      return validated;
    } catch {
      const defaults = { ...DEFAULT_USER_SETTINGS };
      try {
        const safe = this.getLocalStorage();
        if (safe) safe.setItem(this.STORAGE_KEY, JSON.stringify(defaults));
      } catch {}
      return defaults;
    }
  }

  /**
   * Сохраняет настройки в localStorage (если доступен), с предварительной валидацией.
   * @param settings Настройки для сохранения
   */
  static saveSettings(settings: UserSettings): void {
    const validated = this.validateSettings(settings);
    const ls = this.getLocalStorage();
    if (ls) {
      try {
        ls.setItem(this.STORAGE_KEY, JSON.stringify(validated));
      } catch (error) {
        console.error('❌ Failed to save settings to localStorage:', error);
      }
    } else {
      // окружение без localStorage — только валидация
    }
  }

  /**
   * Сбрасывает настройки к значениям по умолчанию.
   */
  static resetToDefaults(): UserSettings {
    const defaults = { ...DEFAULT_USER_SETTINGS };
    this.saveSettings(defaults);
    return defaults;
  }

  /**
   * Обновляет отдельные поля настроек.
   * @param updates Частичные обновления настроек
   * @returns Обновленные настройки
   */
  static updateSettings(updates: Partial<UserSettings>): UserSettings {
    const currentSettings = this.loadSettings();
    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...updates,
      filters: {
        ...currentSettings.filters,
        ...(updates.filters ?? {}),
      },
      sources: {
        ...currentSettings.sources,
        ...(updates.sources ?? {}),
      },
      llm: {
        ...currentSettings.llm,
        ...(updates.llm ?? {}),
      },
    };
    this.saveSettings(updatedSettings);
    return updatedSettings;
  }

  /**
   * Валидирует и нормализует настройки.
   * @param settings Настройки для валидации
   * @returns Валидированные настройки
   */
  private static validateSettings(settings: UserSettings): UserSettings {
    const validated: UserSettings = { ...settings } as UserSettings;

    if (!Array.isArray(validated.searchPositions)) {
      validated.searchPositions = DEFAULT_USER_SETTINGS.searchPositions;
    } else {
      validated.searchPositions = validated.searchPositions
        .filter((pos) => typeof pos === 'string' && pos.trim().length > 0)
        .map((pos) => pos.trim());
    }

    if (!validated.filters || typeof validated.filters !== 'object') {
      validated.filters = { ...DEFAULT_USER_SETTINGS.filters };
    } else {
      validated.filters = { ...validated.filters } as UserSettings['filters'];

      ['blacklistedCompanies', 'blacklistedWordsTitle', 'blacklistedWordsDescription'].forEach(
        (key) => {
          const filterKey = key as keyof typeof validated.filters;
          const currentValue = validated.filters[filterKey] as unknown;

          if (!Array.isArray(currentValue)) {
            (validated.filters as Record<string, unknown>)[key] = [];
          } else {
            (validated.filters as Record<string, unknown>)[key] = (currentValue as unknown[])
              .filter(
                (item: unknown): item is string =>
                  typeof item === 'string' && item.trim().length > 0,
              )
              .map((item: string) => item.trim());
          }
        },
      );

      if (!Array.isArray(validated.filters.countries)) {
        validated.filters.countries = [];
      } else {
        validated.filters.countries = validated.filters.countries
          .filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
          .map((item: unknown) => (item as string).trim());
      }

      if (!Array.isArray(validated.filters.languages)) {
        validated.filters.languages = [];
      } else {
        validated.filters.languages = validated.filters.languages
          .filter((item: unknown) => {
            const lang = item as Record<string, unknown>;
            return (
              lang &&
              typeof lang === 'object' &&
              typeof (lang.language as unknown) === 'string' &&
              (lang.language as string).trim().length > 0
            );
          })
          .map((item) => {
            const lang = item as { language: string; level?: string };
            return {
              language: lang.language.trim(),
              level: (lang.level as string) || 'Intermediate',
            };
          });
      }
    }

    if (!validated.sources || typeof validated.sources !== 'object') {
      validated.sources = { ...DEFAULT_USER_SETTINGS.sources };
    } else {
      validated.sources = { ...validated.sources } as UserSettings['sources'];

      if (!Array.isArray(validated.sources.jobSites)) {
        validated.sources.jobSites = DEFAULT_USER_SETTINGS.sources.jobSites;
      } else {
        validated.sources.jobSites = validated.sources.jobSites
          .filter((site) => typeof site === 'string' && site.trim().length > 0)
          .map((site) => site.trim());
      }

      if (
        (validated.sources as UserSettings['sources']).openaiWebSearch &&
        typeof (validated.sources as UserSettings['sources']).openaiWebSearch === 'object'
      ) {
        const ow = (validated.sources as UserSettings['sources']).openaiWebSearch!;
        if (typeof ow.apiKey !== 'string') {
          ow.apiKey = '';
        }
        if (!Array.isArray(ow.searchSites)) {
          ow.searchSites = DEFAULT_USER_SETTINGS.sources.openaiWebSearch?.searchSites ?? [];
        }
      }
    }

    if (!validated.llm || typeof validated.llm !== 'object') {
      validated.llm = { ...DEFAULT_USER_SETTINGS.llm };
    } else {
      validated.llm = { ...validated.llm } as UserSettings['llm'];
      if (!Array.isArray(validated.llm.enrichmentInstructions)) {
        validated.llm.enrichmentInstructions = DEFAULT_USER_SETTINGS.llm.enrichmentInstructions;
      }
      if (!Array.isArray(validated.llm.processingRules)) {
        validated.llm.processingRules = DEFAULT_USER_SETTINGS.llm.processingRules;
      }
    }

    return validated;
  }
}
