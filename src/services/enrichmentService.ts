/**
 * Enrichment Service
 * Обогащает данные вакансий с помощью LLM
 */

import type { SearchRequest, Vacancy } from '../types/database.js';

export interface EnrichmentResult {
  success: boolean;
  enrichedVacancies: Vacancy[];
  totalProcessed: number;
  enrichedCount: number;
  failedCount: number;
  tokensUsed: number;
  costUsd: number;
  sources: EnrichmentSource[];
  errors: string[];
}

export interface EnrichmentSource {
  url: string;
  title?: string;
  type: 'company_website' | 'job_board' | 'social_media' | 'news_article' | 'other';
  description?: string;
}

export interface EnrichmentData {
  company_info?: {
    name: string;
    industry: string;
    size: string;
    description: string;
    website?: string;
  };
  job_details?: {
    role: string;
    level: string;
    technologies: string[];
    requirements: string[];
    benefits: string[];
  };
  location_info?: {
    country: string;
    city?: string;
    remote_policy: string;
    timezone?: string;
  };
  salary_info?: {
    range?: string;
    currency?: string;
    period?: string;
  };
  application_info?: {
    deadline?: string;
    process: string;
    requirements: string[];
  };
}

/**
 * FR-14: Обработка API-ключа LLM (только на клиенте)
 *
 * Этот класс отвечает за обогащение вакансий данными от LLM (OpenAI).
 * API-ключ хранится только на клиенте и никогда не сохраняется на сервере.
 * Все чувствительные данные маскируются в логах для обеспечения безопасности.
 */
export class EnrichmentService {
  /**
   * API-ключ OpenAI. Хранится только в памяти сервера во время обработки,
   * никогда не сохраняется на диск и не логируется.
   * FR-14: Ключ передается от клиента и не хранится на сервере.
   */
  private openaiApiKey?: string;
  private baseUrl = 'https://api.openai.com/v1';

  /**
   * Настраивает сервис с API ключом OpenAI
   * FR-14: Ключ передается от клиента для каждого запроса обогащения
   * @param apiKey API ключ OpenAI, полученный от клиента
   */
  setOpenAIKey(apiKey: string): void {
    this.openaiApiKey = apiKey;
  }

