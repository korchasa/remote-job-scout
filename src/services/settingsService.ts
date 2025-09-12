import { DEFAULT_USER_SETTINGS, UserSettings } from "../types/settings.ts";

/**
 * Сервис для управления пользовательскими настройками поиска вакансий.
 * Предоставляет методы для загрузки, сохранения и валидации настроек.
 */
export class SettingsService {
  private static readonly STORAGE_KEY = "remoteJobScout_settings";

  /**
   * Загружает настройки из localStorage или возвращает настройки по умолчанию.
   * @returns Пользовательские настройки
   */
  static loadSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_USER_SETTINGS };
      }

      const parsed = JSON.parse(stored);

      // Простая валидация структуры
      if (!this.isValidSettings(parsed)) {
        console.warn(
          "⚠️  Invalid settings structure in localStorage, using defaults",
        );
        return { ...DEFAULT_USER_SETTINGS };
      }

      return parsed;
    } catch (error) {
      console.error("❌ Error loading settings from localStorage:", error);
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  /**
   * Сохраняет настройки в localStorage.
   * @param settings Настройки для сохранения
   */
  static saveSettings(settings: UserSettings): void {
    try {
      const validatedSettings = this.validateSettings(settings);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validatedSettings));
    } catch (error) {
      console.error("❌ Error saving settings to localStorage:", error);
      throw new Error("Failed to save settings");
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
    const updatedSettings = { ...currentSettings, ...updates };
    this.saveSettings(updatedSettings);
    return updatedSettings;
  }

  /**
   * Проверяет валидность массива стран.
   * @param countries Массив для проверки
   * @returns true если массив содержит валидные объекты стран
   */
  private static isValidCountryArray(countries: unknown): boolean {
    if (!Array.isArray(countries)) return false;
    return countries.every((country: unknown) =>
      country && typeof country === "object" &&
      typeof (country as Record<string, unknown>).name === "string" &&
      ["blacklist", "whitelist"].includes(
        (country as Record<string, unknown>).type as string,
      )
    );
  }

  /**
   * Проверяет валидность массива языков.
   * @param languages Массив для проверки
   * @returns true если массив содержит валидные объекты языков
   */
  private static isValidLanguageArray(languages: unknown): boolean {
    if (!Array.isArray(languages)) return false;
    return languages.every((lang: unknown) =>
      lang && typeof lang === "object" &&
      typeof (lang as Record<string, unknown>).language === "string" &&
      typeof (lang as Record<string, unknown>).level === "string"
    );
  }

  /**
   * Проверяет валидность структуры настроек.
   * @param settings Настройки для проверки
   * @returns true если настройки валидны
   */
  private static isValidSettings(settings: unknown): settings is UserSettings {
    const obj = settings as Record<string, unknown>;
    return Boolean(
      obj &&
        typeof obj === "object" &&
        Array.isArray(obj.searchPositions) &&
        obj.filters &&
        typeof obj.filters === "object" &&
        Array.isArray(
          (obj.filters as Record<string, unknown>).blacklistedCompanies,
        ) &&
        Array.isArray(
          (obj.filters as Record<string, unknown>).blacklistedWordsTitle,
        ) &&
        Array.isArray(
          (obj.filters as Record<string, unknown>).blacklistedWordsDescription,
        ) &&
        Array.isArray((obj.filters as Record<string, unknown>).countries) &&
        Array.isArray((obj.filters as Record<string, unknown>).languages) &&
        this.isValidCountryArray(
          (obj.filters as Record<string, unknown>).countries,
        ) &&
        this.isValidLanguageArray(
          (obj.filters as Record<string, unknown>).languages,
        ) &&
        obj.sources &&
        typeof obj.sources === "object" &&
        Array.isArray((obj.sources as Record<string, unknown>).jobSites) &&
        obj.llm &&
        typeof obj.llm === "object" &&
        Array.isArray(
          (obj.llm as Record<string, unknown>).enrichmentInstructions,
        ) &&
        Array.isArray((obj.llm as Record<string, unknown>).processingRules),
    );
  }

  /**
   * Валидирует и нормализует настройки.
   * @param settings Настройки для валидации
   * @returns Валидированные настройки
   */
  private static validateSettings(settings: UserSettings): UserSettings {
    const validated = { ...settings };

    // Валидация searchPositions
    if (!Array.isArray(validated.searchPositions)) {
      validated.searchPositions = DEFAULT_USER_SETTINGS.searchPositions;
    } else {
      validated.searchPositions = validated.searchPositions
        .filter((pos) => typeof pos === "string" && pos.trim().length > 0)
        .map((pos) => pos.trim());
    }

    // Валидация filters
    if (!validated.filters || typeof validated.filters !== "object") {
      validated.filters = { ...DEFAULT_USER_SETTINGS.filters };
    } else {
      validated.filters = { ...validated.filters };

      // Валидация массивов строк в filters
      [
        "blacklistedCompanies",
        "blacklistedWordsTitle",
        "blacklistedWordsDescription",
      ].forEach((key) => {
        const filterKey = key as keyof typeof validated.filters;
        const currentValue = validated.filters[filterKey];

        if (!Array.isArray(currentValue)) {
          (validated.filters as Record<string, unknown>)[key] = [];
        } else {
          (validated.filters as Record<string, unknown>)[key] = currentValue
            .filter((item: unknown): item is string =>
              typeof item === "string" && item.trim().length > 0
            )
            .map((item: string) => item.trim());
        }
      });

      // Валидация countries
      if (!Array.isArray(validated.filters.countries)) {
        validated.filters.countries = [];
      } else {
        validated.filters.countries = validated.filters.countries
          .filter((item: unknown) => {
            const country = item as Record<string, unknown>;
            return country &&
              typeof country === "object" &&
              typeof country.name === "string" &&
              country.name.trim().length > 0 &&
              typeof country.type === "string" &&
              ["blacklist", "whitelist"].includes(country.type);
          })
          .map((item) => {
            const country = item as {
              name: string;
              type: "blacklist" | "whitelist";
            };
            return {
              name: country.name.trim(),
              type: country.type,
            };
          });
      }

      // Валидация languages
      if (!Array.isArray(validated.filters.languages)) {
        validated.filters.languages = [];
      } else {
        validated.filters.languages = validated.filters.languages
          .filter((item: unknown) => {
            const lang = item as Record<string, unknown>;
            return lang &&
              typeof lang === "object" &&
              typeof lang.language === "string" &&
              lang.language.trim().length > 0;
          })
          .map((item) => {
            const lang = item as { language: string; level: string };
            return {
              language: lang.language.trim(),
              level: lang.level || "Intermediate",
            };
          });
      }
    }

    // Валидация sources
    if (!validated.sources || typeof validated.sources !== "object") {
      validated.sources = { ...DEFAULT_USER_SETTINGS.sources };
    } else {
      validated.sources = { ...validated.sources };

      if (!Array.isArray(validated.sources.jobSites)) {
        validated.sources.jobSites = DEFAULT_USER_SETTINGS.sources.jobSites;
      } else {
        validated.sources.jobSites = validated.sources.jobSites
          .filter((site) => typeof site === "string" && site.trim().length > 0)
          .map((site) => site.trim());
      }

      // Валидация OpenAI WebSearch config
      if (
        validated.sources.openaiWebSearch &&
        typeof validated.sources.openaiWebSearch === "object"
      ) {
        if (typeof validated.sources.openaiWebSearch.apiKey !== "string") {
          validated.sources.openaiWebSearch.apiKey = "";
        }
        if (!Array.isArray(validated.sources.openaiWebSearch.searchSites)) {
          validated.sources.openaiWebSearch.searchSites =
            DEFAULT_USER_SETTINGS.sources.openaiWebSearch?.searchSites || [];
        }
      }
    }

    // Валидация LLM
    if (!validated.llm || typeof validated.llm !== "object") {
      validated.llm = { ...DEFAULT_USER_SETTINGS.llm };
    } else {
      validated.llm = { ...validated.llm };

      if (!Array.isArray(validated.llm.enrichmentInstructions)) {
        validated.llm.enrichmentInstructions =
          DEFAULT_USER_SETTINGS.llm.enrichmentInstructions;
      }
      if (!Array.isArray(validated.llm.processingRules)) {
        validated.llm.processingRules =
          DEFAULT_USER_SETTINGS.llm.processingRules;
      }
    }

    return validated;
  }
}
