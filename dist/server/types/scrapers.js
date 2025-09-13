/**
 * Типы и интерфейсы для системы скрапперов вакансий
 * Полностью основаны на JobSpy архитектуре
 */
// Enums
export var JobType;
(function (JobType) {
    JobType["FULL_TIME"] = "fulltime";
    JobType["PART_TIME"] = "parttime";
    JobType["CONTRACT"] = "contract";
    JobType["TEMPORARY"] = "temporary";
    JobType["INTERNSHIP"] = "internship";
    JobType["PER_DIEM"] = "perdiem";
    JobType["NIGHTS"] = "nights";
    JobType["OTHER"] = "other";
    JobType["SUMMER"] = "summer";
    JobType["VOLUNTEER"] = "volunteer";
})(JobType || (JobType = {}));
export var Country;
(function (Country) {
    Country["USA"] = "usa,us,united states";
    Country["CANADA"] = "canada";
    Country["UK"] = "uk,united kingdom";
    Country["GERMANY"] = "germany";
    Country["FRANCE"] = "france";
    Country["AUSTRALIA"] = "australia";
    Country["INDIA"] = "india";
    Country["BRAZIL"] = "brazil";
    Country["SPAIN"] = "spain";
    Country["ITALY"] = "italy";
    Country["NETHERLANDS"] = "netherlands";
    Country["SWEDEN"] = "sweden";
    Country["NORWAY"] = "norway";
    Country["DENMARK"] = "denmark";
    Country["FINLAND"] = "finland";
    Country["POLAND"] = "poland";
    Country["BELGIUM"] = "belgium";
    Country["AUSTRIA"] = "austria";
    Country["SWITZERLAND"] = "switzerland";
    Country["PORTUGAL"] = "portugal";
    Country["IRELAND"] = "ireland";
    Country["NEWZEALAND"] = "new zealand";
    Country["SINGAPORE"] = "singapore";
    Country["JAPAN"] = "japan";
    Country["SOUTHKOREA"] = "south korea";
    Country["CHINA"] = "china";
    Country["MEXICO"] = "mexico";
    Country["ARGENTINA"] = "argentina";
    Country["CHILE"] = "chile";
    Country["COLOMBIA"] = "colombia";
    Country["PERU"] = "peru";
})(Country || (Country = {}));
export var Site;
(function (Site) {
    Site["LINKEDIN"] = "linkedin";
    Site["INDEED"] = "indeed";
    Site["ZIP_RECRUITER"] = "zip_recruiter";
    Site["GLASSDOOR"] = "glassdoor";
    Site["GOOGLE"] = "google";
    Site["BAYT"] = "bayt";
    Site["NAUKRI"] = "naukri";
    Site["BDJOBS"] = "bdjobs";
})(Site || (Site = {}));
export var DescriptionFormat;
(function (DescriptionFormat) {
    DescriptionFormat["MARKDOWN"] = "markdown";
    DescriptionFormat["HTML"] = "html";
    DescriptionFormat["PLAIN"] = "plain";
})(DescriptionFormat || (DescriptionFormat = {}));
export var CompensationInterval;
(function (CompensationInterval) {
    CompensationInterval["YEARLY"] = "yearly";
    CompensationInterval["MONTHLY"] = "monthly";
    CompensationInterval["WEEKLY"] = "weekly";
    CompensationInterval["DAILY"] = "daily";
    CompensationInterval["HOURLY"] = "hourly";
})(CompensationInterval || (CompensationInterval = {}));
// Scraper base class
export class Scraper {
    site;
    proxies;
    ca_cert;
    user_agent;
    constructor(site, proxies, ca_cert, user_agent) {
        this.site = site;
        this.proxies = proxies;
        this.ca_cert = ca_cert;
        this.user_agent = user_agent;
    }
    /**
     * Проверить доступность источника
     */
    checkAvailability() {
        return Promise.resolve(true);
    }
}
// Domain mapping for countries - exactly like JobSpy
const COUNTRY_DOMAIN_MAPPING = {
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
export function getCountryDomain(country) {
    const mapping = COUNTRY_DOMAIN_MAPPING[country] || ['www', 'us'];
    // Return country code in uppercase to match JobSpy indeed_domain_value
    return [mapping[0], mapping[1].toUpperCase()];
}
// Helper function to convert string to Country enum - JobSpy compatible
export function countryFromString(country_str) {
    country_str = country_str.trim().toLowerCase();
    for (const [key, value] of Object.entries(Country)) {
        if (typeof value === 'string') {
            const country_names = value.split(',').map((name) => name.trim().toLowerCase());
            if (country_names.includes(country_str)) {
                return Country[key];
            }
        }
    }
    const valid_countries = Object.values(Country)
        .filter((country) => typeof country === 'string')
        .map((country) => country.split(',')[0]);
    throw new Error(`Invalid country string: '${country_str}'. Valid countries are: ${valid_countries.join(', ')}`);
}
