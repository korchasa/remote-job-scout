# Software Design Specification

## Project Status: 🚀 PRODUCTION READY ✅

**All Core Features COMPLETED**

### Core Features

- ✅ **FR-3 Enhanced Collection**: 4 job sources (Indeed, LinkedIn, Glassdoor, OpenAI WebSearch)
- ✅ 3-stage pipeline (Collect → Filter → Enrich) with pause/resume
- ✅ Real-time progress tracking + HTTP polling
- ✅ Parallel scraping with retry/backoff + concurrency control
- ✅ LLM enrichment with token/cost tracking
- ✅ Session persistence + recovery

### Advanced Features

- ✅ **FR-7 Favorites**: Complete favorites system with localStorage persistence
- ✅ **FR-8 Session Snapshots**: Server-side persistence + restoration of search sessions
- ✅ **FR-9 ETA Calculation**: Real-time ETA with confidence indicators + smoothing
- ✅ **FR-11 Client-Side Job Actions**: Privacy-focused localStorage persistence for hidden jobs + blocked companies
- ✅ **FR-13 Operational Logging + Auditing**: Structured logging with session IDs, timestamps, stage transitions, sensitive data masking
- ✅ **FR-14 API Key Client-Side Only**: OpenAI API key stored only in browser localStorage, never persisted server-side, sanitized in snapshots

## System Architecture

### Core Design

Client-server web app for remote job search with AI analysis. **All core features fully implemented including privacy-focused client-side job management.**

### Subsystems

#### Core

- **✅ Settings**: localStorage persistence, language/country filters
- **✅ Search**: 3-stage pipeline (collect → filter → enrich) with pause/resume ✅ COMPLETED
- **✅ Collection**: Parallel scraping (Indeed GraphQL, LinkedIn, Glassdoor GraphQL, OpenAI WebSearch) with retry/backoff
- **✅ Filtering**: Server-side filtering + client-side privacy filtering (FR-4 + FR-11 COMPLETED)
- **✅ Enrichment**: OpenAI LLM processing, token/cost tracking, company research
- **✅ Storage**: YAML serialization, filesystem session persistence, UI presentation

#### Advanced

- **✅ Client Actions**: localStorage-based job hiding/blocking with reactive filtering
- **✅ Backend**: Express.js middleware, routes, controllers, Zod validation
- **✅ API**: HTTP polling endpoints, schema validation, error handling

### Reference

JobSpy library principles adapted to Node.js ecosystem.

## Component Design

### Frontend

**Tech**: React 19, TypeScript strict, Vite, jsdom testing
**UI**: Shadcn/ui (47 components), Tailwind CSS 4.1+, responsive design
**State**: React Query, custom hooks, localStorage persistence
**Features**: ✅ Multi-stage search UI, progress dashboard with ETA calculation, filtering stats, themes, responsive, real-time polling, session snapshots/persistence, favorites system, **client-side job actions with reactive filtering**

### Backend

**Tech**: Express.js REST API, modular middleware, Zod validation
**Arch**: Service-oriented, separation of concerns, type-safe schemas
**Storage**: ✅ YAML serialization, filesystem session persistence, localStorage client settings
**Services**: ✅ 6 business logic + 4 scrapers, parallel processing, token/cost tracking
**Middleware**: ✅ CORS, logging, security, error handling
**API**: ✅ HTTP polling, pause/resume, Zod schema validation with standardized error responses (FR-12), multi-stage search endpoints with ETA data, session snapshots
**Client Integration**: ✅ Privacy-focused client-side job actions (hide/block) with reactive filtering
**Testing**: ✅ Vitest (118+ tests passed), React component testing, integration fixtures, 33 new tests for FR-11

### Shared

**Schemas**: Type-safe TypeScript
**Comm**: REST API, HTTP polling
**Validation**: Zod schemas with comprehensive input validation + standardized error responses (FR-12)

#### FR-12 Input Validation Implementation

**Comprehensive API Input Validation with Zod**

- **Validation Schemas**: Complete Zod schemas for all API endpoints (search requests, job updates, query parameters)
- **Standardized Error Responses**: HTTP 400 with `{code: "VALIDATION_ERROR", message, details: [...]}` format
- **Middleware Integration**: Express middleware for automatic validation and error handling
- **Type Safety**: Full TypeScript integration with inferred types from Zod schemas
- **Coverage**: All server endpoints validated (jobs, search, multi-stage, session operations)

## Data Architecture

### Entity Model

**✅ Vacancy**: Job data with JSON metadata, enrichment tracking, LLM analysis
**✅ Settings**: User config with language/country filters, blacklist/whitelist
**✅ Progress**: Real-time tracking, 6 states (pending, running, completed, failed, paused, skipped)
**✅ HiddenJob**: Client-side job hiding with metadata (reason, timestamp, source)
**✅ BlockedCompany**: Client-side company blocking with metadata (reason, job count, timestamp)

### Storage Strategy

**✅ Client**: localStorage (privacy-focused, user settings/config persistence, favorites storage, **client-side job actions**, session metadata)
**✅ Server**: YAML serialization, filesystem session snapshots, session recovery
**✅ Format**: YAML for jobs, JSON for API/snapshots, fixtures for testing
**✅ Progress**: Real-time tracking, session persistence, pause/resume support
**✅ Client Actions**: Isolated localStorage for hidden jobs + blocked companies with reactive filtering

## Algorithm Design

### Search Pipeline

1. **✅ Collect**: Parallel scraping, concurrency control, retry/backoff ✅ IMPLEMENTED
2. **✅ Filter**: Server-side criteria validation + client-side privacy filtering ✅ IMPLEMENTED (FR-4 + FR-11 COMPLETED)
3. **✅ Enrich**: OpenAI LLM processing, token/cost accounting ✅ IMPLEMENTED

