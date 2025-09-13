/**
 * LinkedIn скраппер
 * Основан на анализе JobSpy - требует прокси и имитации браузера
 * WARNING: LinkedIn имеет строгую защиту от скраппинга
 */
import { Scraper, Site } from '../../types/scrapers.js';
export class LinkedInScraper extends Scraper {
    baseUrl = 'https://www.linkedin.com';
    constructor(proxies, ca_cert, user_agent) {
        super(Site.LINKEDIN, proxies, ca_cert, user_agent);
    }
    getSourceName() {
        return 'LinkedIn';
    }
    async checkAvailability() {
        try {
            const response = await fetch(`${this.baseUrl}/`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
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
            console.warn('⚠️ LinkedIn scraping is challenging and may require proxy servers');
            const searchParams = new URLSearchParams({
                keywords: input.search_term ?? '',
                location: input.location ?? '',
            });
            if (input.is_remote) {
                searchParams.set('f_WT', '2'); // Remote work filter
            }
            if (input.job_type) {
                // LinkedIn job type filters
                const jobTypeMap = {
                    fulltime: 'F',
                    parttime: 'P',
                    contract: 'C',
                    internship: 'I',
                };
                if (jobTypeMap[input.job_type]) {
                    searchParams.set('f_JT', jobTypeMap[input.job_type]);
                }
            }
            const searchUrl = `${this.baseUrl}/jobs/search/?${searchParams.toString()}`;
            const response = await this.fetchJobs(searchUrl, input);
            jobs.push(...response.jobs);
        }
        catch (error) {
            errors.push(`LinkedIn scraping failed: ${error.message}`);
            console.error('LinkedIn scraping error:', error);
        }
        return {
            jobs,
        };
    }
    async fetchJobs(url, input) {
        // LinkedIn требует специфических заголовков и cookies
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            // LinkedIn specific headers
            'X-Li-Track': '{"clientVersion":"1.13.3","mpVersion":"1.13.3","osName":"web","timezoneOffset":3,"timezone":"Europe/Moscow","deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
        };
        const response = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limited by LinkedIn');
            }
            if (response.status === 403) {
                throw new Error('Blocked by LinkedIn (may need proxy)');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        const jobs = this.parseJobsFromHTML(html, input);
        return { jobs };
    }
    parseJobsFromHTML(html, input) {
        const jobs = [];
        // LinkedIn использует data-job-id атрибуты для вакансий
        const jobCards = html.match(/<div[^>]*data-job-id="[^"]*"[^>]*>.*?<\/div>/gs) ?? [];
        for (const card of jobCards) {
            try {
                const job = this.parseJobCard(card);
                if (job) {
                    jobs.push(job);
                }
            }
            catch (error) {
                console.warn('Failed to parse LinkedIn job card:', error);
            }
        }
        return jobs.slice(0, input.results_wanted ?? 50);
    }
    parseJobCard(card) {
        // Извлекаем job ID
        const jobIdMatch = card.match(/data-job-id="([^"]*)"/);
        if (!jobIdMatch)
            return null;
        const jobId = jobIdMatch[1];
        // Извлекаем заголовок
        const titleMatch = card.match(/<a[^>]*class="[^"]*job-card-list__title[^"]*"[^>]*>(.*?)<\/a>/s);
        if (!titleMatch)
            return null;
        const title = this.cleanText(titleMatch[1]);
        // Извлекаем компанию
        const companyMatch = card.match(/<a[^>]*class="[^"]*job-card-container__company-name[^"]*"[^>]*>(.*?)<\/a>/s);
        const company = companyMatch ? this.cleanText(companyMatch[1]) : 'Unknown';
        // Извлекаем локацию
        const locationMatch = card.match(/<li[^>]*class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>(.*?)<\/li>/s);
        const location = locationMatch ? this.cleanText(locationMatch[1]) : '';
        // Извлекаем URL
        const url = `${this.baseUrl}/jobs/view/${jobId}`;
        // Извлекаем описание (может быть усечено)
        const descriptionMatch = card.match(/<p[^>]*class="[^"]*job-card-list__job-snippet[^"]*"[^>]*>(.*?)<\/p>/s);
        const description = descriptionMatch ? this.cleanText(descriptionMatch[1]) : '';
        // Извлекаем дату
        const dateMatch = card.match(/<time[^>]*>(.*?)<\/time>/s);
        const date_posted = dateMatch ? this.parseDate(dateMatch[1]) : undefined;
        return {
            id: jobId,
            title,
            company_name: company,
            job_url: url,
            location: {
                city: location.split(',')[0]?.trim(),
                state: location.split(',')[1]?.trim(),
            },
            description,
            date_posted: date_posted ? new Date(date_posted) : null,
            is_remote: location.toLowerCase().includes('remote') || description.toLowerCase().includes('remote'),
        };
    }
    cleanText(text) {
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }
    parseDate(dateText) {
        // LinkedIn использует форматы типа "1 day ago", "2 weeks ago", etc.
        const now = new Date();
        const match = dateText.match(/(\d+)\s+(second|minute|hour|day|week)s?\s+ago/i);
        if (!match)
            return undefined;
        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        switch (unit) {
            case 'second':
                now.setSeconds(now.getSeconds() - amount);
                break;
            case 'minute':
                now.setMinutes(now.getMinutes() - amount);
                break;
            case 'hour':
                now.setHours(now.getHours() - amount);
                break;
            case 'day':
                now.setDate(now.getDate() - amount);
                break;
            case 'week':
                now.setDate(now.getDate() - amount * 7);
                break;
        }
        return now.toISOString();
    }
}
