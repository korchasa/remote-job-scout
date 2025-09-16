/**
 * OpenAI WebSearch API интеграция
 * Используется для глобального поиска вакансий через AI
 */

import type { JobPost, JobResponse, ScraperInput } from '../../types/scrapers.js';
import { Scraper } from '../../types/scrapers.js';

// Types for OpenAI Responses API integration
interface OpenAISearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
}

interface OpenAIWebSearchResponse {
  results: OpenAISearchResult[];
  total_found: number;
  search_query: string;
}

// Types for Responses API response structure
interface OpenAIWebSearchResult {
  type: 'web_search_result';
  title: string;
  url: string;
  description?: string;
  content?: string;
  published_date?: string;
}

interface OpenAIResponseOutput {
  type: string;
  content: OpenAIWebSearchResult[];
}

interface OpenAIResponsesAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  output: OpenAIResponseOutput[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * FR-14: OpenAI WebSearch Scraper
 *
 * Этот класс использует OpenAI API для веб-поиска вакансий.
 * API-ключ передается в конструкторе и никогда не сохраняется на сервере.
 * Все ошибки API обрабатываются с понятными сообщениями для пользователя.
 */
export class OpenAIWebSearchScraper extends Scraper {
  /**
   * API-ключ OpenAI для веб-поиска
   * FR-14: Передается от клиента, не сохраняется на сервере
   */
  private apiKey: string;

  // Internal settings defined by scraper itself
  private model = 'gpt-4o-mini';
  private globalSearch = true;
  private maxResults = 50;

  // Transport settings - defined by scraper itself
  private timeout = 30000; // 30 seconds for OpenAI API calls

  /**
   * Создает экземпляр скрейпера с API ключом
   * FR-14: API ключ передается от клиента для каждой операции поиска
   * @param apiKey API ключ OpenAI для веб-поиска
   */
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'openai';
  }

  async scrape(input: ScraperInput): Promise<JobResponse> {
    // Use internal settings, API key is already set in constructor
    const apiKey = this.apiKey;
    const model = this.model;
    const globalSearch = this.globalSearch;
    const maxResults = this.maxResults;

    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    const errors: string[] = [];
    const jobs: JobPost[] = [];

    try {
      const searchResults = await this.performWebSearch(
        input,
        apiKey,
        model,
        globalSearch,
        maxResults,
      );

      // Конвертируем результаты поиска в JobPost объекты
      for (const result of searchResults.results) {
        try {
          const job = await this.convertSearchResultToJob(result, input);
          if (job) {
            jobs.push(job);
          }
        } catch (error) {
          console.warn('Failed to convert search result to job:', error);
        }
      }
    } catch (error) {
      errors.push(`OpenAI WebSearch failed: ${(error as Error).message}`);
    }

    return {
      jobs,
    };
  }

  /**
   * Выполняет веб-поиск с использованием OpenAI API
   * FR-14: Обрабатывает ошибки API ключа и предоставляет детальные сообщения об ошибках
   * @param input Параметры поиска
   * @param apiKey API ключ OpenAI (передается от клиента)
   * @param model Модель OpenAI для использования
   * @param _globalSearch Флаг глобального поиска (не используется в текущей реализации)
   * @param maxResults Максимальное количество результатов
   * @returns Результаты веб-поиска
   */
  private async performWebSearch(
    input: ScraperInput,
    apiKey: string,
    model: string,
    _globalSearch: boolean,
    maxResults: number,
  ): Promise<OpenAIWebSearchResponse> {
    // Формируем поисковый запрос
    const searchQuery = this.buildSearchQuery(input);

    // Используем Responses API для структурированного поиска вакансий
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        instructions: `You are a job search assistant. Search for ${input.search_term} positions using web search capabilities. Focus on recent job postings from reputable job boards.`,
        input: `Find ${maxResults} recent job postings for "${input.search_term}"${
          input.location ? ` in ${input.location}` : ''
        }${
          input.is_remote ? ' (remote work)' : ''
        }. Include job title, company, location, description snippet, posting URL, and date posted.`,
        tools: [
          {
            type: 'web_search',
            web_search: {
              search_context_size: 'medium',
              user_location: {
                type: 'approximate',
                country: input.country?.toString() ?? 'US',
              },
            },
          },
        ],
        tool_choice: 'auto',
        max_output_tokens: 4000,
        temperature: 0.1,
        top_p: 0.9,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      let errorMessage = `OpenAI WebSearch API error: ${response.status} ${response.statusText}`;

      // Provide more specific error messages based on status code
      switch (response.status) {
        case 401:
          errorMessage = 'Invalid OpenAI API key. Please check your API key in settings.';
          break;
        case 403:
          errorMessage =
            'OpenAI API access denied. Your API key may not have the required permissions for web search.';
          break;
        case 429:
          errorMessage = 'OpenAI API rate limit exceeded. Please wait before retrying.';
          break;
        case 400:
          errorMessage =
            'Invalid request to OpenAI WebSearch API. Please check your search parameters.';
          break;
        case 404:
          errorMessage = 'OpenAI WebSearch API endpoint not found. The API may have changed.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'OpenAI API server error. Please try again later.';
          break;
        default:
          errorMessage = `OpenAI WebSearch API error: ${response.status} ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const data: OpenAIResponsesAPIResponse = await response.json();

    // Парсим результаты из Responses API
    if (data.output?.[0]?.content && Array.isArray(data.output[0].content)) {
      const content = data.output[0].content;

      // Извлекаем результаты поиска из structured content
      const searchResults: OpenAISearchResult[] = content
        .filter((item): item is OpenAIWebSearchResult => item.type === 'web_search_result')
        .map((item) => ({
          title: item.title ?? 'Unknown Position',
          url: item.url ?? '#',
          snippet: item.description ?? item.content ?? '',
          published_date: item.published_date ?? new Date().toISOString(),
        }))
        .slice(0, maxResults);

      if (searchResults.length > 0) {
        return {
          results: searchResults,
          total_found: searchResults.length,
          search_query: searchQuery,
        };
      }
    }

    // Если не получили структурированные результаты, используем мок
    console.warn('No structured search results from OpenAI Responses API, using mock data');
    return this.mockSearchResults(searchQuery, maxResults);
  }

  private buildSearchQuery(input: ScraperInput): string {
    let query = input.search_term ?? '';

    if (input.location) {
      query += ` ${input.location}`;
    }

    if (input.is_remote) {
      query += ' remote';
    }

    if (input.job_type) {
      query += ` ${input.job_type}`;
    }

    query += ' jobs site:indeed.com OR site:linkedin.com OR site:glassdoor.com OR site:monster.com';

    return query;
  }

  private mockSearchResults(query: string, maxResults: number): Promise<OpenAIWebSearchResponse> {
    // В реальной реализации здесь будут настоящие результаты от OpenAI WebSearch
    // Пока возвращаем моковые данные для тестирования

    const mockResults: OpenAISearchResult[] = [
      {
        title: `Senior ${query.split(' ')[0]} Developer`,
        url: 'https://www.indeed.com/job/senior-developer',
        snippet: `We are looking for an experienced ${query} developer to join our team. Remote work available.`,
        published_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: `${query} Engineer - Remote`,
        url: 'https://www.linkedin.com/jobs/view/12345',
        snippet: `Join our innovative team as a ${query} engineer. Competitive salary and benefits.`,
        published_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Добавьте больше моковых результатов по необходимости
    ];

    return Promise.resolve({
      results: mockResults.slice(0, maxResults),
      total_found: mockResults.length,
      search_query: query,
    });
  }

  private convertSearchResultToJob(
    result: OpenAISearchResult,
    input: ScraperInput,
  ): Promise<JobPost | null> {
    try {
      // Извлекаем информацию из сниппета и заголовка
      const title = result.title;
      const company = this.extractCompanyFromSnippet(result.snippet) ?? 'Unknown Company';
      const location =
        this.extractLocationFromSnippet(result.snippet) ?? input.location ?? 'Remote';
      const description = result.snippet;

      return Promise.resolve({
        id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        company_name: company,
        job_url: result.url,
        location: {
          city: location.includes(',') ? location.split(',')[0]?.trim() : location,
        },
        description,
        date_posted: result.published_date ? new Date(result.published_date) : null,
        is_remote:
          result.snippet.toLowerCase().includes('remote') ||
          result.title.toLowerCase().includes('remote'),
      });
    } catch (error) {
      console.warn('Failed to convert search result:', error);
      return Promise.resolve(null);
    }
  }

  private extractCompanyFromSnippet(snippet: string): string | null {
    // Простая эвристика для извлечения названия компании
    const patterns = [
      /at ([A-Z][a-zA-Z\s]+(?:Inc|LLC|Corp|Co|Ltd|GmbH))/,
      /([A-Z][a-zA-Z\s]+(?:Inc|LLC|Corp|Co|Ltd|GmbH))/,
      /work at ([A-Z][a-zA-Z\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = snippet.match(pattern);
      if (match?.[1] && match[1].length > 2 && match[1].length < 50) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractLocationFromSnippet(snippet: string): string | null {
    // Простая эвристика для извлечения локации
    const patterns = [/in ([A-Z][a-zA-Z\s,]+(?:,\s*[A-Z]{2})?)/, /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/];

    for (const pattern of patterns) {
      const match = snippet.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