### Key Algorithms

**✅ ETA**: `(total - processed) / speed × 60` - Real-time calculation with exponential smoothing (α=0.2) + confidence indicators
**✅ Retry**: Exponential backoff `delay = base × 2^(attempt - 1)` - 4 sources
**✅ Concurrency**: Max sources/positions, queue management - Parallel processing
**✅ Progress**: Real-time % updates, ETA calculation with confidence, pause/resume - HTTP polling
**✅ Cost**: Token usage × model rate per vacancy - OpenAI integration
**✅ Client Filtering**: Privacy-focused job hiding/blocking with reactive UI updates - localStorage persistence
**✅ Company Matching**: Case-insensitive company blocking with automatic job filtering

### Rules

- Blacklist filtering priority
- User settings override auto rules
- **Client actions take precedence**: Hidden jobs + blocked companies override server-side results
- **Privacy by design**: Client-side actions never leave browser
- Operations logged for audit
- API key client-side only

## Technology Stack

### Runtime

**Node.js 18+**: JS/TS runtime
**Express.js**: Web framework, middleware
**TypeScript**: Strict compilation
**ESM**: Modern modules (.js extensions)
**Docker**: Multi-stage containers

### Frontend

**✅ React 19**: Component UI framework with TypeScript strict
**✅ Vite**: Fast build tool, HMR, production optimization
**✅ Shadcn/ui**: 47 components, modern responsive design, enhanced job management (FR-6 COMPLETED)
**✅ Tailwind CSS 4.1+**: Utility styling, themes support
**✅ React Query**: API state, caching, real-time updates
**✅ React Testing Library**: Component testing, jsdom environment (85+ tests)

### Backend

**✅ Express.js**: REST API, middleware (CORS, logging, security, error handling)
**✅ fs/promises**: File operations, session persistence, YAML serialization
**✅ YAML**: Data serialization, test fixtures, job storage
**✅ Zod**: Schema validation, input validation, type safety
**✅ JSDOM**: HTML parsing, scraping (Indeed, LinkedIn, Glassdoor)

### Integrations

**OpenAI API**: LLM processing, WebSearch
**JobSpy**: Scraping reference
**NPM**: Package ecosystem

### Development

**✅ Docker**: Containerization, multi-stage builds, development environment
**✅ Vitest**: Testing framework, React component testing (85+ tests, 90% coverage)
**✅ ESLint/Prettier**: Code quality, automated checks, zero warnings
**✅ TypeScript**: Strict compilation, type safety, Zod validation
**✅ CLI**: Unified runner (`./run check`), build/test automation

## Constraints

### Design Decisions

- **Node.js**: Enterprise runtime, extensive ecosystem, TypeScript support
- Client-side storage (privacy over server persistence, localStorage for settings)
- In-memory + filesystem storage (dev optimization with session persistence)
- HTTP polling (efficiency over real-time, pause/resume support)
- Modular architecture (maintainability, separation of concerns)
- Streamlined API (simplicity, schema validation, error handling)

### Performance

- Parallel processing across sources, configurable concurrency
- Lazy loading for large datasets, optimized rendering
- Bundle optimization, code splitting, tree shaking
- API caching, error recovery, retry/backoff strategies

## Extensions

### Current Status: ALL CORE FEATURES ✅ COMPLETE

**All Major Features: FULLY IMPLEMENTED**

- 4 job sources (Indeed, LinkedIn, Glassdoor, OpenAI WebSearch) ✅
- 3-stage pipeline with pause/resume ✅
- Real-time progress tracking ✅
- Parallel scraping with retry/backoff ✅
- LLM enrichment with cost tracking ✅
- Session persistence + recovery ✅
- **Privacy-focused client-side job actions** ✅

### Roadmap

#### Completed Features

- **FR-4**: Filtering (Stage 2) ✅ COMPLETED - Advanced filtering with detailed skip reasons
- **FR-5**: Enrichment with LLM (Stage 3) ✅ COMPLETED - LLM enrichment with token/cost tracking
- **FR-6**: Enhanced job management UI ✅ COMPLETED - Modern responsive job management with cards, details, external links, blacklist management, themes
- **FR-7**: Favorites Feature ✅ COMPLETED - Complete favorites system with localStorage persistence, employer blocking, dedicated UI
- **FR-8**: Session Snapshots ✅ COMPLETED - Server-side persistence + restoration of search sessions
- **FR-9**: ETA Calculation ✅ COMPLETED - Real-time ETA with confidence indicators + smoothing
- **FR-11**: Client-Side Job Actions ✅ COMPLETED - Privacy-focused localStorage persistence for hidden jobs + blocked companies
- **FR-13**: Operational Logging + Auditing ✅ COMPLETED - Structured logging with session IDs, timestamps, stage transitions, sensitive data masking
- **FR-14**: API Key Client-Side Only ✅ COMPLETED - OpenAI API key stored only in browser localStorage, never persisted server-side, sanitized in snapshots

#### Future Enhancements

- **Database Migration**: From in-memory to persistent database (PostgreSQL/MongoDB)
- **Performance**: Caching strategies, CDN integration, query optimization
- **Authentication**: User accounts, personalized dashboards, API rate limiting
- **Mobile**: Progressive Web App (PWA), mobile-optimized interface
- **Analytics**: Usage tracking, performance metrics, A/B testing

### Scalability

- Service modularization, microservices architecture
- Database indexing, query optimization
- Distributed processing, load balancing
- Horizontal scaling, container orchestration
- Caching layers, CDN integration

---

_Last updated: September 16, 2025 - FR-14 API Key Client-Side Only completed_
