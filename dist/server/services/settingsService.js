import { DEFAULT_USER_SETTINGS } from '../types/settings';
/**
 * Сервис для управления пользовательскими настройками поиска вакансий.
 * Предоставляет методы для загрузки, сохранения и валидации настроек.
 */
export class SettingsService {
    static STORAGE_KEY = 'remoteJobScout_settings';
    static getLocalStorage() {
        try {
            const g = globalThis;
            return g.localStorage ?? null;
        }
        catch {
            return null;
        }
    }
    /**
     * Загружает настройки или возвращает настройки по умолчанию.
     * @returns Пользовательские настройки
     */
    static loadSettings() {
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
            const parsed = JSON.parse(raw);
            const validated = this.validateSettings(parsed);
            this.saveSettings(validated);
            return validated;
        }
        catch {
            const defaults = { ...DEFAULT_USER_SETTINGS };
            try {
                const safe = this.getLocalStorage();
                if (safe)
                    safe.setItem(this.STORAGE_KEY, JSON.stringify(defaults));
            }
            catch { }
            return defaults;
        }
    }
    /**
     * Сохраняет настройки в localStorage (если доступен), с предварительной валидацией.
     * @param settings Настройки для сохранения
     */
    static saveSettings(settings) {
        const validated = this.validateSettings(settings);
        const ls = this.getLocalStorage();
        if (ls) {
            try {
                ls.setItem(this.STORAGE_KEY, JSON.stringify(validated));
            }
            catch (error) {
                console.error('❌ Failed to save settings to localStorage:', error);
            }
        }
        else {
            // окружение без localStorage — только валидация
        }
    }
    /**
     * Сбрасывает настройки к значениям по умолчанию.
     */
    static resetToDefaults() {
        const defaults = { ...DEFAULT_USER_SETTINGS };
        this.saveSettings(defaults);
        return defaults;
    }
    /**
     * Обновляет отдельные поля настроек.
     * @param updates Частичные обновления настроек
     * @returns Обновленные настройки
     */
    static updateSettings(updates) {
        const currentSettings = this.loadSettings();
        const updatedSettings = {
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
    static validateSettings(settings) {
        const validated = { ...settings };
        if (!Array.isArray(validated.searchPositions)) {
            validated.searchPositions = DEFAULT_USER_SETTINGS.searchPositions;
        }
        else {
            validated.searchPositions = validated.searchPositions
                .filter((pos) => typeof pos === 'string' && pos.trim().length > 0)
                .map((pos) => pos.trim());
        }
        if (!validated.filters || typeof validated.filters !== 'object') {
            validated.filters = { ...DEFAULT_USER_SETTINGS.filters };
        }
        else {
            validated.filters = { ...validated.filters };
            ['blacklistedCompanies', 'blacklistedWordsTitle', 'blacklistedWordsDescription'].forEach((key) => {
                const filterKey = key;
                const currentValue = validated.filters[filterKey];
                if (!Array.isArray(currentValue)) {
                    validated.filters[key] = [];
                }
                else {
                    validated.filters[key] = currentValue
                        .filter((item) => typeof item === 'string' && item.trim().length > 0)
                        .map((item) => item.trim());
                }
            });
            if (!Array.isArray(validated.filters.countries)) {
                validated.filters.countries = [];
            }
            else {
                validated.filters.countries = validated.filters.countries
                    .filter((item) => {
                    const country = item;
                    return (country &&
                        typeof country === 'object' &&
                        typeof country.name === 'string' &&
                        country.name.trim().length > 0 &&
                        typeof country.type === 'string' &&
                        ['blacklist', 'whitelist'].includes(country.type));
                })
                    .map((item) => {
                    const country = item;
                    return { name: country.name.trim(), type: country.type };
                });
            }
            if (!Array.isArray(validated.filters.languages)) {
                validated.filters.languages = [];
            }
            else {
                validated.filters.languages = validated.filters.languages
                    .filter((item) => {
                    const lang = item;
                    return (lang &&
                        typeof lang === 'object' &&
                        typeof lang.language === 'string' &&
                        lang.language.trim().length > 0);
                })
                    .map((item) => {
                    const lang = item;
                    return {
                        language: lang.language.trim(),
                        level: lang.level || 'Intermediate',
                    };
                });
            }
        }
        if (!validated.sources || typeof validated.sources !== 'object') {
            validated.sources = { ...DEFAULT_USER_SETTINGS.sources };
        }
        else {
            validated.sources = { ...validated.sources };
            if (!Array.isArray(validated.sources.jobSites)) {
                validated.sources.jobSites = DEFAULT_USER_SETTINGS.sources.jobSites;
            }
            else {
                validated.sources.jobSites = validated.sources.jobSites
                    .filter((site) => typeof site === 'string' && site.trim().length > 0)
                    .map((site) => site.trim());
            }
            if (validated.sources.openaiWebSearch &&
                typeof validated.sources.openaiWebSearch === 'object') {
                const ow = validated.sources.openaiWebSearch;
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
        }
        else {
            validated.llm = { ...validated.llm };
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
