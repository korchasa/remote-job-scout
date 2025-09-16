# Software Requirements Specification

## System Overview

Web app for remote job search with AI analysis. Node.js runtime, Express.js backend, modular architecture.

## Functional Requirements

### FR-1: Settings ✅ COMPLETED

- **Purpose**: User-configurable search settings stored client-side, sent to server in single request
- **Usage**: User configures positions list, sources, language/country filters. Settings auto-restore from localStorage on reload. Search sends complete config once
- **Acceptance**:
  - Settings: positions list, blacklist items, selected sources
  - Supports language/country filters; countries as allowed values array
  - Persists to localStorage, auto-loads on app start
  - Search sends single consolidated request with current settings

### FR-2: Multi-Stage Search ✅ COMPLETED

- **Purpose**: 3-stage pipeline (Collect → Filter → Enrich) with HTTP polling progress, pause/resume, per-stage statistics
- **Usage**: User starts search from UI, monitors progress via polling, pauses collection, resumes later, views per-stage stats after completion. New search clears previous results before new data arrives
- **Acceptance**:
  - ✅ 3-stage pipeline with explicit transitions, states: pending, running, completed, failed, paused, skipped
  - ✅ Progress via REST API with HTTP polling, real-time UI display
  - ✅ Pause/Resume changes current stage state without data loss
  - ✅ New search clears previous client results before new session start
  - ✅ Statistics: per-stage breakdown incl. filtering results, enrichment metrics (see FR-4/FR-5)

### FR-3: Collection (Stage 1) ✅ COMPLETED

- **Purpose**: Multi-source vacancy collection with parallel processing, exponential backoff, YAML serialization, intermediate progress updates. Tracks token costs for LLM-based sources
- **Usage**: User enables Indeed, LinkedIn, OpenAI WebSearch sources. System processes requests in parallel with concurrency limits, retries on failures (429/403/network) using exponential backoff, writes YAML dumps, provides progress updates. LLM sources display token costs
- **Acceptance**:
  - ✅ Sources: Indeed GraphQL, LinkedIn, Glassdoor GraphQL, OpenAI WebSearch
  - ✅ Parallel processing with configurable concurrency limit
  - ✅ Exponential backoff retries with failure reason logging
  - ✅ Intermediate progress available, displayed in UI during execution
  - ✅ Collected vacancies serialized to YAML during processing
  - ✅ LLM sources track tokens/costs, aggregates shown in progress panel

### FR-4: Filtering (Stage 2) ✅ COMPLETED

- **Purpose**: Auto-filter collected vacancies by user rules (blacklist/whitelist) with detailed skip reason statistics
- **Usage**: Post-collection, system auto-triggers filtering within session, validates vacancies against settings (company blacklist, keywords, language, country whitelist), generates passed/rejected counters with skip reason breakdown
- **Acceptance**:
  - ✅ Filtering auto-starts after collection completion for current session
  - ✅ Applies current user settings: blacklist, title/language rules, country whitelist (string array)
  - ✅ Generates stage statuses, aggregated statistics
  - ✅ Skip reasons available: title_blacklisted_words, language_requirements, country_filter, company_blacklisted

### FR-5: LLM Enrichment (Stage 3) ✅ COMPLETED

**Purpose**: Enrich vacancies using LLM (OpenAI), incl. company research via web search, token/cost tracking, enrichment sources, proper missing data handling
**Acceptance**:

- ✅ LLM integration (OpenAI) performs text enrichment + company research via web search
- ✅ Tracks tokens/costs per vacancy; aggregates shown in progress panel
- ✅ Records enrichment source(s) per vacancy
- ✅ Intermediate results updated for UI during processing

### FR-6: Job Management UI ✅ COMPLETED

**Purpose**: Modern responsive interface for viewing/managing jobs: cards, details, external links, basic blacklist management, themes
**Acceptance**:

- ✅ Job list + detail modal with smooth navigation
- ✅ External links open in new tab with security attributes
- ✅ Basic blacklist operations available in UI; server changes via APIs (as applicable)
- ✅ Interface responsive, supports theme switching; theme choice persists
- ✅ Optimized client-server interaction prevents unnecessary traffic

### FR-7: Favorites ✅ COMPLETED

**Purpose**: Interface for saving/viewing favorite jobs with "Add to Favorites" action + local persistence of user marks
**Acceptance**:

- ✅ "Add to Favorites" action in card + modal
- ✅ Dedicated "Favorites" screen/tab with saved jobs list
- ✅ Favorite jobs persist locally (localStorage) + apply on render
- ✅ Blocking job adds employer to blacklist + updates search settings

### FR-8: Session Snapshots Persistence ✅ COMPLETED

**Purpose**: Server saves search session snapshots (progress + results) to filesystem + restores on startup
**Acceptance**:

- ✅ Snapshots saved to `data/sessions/<sessionId>.json` during processing + stage transitions
- ✅ Client stores sessions in localStorage + restores on startup
- ✅ Completed sessions available read-only; in-progress sessions restore as stopped/paused without data loss
- ✅ No processing duplication after restoration; resumption continues from correct stage boundaries

### FR-9: ETA Calculation & Display ✅ COMPLETED

**Purpose**: Calculate/display estimated completion time (ETA) for each stage based on processing speed + remaining work volume
**Acceptance**:

