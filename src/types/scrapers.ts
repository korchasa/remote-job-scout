/**
 * Типы и интерфейсы для системы скрапперов вакансий
 * Полностью основаны на JobSpy архитектуре
 */

// Enums
export enum JobType {
  FULL_TIME = 'fulltime',
  PART_TIME = 'parttime',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERNSHIP = 'internship',
  PER_DIEM = 'perdiem',
  NIGHTS = 'nights',
  OTHER = 'other',
  SUMMER = 'summer',
  VOLUNTEER = 'volunteer',
}

export enum Country {
  USA = 'usa,us,united states',
  CANADA = 'canada',
  UK = 'uk,united kingdom',
  GERMANY = 'germany',
  FRANCE = 'france',
  AUSTRALIA = 'australia',
  INDIA = 'india',
  BRAZIL = 'brazil',
  SPAIN = 'spain',
  ITALY = 'italy',
  NETHERLANDS = 'netherlands',
  SWEDEN = 'sweden',
  NORWAY = 'norway',
  DENMARK = 'denmark',
  FINLAND = 'finland',
  POLAND = 'poland',
  BELGIUM = 'belgium',
  AUSTRIA = 'austria',
  SWITZERLAND = 'switzerland',
  PORTUGAL = 'portugal',
  IRELAND = 'ireland',
  NEWZEALAND = 'new zealand',
  SINGAPORE = 'singapore',
  JAPAN = 'japan',
  SOUTHKOREA = 'south korea',
  CHINA = 'china',
  MEXICO = 'mexico',
  ARGENTINA = 'argentina',
  CHILE = 'chile',
  COLOMBIA = 'colombia',
  PERU = 'peru',
}

export enum Site {
  LINKEDIN = 'linkedin',
  INDEED = 'indeed',
  ZIP_RECRUITER = 'zip_recruiter',
  GLASSDOOR = 'glassdoor',
  GOOGLE = 'google',
  OPENAI = 'openai',
  BAYT = 'bayt',
  NAUKRI = 'naukri',
  BDJOBS = 'bdjobs',
}

export enum DescriptionFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PLAIN = 'plain',
}

export enum CompensationInterval {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  DAILY = 'daily',
  HOURLY = 'hourly',
}

// Interfaces and Types
export interface Location {
  country?: Country | string | null;
  city?: string | null;
  state?: string | null;
}

export interface Compensation {
  interval?: CompensationInterval | null;
  min_amount?: number | null;
  max_amount?: number | null;
  currency?: string;
}

export interface JobPost {
  id?: string;
  title: string;
  company_name?: string | null;
  job_url: string;
  job_url_direct?: string | null;
  location?: Location | null;
  description?: string | null;
  company_url?: string | null;
  company_url_direct?: string | null;
  job_type?: JobType[] | null;
  compensation?: Compensation | null;
  date_posted?: Date | null;
  emails?: string[] | null;
  is_remote?: boolean | null;
  listing_type?: string | null;
  company_industry?: string | null;
  company_addresses?: string | null;
  company_num_employees?: string | null;
  company_revenue?: string | null;
  company_description?: string | null;
  company_logo?: string | null;
  banner_photo_url?: string | null;
}

export interface ScraperInput {
  site_type?: Site[];
  search_term?: string | null;
  google_search_term?: string | null;
  location?: string | null;
  country?: Country | null;
  distance?: number | null;
  is_remote?: boolean;
  job_type?: JobType | null;
  easy_apply?: boolean | null;
  offset?: number;
  linkedin_fetch_description?: boolean;
  linkedin_company_ids?: number[] | null;
  description_format?: DescriptionFormat | null;
  request_timeout?: number;
  results_wanted?: number;
  hours_old?: number | null;
  // OpenAI specific fields
  openai_api_key?: string;
  openai_model?: string;
  openai_global_search?: boolean;
  openai_max_results?: number;
}

export interface JobResponse {
  jobs: JobPost[];
}

// Scraper base class
export abstract class Scraper {
  // Имя скрейпера для идентификации источника (вместо Site во внешней логике)
  abstract getName(): string;

  abstract scrape(scraper_input: ScraperInput): JobResponse | Promise<JobResponse>;
}

// Domain mapping for countries - exactly like JobSpy
const COUNTRY_DOMAIN_MAPPING: Record<Country, [string, string]> = {
  [Country.USA]: ['www', 'us'],
  [Country.CANADA]: ['ca', 'ca'],
  [Country.UK]: ['uk', 'gb'],
  [Country.GERMANY]: ['de', 'de'],
  [Country.FRANCE]: ['fr', 'fr'],
  [Country.AUSTRALIA]: ['au', 'au'],
  [Country.INDIA]: ['in', 'in'],
  [Country.BRAZIL]: ['br', 'br'],
  [Country.SPAIN]: ['es', 'es'],
  [Country.ITALY]: ['it', 'it'],
  [Country.NETHERLANDS]: ['nl', 'nl'],
  [Country.SWEDEN]: ['se', 'se'],
  [Country.NORWAY]: ['no', 'no'],
  [Country.DENMARK]: ['dk', 'dk'],
  [Country.FINLAND]: ['fi', 'fi'],
  [Country.POLAND]: ['pl', 'pl'],
  [Country.BELGIUM]: ['be', 'be'],
  [Country.AUSTRIA]: ['at', 'at'],
  [Country.SWITZERLAND]: ['ch', 'ch'],
  [Country.PORTUGAL]: ['pt', 'pt'],
  [Country.IRELAND]: ['ie', 'ie'],
  [Country.NEWZEALAND]: ['nz', 'nz'],
  [Country.SINGAPORE]: ['sg', 'sg'],
  [Country.JAPAN]: ['jp', 'jp'],
  [Country.SOUTHKOREA]: ['kr', 'kr'],
  [Country.CHINA]: ['cn', 'cn'],
  [Country.MEXICO]: ['mx', 'mx'],
  [Country.ARGENTINA]: ['ar', 'ar'],
  [Country.CHILE]: ['cl', 'cl'],
  [Country.COLOMBIA]: ['co', 'co'],
  [Country.PERU]: ['pe', 'pe'],
};

// Helper function to get domain mapping - JobSpy compatible
export function getCountryDomain(country: Country): [string, string] {
  const mapping = COUNTRY_DOMAIN_MAPPING[country] || ['www', 'us'];
  // Return country code in uppercase to match JobSpy indeed_domain_value
  return [mapping[0], mapping[1].toUpperCase()];
}

// Helper function to convert string to Country enum - JobSpy compatible
export function countryFromString(country_str: string): Country {
  country_str = country_str.trim().toLowerCase();
  for (const [key, value] of Object.entries(Country)) {
    if (typeof value === 'string') {
      const country_names = value.split(',').map((name) => name.trim().toLowerCase());
      if (country_names.includes(country_str)) {
        return Country[key as keyof typeof Country];
      }
    }
  }
  const valid_countries = Object.values(Country)
    .filter((country) => typeof country === 'string')
    .map((country) => (country as string).split(',')[0]);
  throw new Error(
    `Invalid country string: '${country_str}'. Valid countries are: ${valid_countries.join(', ')}`,
  );
}

// Legacy types for backward compatibility
export interface LegacyJobPost {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  date_posted?: string;
  job_type?: string;
  is_remote?: boolean;
  salary?: string;
  source: string;
  country?: string;
}

export interface LegacyScraperResponse {
  success: boolean;
  jobs: LegacyJobPost[];
  total_found: number;
  errors: string[];
  source: string;
}
