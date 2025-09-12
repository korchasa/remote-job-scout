# Indeed Country Code Issue

## Problem

Indeed API error: "Request country us does not correspond to a valid Indeed
site."

## Root Cause

- In `jobCollectionService.ts`, `ScraperInput` is created without `country`
  field
- In `indeed.ts`, when `scraper_input.country` is undefined, it defaults to
  `["www", "us"]` (lowercase)
- API receives lowercase "us" but expects uppercase "US" or different country
  codes

## Solution

1. Add `Country.fromString()` method to convert country names to Country enum
2. Update `jobCollectionService.ts` to set `country` field in `ScraperInput`
3. Fix default fallback in `indeed.ts` to use uppercase country codes
4. Write failing test first, then implement fix

## Status

- [x] Write failing test for country code conversion
- [x] Implement Country.fromString() method
- [x] Update jobCollectionService.ts to use country field
- [x] Fix default country code in indeed.ts
- [x] Run tests and fix any issues

## Results

✅ **Issue Fixed:** Indeed API now correctly receives "US" instead of "us" in country code
✅ **Root Cause:** `jobCollectionService.ts` was not setting `country` field in `ScraperInput`, causing fallback to lowercase "us"
✅ **Solution:** Added `countryFromString()` function and updated service to convert country names to Country enum
✅ **Tests:** All 62 tests pass, including new `countryFromString()` test
✅ **API Integration:** Indeed GraphQL API now works correctly with proper country codes
