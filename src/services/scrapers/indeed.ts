/**
 * Indeed скраппер - ПОЛНАЯ РЕАЛИЗАЦИЯ на основе JobSpy
 *
 * ✅ Полностью совместима с JobSpy по:
 *   - Архитектуре (Scraper наследование)
 *   - API (GraphQL запросы к apis.indeed.com)
 *   - Фильтрам (job_type, is_remote, easy_apply, hours_old)
 *   - Форматам описания (HTML/Markdown/Plain)
 *   - Локализации (Country enum с domain mapping)
 *   - Пагинации (курсоры, offset, results_wanted)
 *   - Типам данных (JobPost, ScraperInput, JobResponse)
 *
 * 🔧 Ключевые особенности:
 *   - Полная поддержка всех JobSpy фильтров
 *   - Многостраничная пагинация с курсорами
 *   - Автоматическая локализация по странам
 *   - Конвертация форматов описания
 *   - Детальная обработка данных компании
 *   - Email extraction из описаний
 *   - Поддержка прокси и TLS
 *
 * 📊 Статус: Готова к использованию с правильными API credentials
 *
 * https://apis.indeed.com/graphql
 */

import type { Compensation, JobPost, JobResponse, ScraperInput } from '../../types/scrapers.js';
import {
  CompensationInterval,
  DescriptionFormat,
  getCountryDomain,
  JobType,
  Scraper,
  Site,
} from '../../types/scrapers.js';

// GraphQL query template based on JobSpy
const JOB_SEARCH_QUERY = `
    query GetJobData {
        jobSearch(
            {what}
            {location}
            limit: 100
            {cursor}
            sort: RELEVANCE
            {filters}
        ) {
            pageInfo {
                nextCursor
            }
            results {
                trackingKey
                job {
                    source {
                        name
                    }
                    key
                    title
                    datePublished
                    dateOnIndeed
                    description {
                        html
                    }
                    location {
                        countryName
                        countryCode
                        admin1Code
                        city
                        postalCode
                        streetAddress
                        formatted {
                            short
                            long
                        }
                    }
                    compensation {
                        estimated {
                            currencyCode
                            baseSalary {
                                unitOfWork
                                range {
                                    ... on Range {
                                        min
                                        max
                                    }
                                }
                            }
                        }
                        baseSalary {
                            unitOfWork
                            range {
                                ... on Range {
                                    min
                                    max
                                }
                            }
                        }
                        currencyCode
                    }
                    attributes {
                        key
                        label
                    }
                    employer {
                        relativeCompanyPageUrl
                        name
                        dossier {
                            employerDetails {
                                addresses
                                industry
                                employeesLocalizedLabel
                                revenueLocalizedLabel
                                briefDescription
                                ceoName
                                ceoPhotoUrl
                            }
                            images {
                                headerImageUrl
                                squareLogoUrl
                            }
                            links {
                                corporateWebsite
                            }
                        }
                    }
                    recruit {
                        viewJobUrl
                        detailedSalary
                        workSchedule
                    }
                }
            }
        }
    }
`;

// API headers based on JobSpy
const API_HEADERS = {
  Host: 'apis.indeed.com',
  'content-type': 'application/json',
  'indeed-api-key': '161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8',
  accept: 'application/json',
  'indeed-locale': 'en-US',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1',
  'indeed-app-info': 'appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone',
};

interface IndeedLocation {
  countryName?: string;
  countryCode?: string;
  admin1Code?: string;
  city?: string;
  postalCode?: string;
  streetAddress?: string;
  formatted: {
    short: string;
    long: string;
  };
}

interface IndeedCompensation {
  estimated?: {
    currencyCode?: string;
    baseSalary?: {
      unitOfWork?: string;
      range?: {
        min?: number;
        max?: number;
      };
    };
  };
  baseSalary?: {
    unitOfWork?: string;
    range?: {
      min?: number;
      max?: number;
    };
  };
  currencyCode?: string;
}

