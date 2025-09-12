/**
 * Indeed скраппер
 * Основан на анализе JobSpy - использует GraphQL API
 */

import {
  BaseScraper,
  JobPost,
  ScraperInput,
  ScraperResponse,
} from "../../types/scrapers.ts";

export class IndeedScraper extends BaseScraper {
  private readonly baseUrl = "https://www.indeed.com";

  getSourceName(): string {
    return "Indeed";
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
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
      // Indeed использует GraphQL API для поиска
      const searchParams = new URLSearchParams({
        q: input.search_term,
        l: input.location || "",
        radius: (input.distance || 25).toString(),
        sort: "date",
        limit: Math.min(
          input.results_wanted || 50,
          this.config.max_results_per_request,
        ).toString(),
      });

      if (input.is_remote) {
        searchParams.set("sc", "0kf:attr(DSQF7)"); // Remote jobs filter
      }

      if (input.hours_old) {
        searchParams.set("fromage", Math.ceil(input.hours_old / 24).toString());
      }

      const searchUrl = `${this.baseUrl}/jobs?${searchParams.toString()}`;

      const response = await this.withRetry(
        () => this.fetchJobs(searchUrl, input),
        "job search",
      );

      jobs.push(...response.jobs);

      // Indeed обычно возвращает все результаты в одном запросе
      // Если нужно больше результатов, можно добавить пагинацию
    } catch (error) {
      errors.push(`Indeed scraping failed: ${(error as Error).message}`);
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
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(this.config.timeout_ms),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const jobs = this.parseJobsFromHTML(html, input);

    return { jobs };
  }

  private parseJobsFromHTML(html: string, input: ScraperInput): JobPost[] {
    const jobs: JobPost[] = [];

    // Indeed использует специфическую структуру HTML
    // Ищем блоки вакансий с классом jobsearch-ResultsList
    const jobBlocks = html.match(
      /<div[^>]*class="[^"]*jobsearch-SerpJobCard[^"]*"[^>]*>.*?<\/div>/gs,
    ) || [];

    for (const block of jobBlocks) {
      try {
        const job = this.parseJobBlock(block);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn("Failed to parse job block:", error);
      }
    }

    return jobs.slice(
      0,
      input.results_wanted || this.config.max_results_per_request,
    );
  }

  private parseJobBlock(block: string): JobPost | null {
    // Извлекаем данные из HTML блока
    const titleMatch = block.match(/<h2[^>]*>.*?<a[^>]*>(.*?)<\/a>.*?<\/h2>/s);
    const companyMatch = block.match(
      /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
    );
    const locationMatch = block.match(
      /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
    );
    const urlMatch = block.match(/<a[^>]*href="([^"]*job\/[^"]*)"[^>]*>/);
    const dateMatch = block.match(
      /<span[^>]*class="[^"]*date[^"]*"[^>]*>(.*?)<\/span>/s,
    );
    const descriptionMatch = block.match(
      /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s,
    );

    if (!titleMatch || !urlMatch) {
      return null;
    }

    const title = this.cleanText(titleMatch[1]);
    const company = companyMatch ? this.cleanText(companyMatch[1]) : "Unknown";
    const location = locationMatch ? this.cleanText(locationMatch[1]) : "";
    const url = urlMatch[1].startsWith("http")
      ? urlMatch[1]
      : `${this.baseUrl}${urlMatch[1]}`;
    const date_posted = dateMatch ? this.parseDate(dateMatch[1]) : undefined;
    const description = descriptionMatch
      ? this.cleanText(descriptionMatch[1])
      : "";

    return {
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
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  private parseDate(dateText: string): string | undefined {
    // Indeed использует относительные даты типа "2 days ago"
    const now = new Date();
    const match = dateText.match(/(\d+)\s+(day|hour|minute)s?\s+ago/i);

    if (!match) return undefined;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "day":
        now.setDate(now.getDate() - amount);
        break;
      case "hour":
        now.setHours(now.getHours() - amount);
        break;
      case "minute":
        now.setMinutes(now.getMinutes() - amount);
        break;
    }

    return now.toISOString();
  }
}