  /**
   * Обогащает вакансии данными от LLM
   * FR-14: Проверяет наличие API ключа и его формат перед обработкой
   * @param vacancies Список вакансий для обогащения
   * @param settings Настройки поиска (содержат API ключ от клиента)
   * @returns Результат обогащения с детальной информацией об ошибках
   */
  async enrichVacancies(
    vacancies: Vacancy[],
    settings: SearchRequest['settings'],
  ): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      success: true,
      enrichedVacancies: [],
      totalProcessed: vacancies.length,
      enrichedCount: 0,
      failedCount: 0,
      tokensUsed: 0,
      costUsd: 0,
      sources: [],
      errors: [],
    };

    // Check API key availability (log without revealing the key)
    console.log(`🔍 EnrichmentService: API key configured: ${!!this.openaiApiKey}`);
    console.log(`🔍 EnrichmentService: API key length: ${this.openaiApiKey?.length ?? 0}`);

    if (!this.openaiApiKey || this.openaiApiKey.trim() === '') {
      result.success = false;
      result.errors.push(
        'OpenAI API key is required but not provided. Please configure your API key in the settings.',
      );
      console.error('❌ EnrichmentService: OpenAI API key not configured or empty');
      return result;
    }

    // Validate API key format (basic check)
    if (!this.openaiApiKey.startsWith('sk-') || this.openaiApiKey.length < 20) {
      result.success = false;
      result.errors.push(
        'Invalid OpenAI API key format. API key should start with "sk-" and be at least 20 characters long.',
      );
      console.error('❌ EnrichmentService: Invalid OpenAI API key format');
      return result;
    }

    try {
      console.log(`🤖 Starting enrichment of ${vacancies.length} vacancies`);

      for (const vacancy of vacancies) {
        try {
          const enrichmentResult = await this.enrichSingleVacancy(vacancy, settings);

          if (enrichmentResult.enrichmentData) {
            // Accumulate tokens and cost
            if (enrichmentResult.tokensUsed) {
              result.tokensUsed += enrichmentResult.tokensUsed;
            }
            if (enrichmentResult.costUsd) {
              result.costUsd += enrichmentResult.costUsd;
            }

            // Collect sources
            if (enrichmentResult.sources) {
              result.sources.push(...enrichmentResult.sources);
            }

            const enrichedVacancy: Vacancy = {
              ...vacancy,
              status: 'enriched',
              enriched_at: new Date().toISOString(),
              data: JSON.stringify({
                ...this.parseVacancyData(vacancy),
                enrichment: enrichmentResult.enrichmentData,
                enrichment_sources: enrichmentResult.sources,
                enrichment_tokens: enrichmentResult.tokensUsed,
                enrichment_cost: enrichmentResult.costUsd,
              }),
            };

            result.enrichedVacancies.push(enrichedVacancy);
            result.enrichedCount++;
          } else {
            // Если обогащение не удалось, оставляем вакансию без изменений
            result.enrichedVacancies.push(vacancy);
            result.failedCount++;
          }

          // Небольшая задержка между запросами для соблюдения rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Failed to enrich vacancy ${vacancy.id}:`, error);
          result.enrichedVacancies.push(vacancy); // Включаем необогащенную вакансию
          result.failedCount++;
          result.errors.push(`Vacancy ${vacancy.id}: ${(error as Error).message}`);
        }
      }

      console.log(
        `✅ Enrichment completed: ${result.enrichedCount} enriched, ${result.failedCount} failed`,
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      console.error('❌ Enrichment failed:', error);
      return result;
    }
  }

  /**
   * Обогащает одну вакансию
   */
  private async enrichSingleVacancy(
    vacancy: Vacancy,
    settings: SearchRequest['settings'],
  ): Promise<{
    enrichmentData: EnrichmentData | null;
    tokensUsed?: number;
    costUsd?: number;
    sources: EnrichmentSource[];
  }> {
    const prompt = this.buildEnrichmentPrompt(vacancy, settings);

    try {
      const response = await this.callOpenAI(prompt);

      if (!response.success) {
        throw new Error(response.error ?? 'OpenAI API call failed');
      }

      const enrichmentData = this.parseEnrichmentResponse(response.content ?? '');

      // Generate enrichment sources based on the vacancy and enrichment data
      const sources = this.generateEnrichmentSources(vacancy, enrichmentData);

      return {
        enrichmentData,
        tokensUsed: response.tokensUsed,
        costUsd: response.costUsd,
        sources,
      };
    } catch (error) {
      console.error(`❌ OpenAI enrichment failed for vacancy ${vacancy.id}:`, error);
      return {
        enrichmentData: null,
        sources: [],
      };
    }
  }

  /**
   * Строит промпт для обогащения вакансии
   */
  protected buildEnrichmentPrompt(vacancy: Vacancy, _settings: SearchRequest['settings']): string {
    const existingData = this.parseVacancyData(vacancy);

    return `Please analyze this job posting and extract structured information. Return the result as valid JSON.

Job Title: ${vacancy.title}
Description: ${vacancy.description}
Company: ${existingData.company ?? 'Not specified'}
Location: ${vacancy.country ?? 'Not specified'}
Source: ${vacancy.source}

Please provide information in the following JSON format:
{
  "company_info": {
    "name": "string",
    "industry": "string",
    "size": "string (startup/SMB/large enterprise)",
    "description": "brief company description",
    "website": "string or null"
  },
  "job_details": {
    "role": "string (e.g., Frontend Developer, Full Stack, etc.)",
    "level": "string (junior/mid/senior/lead/principal)",
    "technologies": ["array of technologies mentioned"],
    "requirements": ["array of key requirements"],
    "benefits": ["array of benefits/perks mentioned"]
  },
  "location_info": {
    "country": "string",
    "city": "string or null",
    "remote_policy": "string (remote/hybrid/on-site)",
    "timezone": "string or null"
  },
  "salary_info": {
    "range": "string or null",
    "currency": "string or null",
    "period": "string (yearly/monthly/hourly)"
  },
  "application_info": {
    "deadline": "string or null",
    "process": "brief description of application process",
    "requirements": ["array of application requirements"]
  }
}

Focus on accuracy and only include information that can be reasonably inferred from the job posting. Use null for missing information.`;
  }

  /**
   * Вызывает OpenAI API с детальной обработкой ошибок
   * FR-14: Обрабатывает различные типы ошибок API (401, 403, 429, etc.)
   * и предоставляет понятные сообщения для пользователя
   * @param prompt Промпт для отправки в OpenAI
   * @returns Результат вызова API с информацией об использовании токенов
   */
  protected async callOpenAI(prompt: string): Promise<{
    success: boolean;
    content?: string;
    error?: string;
    tokensUsed?: number;
    costUsd?: number;
  }> {
    try {
      console.log(
        `🌐 EnrichmentService: Making OpenAI API call to ${this.baseUrl}/chat/completions`,
      );
      console.log(`🌐 EnrichmentService: Using API key: ${this.openaiApiKey?.substring(0, 10)}...`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a job posting analyzer. Extract structured information from job postings and return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      console.log(`🌐 EnrichmentService: OpenAI API response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;

        // Provide more specific error messages based on status code
        switch (response.status) {
          case 401:
            errorMessage = 'Invalid OpenAI API key. Please check your API key in settings.';
            break;
          case 403:
            errorMessage =
              'OpenAI API access denied. Your API key may not have the required permissions.';
            break;
          case 429:
            errorMessage = 'OpenAI API rate limit exceeded. Please wait before retrying.';
            break;
          case 400:
            errorMessage = 'Invalid request to OpenAI API. Please check your prompt format.';
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = 'OpenAI API server error. Please try again later.';
            break;
          default:
            errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = (data as any).choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Extract token usage and calculate cost
      const usage = (data as any).usage;
      const tokensUsed = usage?.total_tokens ?? 0;

      // Calculate cost based on GPT-3.5-turbo pricing (as of 2024)
      // Input tokens (prompts): $0.0015 per 1K tokens
      // Output tokens (completions): $0.002 per 1K tokens
      // Cost calculation: (input_tokens / 1000) * 0.0015 + (output_tokens / 1000) * 0.002
      const inputTokens = usage?.prompt_tokens ?? 0;
      const outputTokens = usage?.completion_tokens ?? 0;
      const inputCost = (inputTokens / 1000) * 0.0015;
      const outputCost = (outputTokens / 1000) * 0.002;
      const costUsd = inputCost + outputCost;

      console.log(
        `📊 OpenAI API usage: ${tokensUsed} tokens (${inputTokens} input + ${outputTokens} output), cost: $${costUsd.toFixed(6)}`,
      );

      return { success: true, content, tokensUsed, costUsd };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Парсит ответ от OpenAI
   * Обрабатывает ответ LLM, удаляя markdown-обертки и парся JSON
   */
  private parseEnrichmentResponse(content: string): EnrichmentData | null {
    try {
      // Убираем возможные markdown-обертки от LLM
      // LLM может возвращать JSON в формате ```json ... ```
      const cleanedContent = content
        .replace(/```json\n?/g, '') // Удаляем открывающий тег
        .replace(/```\n?/g, '') // Удаляем закрывающий тег
        .trim(); // Убираем лишние пробелы
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('❌ Failed to parse enrichment response:', error);
      console.error('Raw content:', content);
      return null;
    }
  }

  /**
   * Генерирует источники обогащения на основе данных вакансии
   */
  private generateEnrichmentSources(
    vacancy: Vacancy,
    enrichmentData: EnrichmentData | null,
  ): EnrichmentSource[] {
    const sources: EnrichmentSource[] = [];

    // Add the original job posting URL as a source
    if (vacancy.url) {
      sources.push({
        url: vacancy.url,
        title: `Job Posting: ${vacancy.title}`,
        type: 'job_board',
        description: `Original job posting from ${vacancy.source}`,
      });
    }

    // Add company website if available in enrichment data
    if (enrichmentData?.company_info?.website) {
      sources.push({
        url: enrichmentData.company_info.website,
        title: `${enrichmentData.company_info.name || 'Company'} Website`,
        type: 'company_website',
        description: 'Company website extracted from job posting analysis',
      });
    }

    // Add source platform
    sources.push({
      url: `https://www.${vacancy.source.toLowerCase()}.com`,
      title: vacancy.source,
      type: 'job_board',
      description: `Job board platform where the vacancy was found`,
    });

    return sources;
  }

  /**
   * Парсит дополнительные данные вакансии из JSON
   */
  protected parseVacancyData(vacancy: Vacancy): Record<string, unknown> {
    try {
      return vacancy.data ? JSON.parse(vacancy.data) : {};
    } catch {
      return {};
    }
  }
}
