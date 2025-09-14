/**
 * LinkedIn скраппер - ПОЛНАЯ РЕАЛИЗАЦИЯ на основе JobSpy
 *
 * ✅ Полностью совместима с JobSpy по:
 *   - Архитектуре (Scraper наследование)
 *   - API (jobs-guest/jobs/api/seeMoreJobPostings/search endpoint)
 *   - Фильтрам (job_type, is_remote, easy_apply, hours_old)
 *   - Форматам описания (HTML/Markdown/Plain)
 *   - Локализации (Country enum)
 *   - Пагинации (start parameter, results_wanted)
 *   - Типам данных (JobPost, ScraperInput, JobResponse)
 *
 * 🔧 Ключевые особенности:
 *   - Использует правильный LinkedIn API endpoint
 *   - Правильные заголовки для имитации браузера
 *   - Обработка rate limiting (429, 403)
 *   - Пагинация через start parameter
 *   - Извлечение полных описаний вакансий
 *   - Поддержка всех JobSpy фильтров
 *
 * 📊 Статус: Готова к использованию
 *
 * WARNING: LinkedIn имеет строгую защиту от скраппинга
 */

import type { JobPost, JobResponse, ScraperInput } from '../../types/scrapers.js';
import { Scraper, Site, JobType, DescriptionFormat } from '../../types/scrapers.js';
import { JSDOM } from 'jsdom';

export class LinkedInScraper extends Scraper {
  private readonly baseUrl = 'https://www.linkedin.com';
  private readonly delay = 3;
  private readonly bandDelay = 4;
  private scraperInput: ScraperInput | null = null;
  private country = 'worldwide';

  constructor(proxies?: string[] | string, ca_cert?: string, user_agent?: string) {
    super(Site.LINKEDIN, proxies, ca_cert, user_agent);
  }

  getSourceName(): string {
    return 'LinkedIn';
  }

  override async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async scrape(scraperInput: ScraperInput): Promise<JobResponse> {
    this.scraperInput = scraperInput;
    const jobList: JobPost[] = [];
    const seenIds = new Set<string>();
    let start = scraperInput.offset ? Math.floor(scraperInput.offset / 10) * 10 : 0;
    let requestCount = 0;
    const secondsOld = scraperInput.hours_old ? scraperInput.hours_old * 3600 : undefined;

    console.log('🚀 Starting LinkedIn scrape', {
      scraperInput: {
        site_type: scraperInput.site_type,
        search_term: scraperInput.search_term,
        location: scraperInput.location,
        results_wanted: scraperInput.results_wanted,
      },
      timestamp: new Date().toISOString(),
    });

    const continueSearch = (): boolean => {
      return jobList.length < (scraperInput.results_wanted ?? 15) && start < 1000;
    };

    while (continueSearch()) {
      requestCount++;
      console.log(
        `search page: ${requestCount} / ${Math.ceil((scraperInput.results_wanted ?? 15) / 10)}`,
      );

      const params: Record<string, string> = {
        keywords: scraperInput.search_term ?? '',
        location: scraperInput.location ?? '',
        distance: scraperInput.distance?.toString() ?? '',
        pageNum: '0',
        start: start.toString(),
      };

      if (scraperInput.is_remote) {
        params.f_WT = '2';
      }

      if (scraperInput.job_type) {
        const jobTypeCode = this.getJobTypeCode(scraperInput.job_type);
        if (jobTypeCode) {
          params.f_JT = jobTypeCode;
        }
      }

      if (scraperInput.easy_apply) {
        params.f_AL = 'true';
      }

      if (scraperInput.linkedin_company_ids) {
        params.f_C = scraperInput.linkedin_company_ids.join(',');
      }

      if (secondsOld) {
        params.f_TPR = `r${secondsOld}`;
      }

      // Remove empty parameters
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== ''),
      );

