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
  errors: string[];
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

export class EnrichmentService {
  private openaiApiKey?: string;
  private baseUrl = 'https://api.openai.com/v1';

  /**
   * Настраивает сервис с API ключом OpenAI
   */
  setOpenAIKey(apiKey: string): void {
    this.openaiApiKey = apiKey;
  }

  /**
   * Обогащает вакансии данными от LLM
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
      errors: [],
    };

    console.log(`🔍 EnrichmentService: API key configured: ${!!this.openaiApiKey}`);
    console.log(`🔍 EnrichmentService: API key length: ${this.openaiApiKey?.length ?? 0}`);

    if (!this.openaiApiKey) {
      result.success = false;
      result.errors.push('OpenAI API key not configured');
      console.error('❌ EnrichmentService: No OpenAI API key configured');
      return result;
    }

    try {
      console.log(`🤖 Starting enrichment of ${vacancies.length} vacancies`);

      for (const vacancy of vacancies) {
        try {
          const enrichmentData = await this.enrichSingleVacancy(vacancy, settings);

          if (enrichmentData) {
            const enrichedVacancy: Vacancy = {
              ...vacancy,
              status: 'enriched',
              enriched_at: new Date().toISOString(),
              data: JSON.stringify({
                ...this.parseVacancyData(vacancy),
                enrichment: enrichmentData,
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
  ): Promise<EnrichmentData | null> {
    const prompt = this.buildEnrichmentPrompt(vacancy, settings);

    try {
      const response = await this.callOpenAI(prompt);

      if (!response.success) {
        throw new Error(response.error ?? 'OpenAI API call failed');
      }

      const enrichmentData = this.parseEnrichmentResponse(response.content ?? '');

      // Обновляем статистику токенов и стоимости (примерные значения)
      // В реальном приложении нужно парсить реальные данные из ответа API

      return enrichmentData;
    } catch (error) {
      console.error(`❌ OpenAI enrichment failed for vacancy ${vacancy.id}:`, error);
      return null;
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
   * Вызывает OpenAI API
   */
  protected async callOpenAI(
    prompt: string,
  ): Promise<{ success: boolean; content?: string; error?: string }> {
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
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = (data as any).choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return { success: true, content };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Парсит ответ от OpenAI
   */
  private parseEnrichmentResponse(content: string): EnrichmentData | null {
    try {
      // Убираем возможные markdown-обертки
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('❌ Failed to parse enrichment response:', error);
      console.error('Raw content:', content);
      return null;
    }
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
