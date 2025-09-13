/**
 * OpenAI WebSearch API интеграция
 * Используется для глобального поиска вакансий через AI
 */
export class OpenAIWebSearchScraper {
    config;
    constructor(config) {
        this.config = {
            model: 'gpt-4-turbo-preview',
            maxResults: 50,
            globalSearch: true,
            ...config,
        };
    }
    getSourceName() {
        return 'OpenAI WebSearch';
    }
    async checkAvailability() {
        try {
            // Проверяем доступность API
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async scrape(input) {
        const errors = [];
        const jobs = [];
        try {
            const searchResults = await this.performWebSearch(input);
            // Конвертируем результаты поиска в JobPost объекты
            for (const result of searchResults.results) {
                try {
                    const job = await this.convertSearchResultToJob(result, input);
                    if (job) {
                        jobs.push(job);
                    }
                }
                catch (error) {
                    console.warn('Failed to convert search result to job:', error);
                }
            }
        }
        catch (error) {
            errors.push(`OpenAI WebSearch failed: ${error.message}`);
        }
        return {
            jobs,
        };
    }
    async performWebSearch(input) {
        // Формируем поисковый запрос
        const searchQuery = this.buildSearchQuery(input);
        // Используем Chat Completions API с функциями для веб-поиска
        const messages = [
            {
                role: 'system',
                content: `You are a job search assistant. Search for ${input.search_term} positions using web search capabilities. Focus on recent job postings from reputable job boards.`,
            },
            {
                role: 'user',
                content: `Find ${input.results_wanted ?? 20} recent job postings for "${input.search_term}"${input.location ? ` in ${input.location}` : ''}${input.is_remote ? ' (remote work)' : ''}. Include job title, company, location, description snippet, posting URL, and date posted.`,
            },
        ];
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.config.model,
                messages,
                functions: [
                    {
                        name: 'web_search',
                        description: 'Search the web for job postings',
                        parameters: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'The search query for job postings',
                                },
                                sites: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Specific job sites to search (optional)',
                                },
                                max_results: {
                                    type: 'integer',
                                    description: 'Maximum number of results to return',
                                },
                            },
                            required: ['query'],
                        },
                    },
                ],
                function_call: { name: 'web_search' },
            }),
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('OpenAI API rate limit exceeded');
            }
            if (response.status === 401) {
                throw new Error('Invalid OpenAI API key');
            }
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // Парсим результаты из function call
        if (data.choices?.[0]?.message?.function_call) {
            const functionCall = data.choices[0].message.function_call;
            const args = JSON.parse(functionCall.arguments);
            // Мокаем результаты, так как реальный веб-поиск требует специальной интеграции
            return this.mockSearchResults(searchQuery, args.max_results ?? 20);
        }
        throw new Error('No search results received from OpenAI');
    }
    buildSearchQuery(input) {
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
    mockSearchResults(query, maxResults) {
        // В реальной реализации здесь будут настоящие результаты от OpenAI WebSearch
        // Пока возвращаем моковые данные для тестирования
        const mockResults = [
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
    convertSearchResultToJob(result, input) {
        try {
            // Извлекаем информацию из сниппета и заголовка
            const title = result.title;
            const company = this.extractCompanyFromSnippet(result.snippet) ?? 'Unknown Company';
            const location = this.extractLocationFromSnippet(result.snippet) ?? input.location ?? 'Remote';
            const description = result.snippet;
            return Promise.resolve({
                title,
                company_name: company,
                job_url: result.url,
                location: {
                    city: location.includes(',') ? location.split(',')[0]?.trim() : location,
                },
                description,
                date_posted: result.published_date ? new Date(result.published_date) : null,
                is_remote: result.snippet.toLowerCase().includes('remote') ||
                    result.title.toLowerCase().includes('remote'),
            });
        }
        catch (error) {
            console.warn('Failed to convert search result:', error);
            return Promise.resolve(null);
        }
    }
    extractCompanyFromSnippet(snippet) {
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
    extractLocationFromSnippet(snippet) {
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