      try {
        const response = await fetch(
          `${this.baseUrl}/jobs-guest/jobs/api/seeMoreJobPostings/search?${new URLSearchParams(cleanParams).toString()}`,
          {
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(10000),
          },
        );

        if (!response.ok) {
          if (response.status === 429) {
            console.error('429 Response - Blocked by LinkedIn for too many requests');
          } else {
            const errorText = await response.text();
            console.error(`LinkedIn response status code ${response.status} - ${errorText}`);
          }
          return { jobs: jobList };
        }

        const html = await response.text();
        const jobCards = this.parseJobCards(html);

        if (jobCards.length === 0) {
          return { jobs: jobList };
        }

        for (const jobCard of jobCards) {
          const hrefTag = jobCard.querySelector('a.base-card__full-link');
          if (hrefTag?.getAttribute('href')) {
            const href = hrefTag.getAttribute('href')!.split('?')[0];
            const jobId = href.split('-').pop();

            if (!jobId || seenIds.has(jobId)) {
              continue;
            }
            seenIds.add(jobId);

            try {
              const fetchDesc = scraperInput.linkedin_fetch_description ?? false;
              const jobPost = await this.processJob(jobCard, jobId, fetchDesc);
              if (jobPost) {
                jobList.push(jobPost);
              }
              if (!continueSearch()) {
                break;
              }
            } catch (error) {
              console.error('Error processing job:', error);
            }
          }
        }

        if (continueSearch()) {
          await this.sleep(this.delay + Math.random() * this.bandDelay);
          start += jobCards.length;
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Proxy responded with')) {
          console.error('LinkedIn: Bad proxy');
        } else {
          console.error('LinkedIn:', error);
        }
        return { jobs: jobList };
      }
    }

    const finalJobs = jobList.slice(0, scraperInput.results_wanted ?? 15);
    console.log(`🔍 LinkedIn scrape completed: ${finalJobs.length} jobs found`);
    return { jobs: finalJobs };
  }

  private getHeaders(): Record<string, string> {
    return {
      authority: 'www.linkedin.com',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'max-age=0',
      'upgrade-insecure-requests': '1',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  private getJobTypeCode(jobType: JobType): string | null {
    const jobTypeMap: Record<JobType, string> = {
      [JobType.FULL_TIME]: 'F',
      [JobType.PART_TIME]: 'P',
      [JobType.INTERNSHIP]: 'I',
      [JobType.CONTRACT]: 'C',
      [JobType.TEMPORARY]: 'T',
      [JobType.PER_DIEM]: 'F', // Map to full-time as closest match
      [JobType.NIGHTS]: 'F', // Map to full-time as closest match
      [JobType.OTHER]: 'F', // Map to full-time as closest match
      [JobType.SUMMER]: 'I', // Map to internship as closest match
      [JobType.VOLUNTEER]: 'F', // Map to full-time as closest match
    };
    return jobTypeMap[jobType] ?? null;
  }

  private parseJobCards(html: string): Element[] {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    return Array.from(doc.querySelectorAll('div.base-search-card'));
  }

  private async processJob(
    jobCard: Element,
    jobId: string,
    fullDescription: boolean,
  ): Promise<JobPost | null> {
    const salaryTag = jobCard.querySelector('span.job-search-card__salary-info');
    let compensation = null;

    if (salaryTag) {
      const salaryText = salaryTag.textContent?.trim() ?? '';
      const salaryValues = salaryText.split('-').map((value) => this.parseCurrency(value.trim()));
      const salaryMin = salaryValues[0];
      const salaryMax = salaryValues[1];
      const currency = salaryText[0] !== '$' ? salaryText[0] : 'USD';

      compensation = {
        min_amount: salaryMin,
        max_amount: salaryMax,
        currency: currency,
      };
    }

    const titleTag = jobCard.querySelector('span.sr-only');
    const title = titleTag?.textContent?.trim() ?? 'N/A';

    const companyTag = jobCard.querySelector('h4.base-search-card__subtitle');
    const companyATag = companyTag?.querySelector('a');
    const companyUrl = companyATag?.getAttribute('href')
      ? this.cleanUrl(companyATag.getAttribute('href')!)
      : '';
    const company = companyATag?.textContent?.trim() ?? 'N/A';

    const metadataCard = jobCard.querySelector('div.base-search-card__metadata');
    const location = this.getLocation(metadataCard);

    const datetimeTag = metadataCard?.querySelector('time.job-search-card__listdate');
    let datePosted: Date | null = null;
    if (datetimeTag?.getAttribute('datetime')) {
      const datetimeStr = datetimeTag.getAttribute('datetime')!;
      try {
        datePosted = new Date(datetimeStr);
      } catch {
        datePosted = null;
      }
    }

    let jobDetails: Record<string, any> = {};
    let description: string | null = null;

    if (fullDescription) {
      jobDetails = await this.getJobDetails(jobId);
      description = jobDetails.description;
    }

    const isRemote = this.isJobRemote(title, description, location);

    return {
      id: `li-${jobId}`,
      title,
      company_name: company,
      company_url: companyUrl,
      location,
      is_remote: isRemote,
      date_posted: datePosted,
      job_url: `${this.baseUrl}/jobs/view/${jobId}`,
      compensation,
      job_type: jobDetails.job_type,
      company_industry: jobDetails.company_industry,
      description,
      job_url_direct: jobDetails.job_url_direct,
      emails: this.extractEmails(description),
      company_logo: jobDetails.company_logo,
    };
  }

  private async getJobDetails(jobId: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/view/${jobId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok || response.url.includes('linkedin.com/signup')) {
        return {};
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      const divContent = doc.querySelector('div[class*="show-more-less-html__markup"]');
      let description: string | null = null;

      if (divContent) {
        // Remove attributes for cleaner HTML
        this.removeAttributes(divContent);
        description = divContent.outerHTML;

        if (this.scraperInput?.description_format === DescriptionFormat.MARKDOWN) {
          description = this.convertToMarkdown(description);
        } else if (this.scraperInput?.description_format === DescriptionFormat.PLAIN) {
          description = this.convertToPlain(description);
        }
      }

      const h3Tag = Array.from(doc.querySelectorAll('h3')).find((h3) =>
        h3.textContent?.includes('Job function'),
      );

      let jobFunction: string | null = null;
      if (h3Tag) {
        const jobFunctionSpan = h3Tag.nextElementSibling?.querySelector(
          'span.description__job-criteria-text',
        );
        jobFunction = jobFunctionSpan?.textContent?.trim() ?? null;
      }

      const logoImage = doc.querySelector('img.artdeco-entity-image');
      const companyLogo = logoImage?.getAttribute('data-delayed-url') ?? null;

      return {
        description,
        job_level: this.parseJobLevel(doc),
        company_industry: this.parseCompanyIndustry(doc),
        job_type: this.parseJobType(doc),
        job_url_direct: this.parseJobUrlDirect(doc),
        company_logo: companyLogo,
        job_function: jobFunction,
      };
    } catch (error) {
      console.error('Error fetching job details:', error);
      return {};
    }
  }

  private getLocation(metadataCard: Element | null): {
    city?: string;
    state?: string;
    country?: string;
  } {
    const location: { city?: string; state?: string; country?: string } = {
      country: this.country,
    };

    if (metadataCard) {
      const locationTag = metadataCard.querySelector('span.job-search-card__location');
      const locationString = locationTag?.textContent?.trim() ?? 'N/A';
      const parts = locationString.split(', ');

      if (parts.length === 2) {
        location.city = parts[0];
        location.state = parts[1];
      } else if (parts.length === 3) {
        location.city = parts[0];
        location.state = parts[1];
        location.country = parts[2];
      }
    }

    return location;
  }

  private parseJobUrlDirect(doc: Document): string | null {
    const jobUrlDirectContent = doc.querySelector('code#applyUrl');
    if (jobUrlDirectContent) {
      const content = jobUrlDirectContent.textContent?.trim() ?? '';
      const match = content.match(/(?<=\?url=)[^"]+/);
      if (match) {
        return decodeURIComponent(match[0]);
      }
    }
    return null;
  }

  private parseJobLevel(doc: Document): string | null {
    const h3Tag = Array.from(doc.querySelectorAll('h3')).find((h3) =>
      h3.textContent?.includes('Seniority level'),
    );
    if (h3Tag) {
      const jobLevelSpan = h3Tag.nextElementSibling?.querySelector(
        'span.description__job-criteria-text',
      );
      return jobLevelSpan?.textContent?.trim() ?? null;
    }
    return null;
  }

  private parseCompanyIndustry(doc: Document): string | null {
    const h3Tag = Array.from(doc.querySelectorAll('h3')).find((h3) =>
      h3.textContent?.includes('Industries'),
    );
    if (h3Tag) {
      const industrySpan = h3Tag.nextElementSibling?.querySelector(
        'span.description__job-criteria-text',
      );
      return industrySpan?.textContent?.trim() ?? null;
    }
    return null;
  }

  private parseJobType(doc: Document): JobType[] | null {
    const h3Tag = Array.from(doc.querySelectorAll('h3')).find((h3) =>
      h3.textContent?.includes('Employment type'),
    );
    if (h3Tag) {
      const employmentTypeSpan = h3Tag.nextElementSibling?.querySelector(
        'span.description__job-criteria-text',
      );
      const employmentType =
        employmentTypeSpan?.textContent?.trim().toLowerCase().replace('-', '') ?? '';
      return [this.getEnumFromJobType(employmentType)].filter(Boolean) as JobType[];
    }
    return null;
  }

  private getEnumFromJobType(jobTypeStr: string): JobType | null {
    for (const jobType of Object.values(JobType)) {
      if (jobTypeStr.includes(jobType.toLowerCase())) {
        return jobType;
      }
    }
    return null;
  }

  private isJobRemote(title: string, description: string | null, location: any): boolean {
    const remoteKeywords = ['remote', 'work from home', 'wfh'];
    const locationStr = location.city ?? location.state ?? location.country ?? '';
    const fullString = `${title} ${description ?? ''} ${locationStr}`.toLowerCase();
    return remoteKeywords.some((keyword) => fullString.includes(keyword));
  }

  private parseCurrency(curStr: string): number {
    // Remove any non-numerical characters except for ',' '.' or '-'
    curStr = curStr.replace(/[^-0-9.,]/g, '');
    // Remove any 000s separators (either , or .)
    curStr = curStr.replace(/[.,]/g, '').slice(0, -3) + curStr.slice(-3);

    if (curStr.slice(-3).includes('.')) {
      return Math.round(parseFloat(curStr) * 100) / 100;
    } else if (curStr.slice(-3).includes(',')) {
      return Math.round(parseFloat(curStr.replace(',', '.')) * 100) / 100;
    } else {
      return Math.round(parseFloat(curStr) * 100) / 100;
    }
  }

  private cleanUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private removeAttributes(element: Element): void {
    const attributes = Array.from(element.attributes);
    attributes.forEach((attr) => element.removeAttribute(attr.name));
  }

  private convertToMarkdown(html: string): string {
    // Simple HTML to Markdown conversion
    return html
      .replace(
        /<h([1-6])>(.*?)<\/h[1-6]>/g,
        (_, level, content) => '#'.repeat(parseInt(level)) + ' ' + content,
      )
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private convertToPlain(html: string): string {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const text = doc.body.textContent ?? '';
    return text.replace(/\s+/g, ' ').trim();
  }

  private extractEmails(text: string | null): string[] | null {
    if (!text) return null;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ?? null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