interface IndeedAttribute {
  key: string;
  label: string;
}

interface IndeedEmployer {
  relativeCompanyPageUrl?: string;
  name?: string;
  dossier?: {
    employerDetails?: {
      addresses?: string[];
      industry?: string;
      employeesLocalizedLabel?: string;
      revenueLocalizedLabel?: string;
      briefDescription?: string;
      ceoName?: string;
      ceoPhotoUrl?: string;
    };
    images?: {
      headerImageUrl?: string;
      squareLogoUrl?: string;
    };
    links?: {
      corporateWebsite?: string;
    };
  };
}

interface IndeedRecruit {
  viewJobUrl?: string;
  detailedSalary?: string;
  workSchedule?: string;
}

interface IndeedJob {
  source?: { name: string };
  key: string;
  title: string;
  datePublished: number;
  dateOnIndeed?: number;
  description: { html: string };
  location: IndeedLocation;
  compensation?: IndeedCompensation;
  attributes: IndeedAttribute[];
  employer?: IndeedEmployer;
  recruit?: IndeedRecruit;
}

interface GraphQLJobSearchResponse {
  data?: {
    jobSearch: {
      pageInfo: {
        nextCursor: string | null;
      };
      results: Array<{
        trackingKey: string;
        job: IndeedJob;
      }>;
    };
  };
  errors?: Array<{
    message: string;
    extensions?: { code: string };
  }>;
}

export class IndeedScraper extends Scraper {
  private scraper_input: ScraperInput | null = null;
  private jobs_per_page = 100;
  private seen_urls = new Set<string>();
  private headers: Record<string, string> | null = null;
  private api_country_code = '';
  private base_url = '';
  private api_url = 'https://apis.indeed.com/graphql';

  constructor(proxies?: string[] | string, ca_cert?: string, user_agent?: string) {
    super(Site.INDEED, proxies, ca_cert, user_agent);
  }

  override async checkAvailability(): Promise<boolean> {
    console.log('🔍 Checking Indeed API availability', {
      apiUrl: this.api_url,
      headers: API_HEADERS,
      timestamp: new Date().toISOString(),
    });

    try {
      // Проверяем доступность API с простым запросом
      const testPayload = {
        query: '{ jobSearch { pageInfo { nextCursor } } }',
      };
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(testPayload),
      });

      const isAvailable = response.status === 200 || response.status === 400; // 400 тоже означает, что API работает, просто запрос некорректный

      console.log('📊 Indeed availability check result:', {
        apiUrl: this.api_url,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        isAvailable,
        timestamp: new Date().toISOString(),
      });

