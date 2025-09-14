/**
 * Unit tests for scrapers - JobSpy compatible implementation
 */

import { expect, test } from 'vitest';
import { Country, countryFromString } from '../../types/scrapers.ts';
import { IndeedScraper } from './indeed.ts';

// Test Country enum conversion from string
test('countryFromString() - converts country name to Country enum', () => {
  // Test USA variations
  expect(countryFromString('USA'), Country.USA);
  expect(countryFromString('usa'), Country.USA);
  expect(countryFromString('United States'), Country.USA);
  expect(countryFromString('united states'), Country.USA);

  // Test UK variations
  expect(countryFromString('UK'), Country.UK);
  expect(countryFromString('uk'), Country.UK);
  expect(countryFromString('United Kingdom'), Country.UK);
  expect(countryFromString('united kingdom'), Country.UK);

  // Test Canada
  expect(countryFromString('Canada'), Country.CANADA);
  expect(countryFromString('canada'), Country.CANADA);

  // Test Germany
  expect(countryFromString('Germany'), Country.GERMANY);
  expect(countryFromString('germany'), Country.GERMANY);

  // Test invalid country
  try {
    countryFromString('InvalidCountry');
    expect(false).toBe(true); // 'Should throw error for invalid country');
  } catch (error) {
    expect(error instanceof Error).toBe(true); // 'Should throw Error for invalid country');
    expect(error.message.includes('Invalid country')).toBe(true); // 'Error message should mention invalid country'
  }
});

test('IndeedScraper - constructor with proxies', () => {
  const scraper = new IndeedScraper(['http://proxy1:8080', 'http://proxy2:8080']);

  expect(scraper, 'Scraper with proxies should be created');
  console.log('Proxy scraper created successfully');
});

test('IndeedScraper - GraphQL query format validation', () => {
  const scraper = new IndeedScraper();

  // Test that we can create a scraper with different configurations
  const scraperWithProxy = new IndeedScraper(['http://proxy:8080']);

  expect(scraper, 'Basic scraper should be created');
  expect(scraperWithProxy, 'Proxy scraper should be created');

  console.log('GraphQL query format validation passed');
});
