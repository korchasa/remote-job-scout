/**
 * LinkedIn скраппер
 * Основан на анализе JobSpy - требует прокси и имитации браузера
 * WARNING: LinkedIn имеет строгую защиту от скраппинга
 */

import {
  BaseScraper,
  JobPost,
  ScraperInput,
  ScraperResponse,
} from "../../types/scrapers.ts";

export class LinkedInScraper extends BaseScraper {
  private readonly baseUrl = "https://www.linkedin.com";

  constructor(
    config: Partial<import("../../types/scrapers.ts").ScraperConfig> = {},
  ) {
    super({
      max_retries: 5, // LinkedIn требует больше попыток
      retry_delay_ms: 3000, // Длиннее задержки
      timeout_ms: 45000, // Длиннее таймаут
      rate_limit_delay_ms: 5000, // Строгие rate limits
      ...config,
    });
  }

  getSourceName(): string {
    return "LinkedIn";
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async scrape(input: ScraperInput): Promise<ScraperResponse> {
    const errors: string[] = [];
    const jobs: JobPost[] = [];

    try {
      console.warn(
        "⚠️ LinkedIn scraping is challenging and may require proxy servers",
      );

      const searchParams = new URLSearchParams({
        keywords: input.search_term,
        location: input.location || "",
      });

      if (input.is_remote) {
        searchParams.set("f_WT", "2"); // Remote work filter
      }

      if (input.job_type) {
        // LinkedIn job type filters
        const jobTypeMap: Record<string, string> = {
          "fulltime": "F",
          "parttime": "P",
          "contract": "C",
          "internship": "I",
        };
        if (jobTypeMap[input.job_type]) {
          searchParams.set("f_JT", jobTypeMap[input.job_type]);
        }
      }

      const searchUrl =
        `${this.baseUrl}/jobs/search/?${searchParams.toString()}`;

      const response = await this.withRetry(
        () => this.fetchJobs(searchUrl, input),
        "job search",
      );

      jobs.push(...response.jobs);
    } catch (error) {
      errors.push(`LinkedIn scraping failed: ${(error as Error).message}`);
      console.error("LinkedIn scraping error:", error);
    }

    return {
      success: errors.length === 0,
      jobs,
      total_found: jobs.length,
      errors,
      source: this.getSourceName(),
    };
  }

  private async fetchJobs(
    url: string,
    input: ScraperInput,
  ): Promise<{ jobs: JobPost[] }> {
    // LinkedIn требует специфических заголовков и cookies
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
      // LinkedIn specific headers
      "X-Li-Track":
        '{"clientVersion":"1.13.3","mpVersion":"1.13.3","osName":"web","timezoneOffset":3,"timezone":"Europe/Moscow","deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(this.config.timeout_ms),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limited by LinkedIn");
      }
      if (response.status === 403) {
        throw new Error("Blocked by LinkedIn (may need proxy)");
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const jobs = this.parseJobsFromHTML(html, input);

    return { jobs };
  }

  private parseJobsFromHTML(html: string, input: ScraperInput): JobPost[] {
    const jobs: JobPost[] = [];

    // LinkedIn использует data-job-id атрибуты для вакансий
    const jobCards =
      html.match(/<div[^>]*data-job-id="[^"]*"[^>]*>.*?<\/div>/gs) || [];

    for (const card of jobCards) {
      try {
        const job = this.parseJobCard(card);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn("Failed to parse LinkedIn job card:", error);
      }
    }

    return jobs.slice(
      0,
      input.results_wanted || this.config.max_results_per_request,
    );
  }

  private parseJobCard(card: string): JobPost | null {
    // Извлекаем job ID
    const jobIdMatch = card.match(/data-job-id="([^"]*)"/);
    if (!jobIdMatch) return null;

    const jobId = jobIdMatch[1];

    // Извлекаем заголовок
    const titleMatch = card.match(
      /<a[^>]*class="[^"]*job-card-list__title[^"]*"[^>]*>(.*?)<\/a>/s,
    );
    if (!titleMatch) return null;

    const title = this.cleanText(titleMatch[1]);

    // Извлекаем компанию
    const companyMatch = card.match(
      /<a[^>]*class="[^"]*job-card-container__company-name[^"]*"[^>]*>(.*?)<\/a>/s,
    );
    const company = companyMatch ? this.cleanText(companyMatch[1]) : "Unknown";

    // Извлекаем локацию
    const locationMatch = card.match(
      /<li[^>]*class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>(.*?)<\/li>/s,
    );
    const location = locationMatch ? this.cleanText(locationMatch[1]) : "";

    // Извлекаем URL
    const url = `${this.baseUrl}/jobs/view/${jobId}`;

    // Извлекаем описание (может быть усечено)
    const descriptionMatch = card.match(
      /<p[^>]*class="[^"]*job-card-list__job-snippet[^"]*"[^>]*>(.*?)<\/p>/s,
    );
    const description = descriptionMatch
      ? this.cleanText(descriptionMatch[1])
      : "";

    // Извлекаем дату
    const dateMatch = card.match(/<time[^>]*>(.*?)<\/time>/s);
    const date_posted = dateMatch ? this.parseDate(dateMatch[1]) : undefined;

    return {
      id: jobId,
      title,
      company,
      location,
      description,
      url,
      date_posted,
      source: this.getSourceName(),
      is_remote: location.toLowerCase().includes("remote") ||
        description.toLowerCase().includes("remote"),
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  private parseDate(dateText: string): string | undefined {
    // LinkedIn использует форматы типа "1 day ago", "2 weeks ago", etc.
    const now = new Date();
    const match = dateText.match(
      /(\d+)\s+(second|minute|hour|day|week)s?\s+ago/i,
    );

    if (!match) return undefined;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "second":
        now.setSeconds(now.getSeconds() - amount);
        break;
      case "minute":
        now.setMinutes(now.getMinutes() - amount);
        break;
      case "hour":
        now.setHours(now.getHours() - amount);
        break;
      case "day":
        now.setDate(now.getDate() - amount);
        break;
      case "week":
        now.setDate(now.getDate() - (amount * 7));
        break;
    }

    return now.toISOString();
  }
}
