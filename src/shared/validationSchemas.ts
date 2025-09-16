/**
 * Validation schemas for API endpoints using Zod
 * Provides input validation for all server endpoints with standardized error responses
 */

import { z } from 'zod';

// Common validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const sessionIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Session ID must contain only alphanumeric characters, hyphens, and underscores',
  );

// Language requirement schema
export const languageRequirementSchema = z.object({
  language: z.string().min(1).max(50),
  level: z.enum(['basic', 'intermediate', 'advanced', 'native']),
});

// Job update schema for PATCH /api/jobs/:id
export const jobUpdateSchema = z
  .object({
    status: z.enum(['pending', 'filtered', 'enriched', 'skipped', 'blacklisted']).optional(),
    statusReason: z.string().max(500).optional(),
    rawData: z.record(z.unknown()).optional(),
    techStack: z.array(z.string()).optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    compensation: z.string().optional(),
    currency: z.string().length(3).optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
    seniority: z.string().optional(),
    remoteType: z.string().optional(),
    timeZone: z.string().optional(),
    companySize: z.string().optional(),
    industry: z.string().optional(),
    companyWebsite: z.string().url().optional(),
  })
  .refine(
    (data) => {
      // Ensure salaryMin <= salaryMax if both are provided
      if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
        return data.salaryMin <= data.salaryMax;
      }
      return true;
    },
    {
      message: 'salaryMin must be less than or equal to salaryMax',
      path: ['salaryMin'],
    },
  );

// Jobs query schema for GET /api/jobs
export const jobsQuerySchema = z.object({
  status: z.enum(['pending', 'filtered', 'enriched', 'skipped', 'blacklisted']).optional(),
  source: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Search request schema for POST /api/search and POST /api/multi-stage/search
export const searchRequestSchema = z.object({
  settings: z.object({
    searchPositions: z
      .array(z.string().min(1).max(200))
      .min(1, 'At least one search position is required'),
    filters: z
      .object({
        blacklistedCompanies: z.array(z.string().max(100)).default([]),
        blacklistedWordsTitle: z.array(z.string().max(100)).default([]),
        blacklistedWordsDescription: z.array(z.string().max(100)).default([]),
        countries: z.array(z.string().max(100)).default([]),
        languages: z.array(languageRequirementSchema).default([]),
      })
      .default({}),
    sources: z.object({
      jobSites: z.array(z.string().min(1).max(50)).min(1, 'At least one job source is required'),
      openaiWebSearch: z
        .object({
          apiKey: z.string().min(1, 'OpenAI API key is required'),
          searchSites: z.array(z.string().url()).default([]),
          globalSearch: z.boolean().default(false),
        })
        .optional(),
    }),
    llm: z
      .object({
        enrichmentInstructions: z.array(z.string().max(1000)).default([]),
        processingRules: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              prompt: z.string().min(1).max(2000),
            }),
          )
          .default([]),
      })
      .default({}),
  }),
  session_id: sessionIdSchema,
});

// Resume search schema for POST /api/multi-stage/resume/:sessionId
export const resumeSearchSchema = z.object({
  settings: z.object({
    searchPositions: z.array(z.string().min(1).max(200)).min(1),
    filters: z
      .object({
        blacklistedCompanies: z.array(z.string().max(100)).default([]),
        blacklistedWordsTitle: z.array(z.string().max(100)).default([]),
        blacklistedWordsDescription: z.array(z.string().max(100)).default([]),
        countries: z.array(z.string().max(100)).default([]),
        languages: z.array(languageRequirementSchema).default([]),
      })
      .default({}),
    sources: z.object({
      jobSites: z.array(z.string().min(1).max(50)).min(1),
      openaiWebSearch: z
        .object({
          apiKey: z.string().min(1),
          searchSites: z.array(z.string().url()).default([]),
          globalSearch: z.boolean().default(false),
        })
        .optional(),
    }),
    llm: z
      .object({
        enrichmentInstructions: z.array(z.string().max(1000)).default([]),
        processingRules: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              prompt: z.string().min(1).max(2000),
            }),
          )
          .default([]),
      })
      .default({}),
  }),
  session_id: sessionIdSchema,
});

// Validation error response schema
export const validationErrorResponseSchema = z.object({
  code: z.literal('VALIDATION_ERROR'),
  message: z.string(),
  details: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      received: z.unknown().optional(),
    }),
  ),
});

// Generic API error response schema
export const apiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

// Export inferred types for use in TypeScript
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type ResumeSearchRequest = z.infer<typeof resumeSearchSchema>;
export type JobUpdate = z.infer<typeof jobUpdateSchema>;
export type JobsQuery = z.infer<typeof jobsQuerySchema>;
export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
