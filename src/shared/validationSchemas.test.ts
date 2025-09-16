/**
 * Tests for validation schemas used in API endpoints
 * Ensures schemas correctly validate input data and provide meaningful error messages
 */

import { describe, it, expect } from 'vitest';
import {
  searchRequestSchema,
  resumeSearchSchema,
  jobUpdateSchema,
  jobsQuerySchema,
  sessionIdSchema,
  uuidSchema,
  languageRequirementSchema,
} from './validationSchemas';

describe('Validation Schemas', () => {
  describe('sessionIdSchema', () => {
    it('should validate correct session IDs', () => {
      const validIds = ['session_123', 'test-session', 'session-1', 'a1b2c3'];
      validIds.forEach((id) => {
        expect(() => sessionIdSchema.parse(id)).not.toThrow();
      });
    });

    it('should reject invalid session IDs', () => {
      const invalidIds = ['', 'session with spaces', 'session@invalid', 'session#123'];
      invalidIds.forEach((id) => {
        expect(() => sessionIdSchema.parse(id)).toThrow();
      });
    });

    it('should reject session IDs that are too long', () => {
      const longId = 'a'.repeat(101);
      expect(() => sessionIdSchema.parse(longId)).toThrow();
    });
  });

  describe('uuidSchema', () => {
    it('should validate correct UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => uuidSchema.parse(validUuid)).not.toThrow();
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuid = 'not-a-uuid';
      expect(() => uuidSchema.parse(invalidUuid)).toThrow();
    });
  });

  describe('languageRequirementSchema', () => {
    it('should validate correct language requirements', () => {
      const validLang = {
        language: 'English',
        level: 'intermediate' as const,
      };
      expect(() => languageRequirementSchema.parse(validLang)).not.toThrow();
    });

    it('should reject invalid language levels', () => {
      const invalidLang = {
        language: 'English',
        level: 'expert', // not in enum
      };
      expect(() => languageRequirementSchema.parse(invalidLang)).toThrow();
    });
  });

  describe('jobUpdateSchema', () => {
    it('should validate correct job updates', () => {
      const validUpdate = {
        status: 'enriched' as const,
        statusReason: 'Successfully enriched with LLM',
        techStack: ['React', 'TypeScript'],
      };
      expect(() => jobUpdateSchema.parse(validUpdate)).not.toThrow();
    });

    it('should reject invalid salary ranges', () => {
      const invalidUpdate = {
        salaryMin: 100000,
        salaryMax: 50000, // min > max
      };
      expect(() => jobUpdateSchema.parse(invalidUpdate)).toThrow();
    });

    it('should validate correct salary ranges', () => {
      const validUpdate = {
        salaryMin: 50000,
        salaryMax: 100000,
      };
      expect(() => jobUpdateSchema.parse(validUpdate)).not.toThrow();
    });
  });

  describe('jobsQuerySchema', () => {
    it('should validate correct query parameters', () => {
      const validQuery = {
        status: 'enriched' as const,
        source: 'indeed',
        limit: 25,
        offset: 10,
      };
      expect(() => jobsQuerySchema.parse(validQuery)).not.toThrow();
    });

    it('should apply default values', () => {
      const minimalQuery = {};
      const result = jobsQuerySchema.parse(minimalQuery);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should reject invalid limits', () => {
      const invalidQuery = { limit: 150 }; // exceeds max
      expect(() => jobsQuerySchema.parse(invalidQuery)).toThrow();
    });
  });

  describe('searchRequestSchema', () => {
    const validSearchRequest = {
      settings: {
        searchPositions: ['Software Engineer', 'Frontend Developer'],
        filters: {
          blacklistedCompanies: ['Company A'],
          blacklistedWordsTitle: ['spam'],
          blacklistedWordsDescription: ['unwanted'],
          countries: ['US', 'CA'],
          languages: [{ language: 'English', level: 'intermediate' as const }],
        },
        sources: {
          jobSites: ['indeed', 'linkedin'],
          openaiWebSearch: {
            apiKey: 'sk-valid-api-key',
            searchSites: ['https://example.com'],
            globalSearch: false,
          },
        },
        llm: {
          enrichmentInstructions: ['Analyze job requirements'],
          processingRules: [
            {
              name: 'extract-tech-stack',
              prompt: 'Extract technical skills',
            },
          ],
        },
      },
      session_id: 'test-session-123',
    };

    it('should validate complete search requests', () => {
      expect(() => searchRequestSchema.parse(validSearchRequest)).not.toThrow();
    });

    it('should require at least one search position', () => {
      const invalidRequest = {
        ...validSearchRequest,
        settings: {
          ...validSearchRequest.settings,
          searchPositions: [], // empty array
        },
      };
      expect(() => searchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should require at least one job source', () => {
      const invalidRequest = {
        ...validSearchRequest,
        settings: {
          ...validSearchRequest.settings,
          sources: {
            ...validSearchRequest.settings.sources,
            jobSites: [], // empty array
          },
        },
      };
      expect(() => searchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should validate URL format for search sites', () => {
      const invalidRequest = {
        ...validSearchRequest,
        settings: {
          ...validSearchRequest.settings,
          sources: {
            ...validSearchRequest.settings.sources,
            openaiWebSearch: {
              ...validSearchRequest.settings.sources.openaiWebSearch,
              searchSites: ['not-a-url'],
            },
          },
        },
      };
      expect(() => searchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should make openaiWebSearch optional', () => {
      const requestWithoutOpenAI = {
        ...validSearchRequest,
        settings: {
          ...validSearchRequest.settings,
          sources: {
            jobSites: ['indeed'],
            // openaiWebSearch omitted
          },
        },
      };
      expect(() => searchRequestSchema.parse(requestWithoutOpenAI)).not.toThrow();
    });
  });

  describe('resumeSearchSchema', () => {
    it('should validate resume search requests', () => {
      const validResumeRequest = {
        settings: {
          searchPositions: ['Software Engineer'],
          filters: {
            blacklistedCompanies: [],
            blacklistedWordsTitle: [],
            blacklistedWordsDescription: [],
            countries: [],
            languages: [],
          },
          sources: {
            jobSites: ['indeed'],
          },
          llm: {
            enrichmentInstructions: [],
            processingRules: [],
          },
        },
        session_id: 'resume-session-123',
      };
      expect(() => resumeSearchSchema.parse(validResumeRequest)).not.toThrow();
    });
  });
});