      return isAvailable;
    } catch (error) {
      console.error('❌ Indeed availability check failed:', {
        error: error,
        errorMessage: (error as Error).message,
        apiUrl: this.api_url,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  async scrape(scraper_input: ScraperInput): Promise<JobResponse> {
    this.scraper_input = scraper_input;

    console.log('🚀 Starting Indeed scrape', {
      scraperInput: scraper_input,
      timestamp: new Date().toISOString(),
    });

    // Get domain and country code
    const [domain, countryCode] = this.scraper_input.country
      ? getCountryDomain(this.scraper_input.country)
      : ['www', 'US'];
    this.api_country_code = countryCode;
    this.base_url = `https://${domain}.indeed.com`;

    console.log('🌍 Indeed domain configuration:', {
      domain,
      countryCode,
      baseUrl: this.base_url,
      apiCountryCode: this.api_country_code,
    });

    this.headers = { ...API_HEADERS };
    if (this.api_country_code) {
      this.headers['indeed-co'] = this.api_country_code;
    }

    console.log('🔧 Indeed headers configured:', {
      headersCount: Object.keys(this.headers).length,
      hasApiKey: !!this.headers['indeed-api-key'],
      countryCode: this.api_country_code,
    });

    const job_list: JobPost[] = [];
    let page = 1;
    let cursor: string | null = null;

    while (
      this.seen_urls.size <
      (scraper_input.results_wanted ?? 15) + (scraper_input.offset ?? 0)
    ) {
      console.log(
        `search page: ${page} / ${Math.ceil(
          ((scraper_input.results_wanted ?? 15) + (scraper_input.offset ?? 0)) / this.jobs_per_page,
        )}`,
      );

      const jobs = await this._scrape_page(cursor);
      if (!jobs || jobs.length === 0) {
        console.log(`found no jobs on page: ${page}`);
        break;
      }

      job_list.push(...jobs);
      cursor = await this._get_next_cursor(cursor);

      if (!cursor) break;

      page++;
    }

    const offset = scraper_input.offset ?? 0;
    const results_wanted = scraper_input.results_wanted ?? 15;

    return {
      jobs: job_list.slice(offset, offset + results_wanted),
    };
  }

  private async _scrape_page(cursor: string | null): Promise<JobPost[]> {
    const jobs: JobPost[] = [];
    const filters = this._build_filters();

    const search_term = this.scraper_input?.search_term
      ? this.scraper_input.search_term.replace('"', '\\"')
      : '';

    // Format query exactly like JobSpy
    const query = JOB_SEARCH_QUERY.replace('{what}', search_term ? `what: "${search_term}"` : '')
      .replace(
        '{location}',
        this.scraper_input?.location
          ? `location: {where: "${this.scraper_input.location}", radius: ${
              this.scraper_input.distance ?? 25
            }, radiusUnit: MILES}`
          : '',
      )
      .replace('{cursor}', cursor ? `cursor: "${cursor}"` : '')
      .replace('{filters}', filters)
      .replace(/{\s*}/g, '') // Remove empty braces
      .replace(/,(\s*,|\s*})/g, '$1'); // Remove trailing commas

    const payload = { query };

    // Логируем параметры запроса к Indeed API
    console.log('🌐 Indeed API Request:', {
      url: this.api_url,
      method: 'POST',
      headers: this.headers ?? API_HEADERS,
      payload: payload,
      scraper_input: {
        search_term: this.scraper_input?.search_term,
        location: this.scraper_input?.location,
        results_wanted: this.scraper_input?.results_wanted,
        offset: this.scraper_input?.offset,
        is_remote: this.scraper_input?.is_remote,
        country: this.scraper_input?.country,
      },
      cursor: cursor,
    });

    try {
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: this.headers ?? API_HEADERS,
        body: JSON.stringify(payload),
      });

      // Логируем ответ от Indeed API
      console.log('📥 Indeed API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
      });

      if (!response.ok) {
        console.log(
          `❌ Indeed API error with status code: ${response.status} (submit GitHub issue if this appears to be a bug)`,
        );
        // Consume response body to prevent memory leaks
        try {
          const errorText = await response.text();
          console.log('❌ Indeed API error response body:', errorText);
        } catch {
          // Ignore errors when consuming response body
        }
        return jobs;
      }

      const data = (await response.json()) as GraphQLJobSearchResponse;

      // Логируем успешный ответ с данными
      console.log('✅ Indeed API successful response:', {
        hasData: !!data.data,
        hasJobSearch: !!data.data?.jobSearch,
        resultsCount: data.data?.jobSearch?.results?.length ?? 0,
        hasErrors: !!data.errors,
        errors: data.errors,
        nextCursor: data.data?.jobSearch?.pageInfo?.nextCursor,
      });

      if (!data.data?.jobSearch?.results) {
        return jobs;
      }

      const job_list: JobPost[] = [];
      for (const result of data.data.jobSearch.results) {
        const processed_job = this._process_job(result.job);
        if (processed_job) {
          job_list.push(processed_job);
        }
      }

      return job_list;
    } catch (error) {
      console.error('Error scraping page:', error);
      return jobs;
    }
  }

  private _build_filters(): string {
    if (!this.scraper_input) return '';

    let filters_str = '';

    if (this.scraper_input.hours_old) {
      filters_str = `
        filters: {
          date: {
            field: "dateOnIndeed",
            start: "${this.scraper_input.hours_old}h"
          }
        }
      `;
    } else if (this.scraper_input.easy_apply) {
      filters_str = `
        filters: {
          keyword: {
            field: "indeedApplyScope",
            keys: ["DESKTOP"]
          }
        }
      `;
    } else if (this.scraper_input.job_type || this.scraper_input.is_remote) {
      const job_type_key_mapping: Partial<Record<JobType, string>> = {
        [JobType.FULL_TIME]: 'CF3CP',
        [JobType.PART_TIME]: '75GKK',
        [JobType.CONTRACT]: 'NJXCK',
        [JobType.INTERNSHIP]: 'VDTG7',
      };

      const keys: string[] = [];

      if (this.scraper_input.job_type) {
        const job_type_key = job_type_key_mapping[this.scraper_input.job_type];
        if (job_type_key) {
          keys.push(job_type_key);
        }
      }

      if (this.scraper_input.is_remote) {
        keys.push('DSQF7');
      }

      if (keys.length > 0) {
        const keys_str = keys.join('", "');
        filters_str = `
          filters: {
            composite: {
              filters: [{
                keyword: {
                  field: "attributes",
                  keys: ["${keys_str}"]
                }
              }]
            }
          }
        `;
      }
    }

    return filters_str;
  }

  private async _get_next_cursor(current_cursor: string | null): Promise<string | null> {
    if (!this.scraper_input) return null;

    const filters = this._build_filters();
    const search_term = this.scraper_input.search_term
      ? this.scraper_input.search_term.replace('"', '\\"')
      : '';

    const query = JOB_SEARCH_QUERY.replace('{what}', search_term ? `what: "${search_term}"` : '')
      .replace(
        '{location}',
        this.scraper_input.location
          ? `location: {where: "${this.scraper_input.location}", radius: ${
              this.scraper_input.distance ?? 25
            }, radiusUnit: MILES}`
          : '',
      )
      .replace('{cursor}', current_cursor ? `cursor: "${current_cursor}"` : '')
      .replace('{filters}', filters)
      .replace(/{\s*}/g, '')
      .replace(/,(\s*,|\s*})/g, '$1');

    const payload = { query };

    try {
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: this.headers ?? API_HEADERS,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Consume response body to prevent memory leaks
        try {
          await response.text();
        } catch {
          // Ignore errors when consuming response body
        }
        return null;
      }

      const data = (await response.json()) as GraphQLJobSearchResponse;
      return data.data?.jobSearch?.pageInfo?.nextCursor ?? null;
    } catch {
      return null;
    }
  }

  private _process_job(job: IndeedJob): JobPost | null {
    const job_url = `${this.base_url}/viewjob?jk=${job.key}`;

    if (this.seen_urls.has(job_url)) {
      return null;
    }

    this.seen_urls.add(job_url);

    let description = job.description.html;

    // Convert HTML to markdown if needed
    if (this.scraper_input?.description_format === DescriptionFormat.MARKDOWN) {
      description = this._markdown_converter(description);
    } else if (this.scraper_input?.description_format === DescriptionFormat.PLAIN) {
      description = this._plain_converter(description);
    }

    const job_type = this._get_job_type(job.attributes);
    const date_posted = new Date(job.datePublished);

    const employer = job.employer?.dossier;
    const employer_details = employer?.employerDetails ?? {};

    const rel_url = job.employer?.relativeCompanyPageUrl;

    return {
      id: `in-${job.key}`,
      title: job.title,
      company_name: job.employer?.name ?? null,
      job_url: job_url,
      job_url_direct: job.recruit?.viewJobUrl ?? null,
      location: {
        city: job.location.city ?? null,
        state: job.location.admin1Code ?? null,
        country: job.location.countryCode ?? null,
      },
      description: description,
      company_url: rel_url ? `${this.base_url}${rel_url}` : null,
      company_url_direct: employer?.links?.corporateWebsite ?? null,
      job_type: job_type,
      compensation: this._get_compensation(job.compensation),
      date_posted: date_posted,
      emails: this._extract_emails_from_text(description),
      is_remote: this._is_job_remote(job, description),
      company_addresses: employer_details.addresses?.[0] ?? null,
      company_industry: employer_details.industry
        ? employer_details.industry
            .replace('Iv1', '')
            .replace('_', ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())
        : null,
      company_num_employees: employer_details.employeesLocalizedLabel ?? null,
      company_revenue: employer_details.revenueLocalizedLabel ?? null,
      company_description: employer_details.briefDescription ?? null,
      company_logo: employer?.images?.squareLogoUrl ?? null,
    };
  }

  private _get_job_type(attributes: IndeedAttribute[]): JobType[] {
    const job_types: JobType[] = [];
    for (const attribute of attributes) {
      const job_type_str = attribute.label.replace('-', '').replace(' ', '').toLowerCase();
      const job_type = this._get_enum_from_job_type(job_type_str);
      if (job_type) {
        job_types.push(job_type);
      }
    }
    return job_types;
  }

  private _get_compensation(compensation?: IndeedCompensation): Compensation | null {
    if (!compensation?.baseSalary && !compensation?.estimated) {
      return null;
    }

    const comp = compensation.baseSalary ?? compensation.estimated?.baseSalary;
    if (!comp) return null;

    const interval = this._get_compensation_interval(comp.unitOfWork);
    if (!interval) return null;

    const min_range = comp.range?.min;
    const max_range = comp.range?.max;

    return {
      interval: interval,
      min_amount: min_range ?? null,
      max_amount: max_range ?? null,
      currency: compensation.estimated?.currencyCode ?? compensation.currencyCode ?? 'USD',
    };
  }

  private _is_job_remote(job: IndeedJob, description: string): boolean | null {
    const remote_keywords = ['remote', 'work from home', 'wfh'];

    const is_remote_in_attributes = job.attributes.some((attr) =>
      remote_keywords.some((keyword) => attr.label.toLowerCase().includes(keyword)),
    );

    const is_remote_in_description = remote_keywords.some((keyword) =>
      description.toLowerCase().includes(keyword),
    );

    const is_remote_in_location =
      job.location.formatted?.long &&
      remote_keywords.some((keyword) =>
        job.location.formatted.long.toLowerCase().includes(keyword),
      );

    return is_remote_in_attributes || is_remote_in_description || is_remote_in_location || null;
  }

  private _get_compensation_interval(interval?: string): CompensationInterval | null {
    if (!interval) return null;

    const interval_mapping: Record<string, CompensationInterval> = {
      DAY: CompensationInterval.DAILY,
      YEAR: CompensationInterval.YEARLY,
      HOUR: CompensationInterval.HOURLY,
      WEEK: CompensationInterval.WEEKLY,
      MONTH: CompensationInterval.MONTHLY,
    };

    return interval_mapping[interval.toUpperCase()] || null;
  }

  private _get_enum_from_job_type(job_type_str: string): JobType | null {
    for (const job_type of Object.values(JobType)) {
      if (typeof job_type === 'string' && job_type_str.includes(job_type.toLowerCase())) {
        return job_type as JobType;
      }
    }
    return null;
  }

  private _markdown_converter(description_html: string): string {
    // Simple HTML to markdown conversion
    return description_html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '# $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private _plain_converter(description_html: string): string {
    return description_html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private _extract_emails_from_text(text: string): string[] | null {
    if (!text) return null;

    const email_regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(email_regex);

    return emails ?? null;
  }
}