- ✅ ETA calculated as `(total - processed) / speed × 60` (minutes) with smoothing to reduce fluctuations
- ✅ ETA + completion % available via API + displayed in progress UI
- ✅ Work completion sets ETA to 0 + immediately transitions to next stage
- ✅ Confidence indicators added (green ≥80%, yellow 50-79%, red <50%)
- ✅ Stage-specific ETA displayed only for active stages
- ✅ Smoothing mechanism prevents sharp ETA fluctuations

### FR-11: Client-Side Job Actions (Hide/Block) ✅ COMPLETED

**Purpose**: Job hiding + company blocking stored/applied client-side only, never sent to server
**Acceptance**:

- ✅ localStorage stores hidden job IDs + blocked company names lists
- ✅ Blocked employers + hidden jobs filtered during filtering stage
- ✅ User views hidden jobs list on dedicated screen, compact format: title, employer, date + restore button
- ✅ Hidden jobs list sent to server in query param with fields: employer, job title
- ✅ Job restoration removes filtering

### FR-12: Schema-Based Input Validation & Error Responses ✅ COMPLETED

**Purpose**: All server endpoints validate input against schemas + return standardized error responses on validation failure
**Acceptance**:

- ✅ Search, job action, settings endpoint requests validated against schemas
- ✅ Failure responses include HTTP 400 with `{code, message, details}`, details lists field-specific errors
- ✅ Valid requests passed to business logic; invalid requests don't modify state

### FR-13: Operational Logging & Auditing ✅ COMPLETED

**Purpose**: Record structured logs for user actions, stage transitions, retries, errors with sensitive data masking
**Acceptance**:

- ✅ Logs include timestamps, session IDs, stage names, attempt counts, brief error descriptions
- ✅ Secrets (LLM keys) never logged; masking verified in tests
- ✅ Logs available during development via console + routable to files in Docker

### FR-14: LLM API Key Client-Side Only ✅ COMPLETED

**Purpose**: LLM API key (OpenAI) stored client-side only, sent with enrichment/OpenAI WebSearch requests, never persisted/logged server-side
**Acceptance**:

- ✅ Key stored in client localStorage, excluded from server storage layers
- ✅ Server receives key only as part of enrichment/OpenAI WebSearch operations, doesn't persist to disk/logs
- ✅ Enrichment/OpenAI WebSearch work with valid key + gracefully fail with clear messages on missing/invalid key
- ✅ API key cleared before saving session snapshots to prevent leaks
- ✅ API key format validation + enhanced error handling added
- ✅ All sensitive data masked in logs

## Non-Functional Requirements

### Performance

- UI response < 1s
- 100 jobs processing < 10min
- Parallel request processing

### Reliability

- Graceful API unavailability handling
- Recovery after failures
- Comprehensive logging

### Security

- Input validation all levels
- SQL injection protection
- OpenAI API key client-side only

### Usability

- Intuitive interface
- Responsive design
- Light/dark themes
- Keyboard navigation

## Technical Specifications

### APIs & Integrations

- OpenAI API for LLM processing
- OpenAI WebSearch for global search
- Job scraping: Indeed GraphQL, LinkedIn, Glassdoor GraphQL
- JobSpy reference architecture

### Data Formats

- REST API communication
- JSON data exchange
- YAML job serialization
- HTTP polling for progress
- Express.js middleware

### Session Persistence

- Client: localStorage
- Server: filesystem

### UI/UX

- Modern responsive interface
- Shadcn/ui components
- Accessibility compliance
- Mobile-first design
- Real-time progress tracking

## Current Implementation

### Core Stack

- ✅ Node.js 18+ + Express.js server with Zod validation
- ✅ React 19/TypeScript strict + Vite frontend
- ✅ 3-stage search pipeline (Collect → Filter → Enrich) with pause/resume ✅ COMPLETED
- ✅ 4 scrapers: Indeed GraphQL, LinkedIn, Glassdoor GraphQL, OpenAI WebSearch with retry/backoff

### Features

- ✅ Job UI with Shadcn/ui (47 components), filtering stats, progress dashboard
- ✅ Docker multi-stage build, development containers
- ✅ OpenAI API integration, token/cost tracking, company research
- ✅ LLM enrichment with structured data extraction (company info, job details, location, salary)
- ✅ Enrichment sources tracking + metadata management
- ✅ Graceful error handling for enrichment failures without pipeline interruption
- ✅ **FR-11 Client-Side Job Actions**: Privacy-focused localStorage persistence for hidden jobs + blocked companies ✅ COMPLETED
- ✅ **FR-12 Input Validation**: Zod schema validation for all API endpoints with standardized error responses ✅ COMPLETED
- ✅ **FR-13 Operational Logging + Auditing**: Structured logging with session IDs, timestamps, stage transitions, sensitive data masking ✅ COMPLETED
- ✅ **FR-14 API Key Client-Side Only**: OpenAI API key stored only in browser localStorage, never persisted server-side ✅ COMPLETED

### Quality Assurance

- ✅ Client-side filtering with reactive UI updates + dedicated management interface
- ✅ TypeScript strict mode, type-safe schemas, Zod validation schemas
- ✅ Vitest testing (85+ tests pass), React Testing Library, 33 new tests for FR-11, validation tests for FR-12
- ✅ ESLint/Prettier code quality, automated checks
- ✅ CLI workflow (`./run` commands)
- ✅ YAML serialization, filesystem session persistence, localStorage client settings
- ✅ HTTP polling, real-time progress, ETA calculation
