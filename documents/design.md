# Software Design Specification

## Project Status: 🚀 PRODUCTION READY ✅

**Core FR-2 Multi-Stage Search: COMPLETED**

- ✅ 3-stage pipeline (Collect → Filter → Enrich) with pause/resume
- ✅ Real-time progress tracking and HTTP polling
- ✅ Parallel scraping (Indeed, LinkedIn, OpenAI WebSearch)
- ✅ LLM enrichment with token/cost tracking
- ✅ Session persistence and recovery

## System Architecture

### Core Design

Client-server web app for remote job search with AI analysis. **FR-2 Multi-Stage Search fully implemented and tested.**

### Subsystems

- **✅ Settings**: localStorage persistence, language/country filters
- **✅ Search**: 3-stage pipeline (collect → filter → enrich) with pause/resume ✅ COMPLETED
- **✅ Collection**: Parallel scraping (Indeed GraphQL, LinkedIn, OpenAI WebSearch) with retry/backoff
- **✅ Filtering**: User criteria validation, blacklist/whitelist, stats tracking
- **✅ Enrichment**: OpenAI LLM processing, token/cost tracking, company research
- **✅ Storage**: YAML serialization, filesystem session persistence, UI presentation
- **✅ Backend**: Express.js middleware, routes, controllers, Zod validation
- **✅ API**: HTTP polling endpoints, schema validation, error handling

### Reference

JobSpy library principles adapted to Node.js ecosystem.

## Component Design

### Frontend

- **Tech**: React 19, TypeScript strict, Vite, jsdom testing
- **UI**: Shadcn/ui (47 components), Tailwind CSS 4.1+, responsive design
- **State**: React Query, custom hooks, localStorage persistence
- **Features**: ✅ Multi-stage search UI, progress dashboard, filtering stats, themes, responsive, real-time polling, session management

### Backend

- **Tech**: Express.js REST API, modular middleware, Zod validation
- **Arch**: Service-oriented, separation of concerns, type-safe schemas
- **Storage**: ✅ YAML serialization, filesystem session persistence, localStorage client settings
- **Services**: ✅ 6 business logic + 3 scrapers, parallel processing, token/cost tracking
- **Middleware**: ✅ CORS, logging, security, error handling
- **API**: ✅ HTTP polling, pause/resume, schema validation, multi-stage search endpoints
- **Testing**: ✅ Vitest (70+ tests passed), React component testing, integration fixtures

### Shared

- **Schemas**: Type-safe TypeScript
- **Comm**: REST API, HTTP polling
- **Validation**: Zod schemas

## Data Architecture

### Entity Model

- **✅ Vacancy**: Job data with JSON metadata, enrichment tracking, LLM analysis
- **✅ Settings**: User config with language/country filters, blacklist/whitelist
- **✅ Progress**: Real-time tracking, 6 states (pending, running, completed, failed, paused, skipped)

### Storage Strategy

- **✅ Client**: localStorage (privacy-focused, user settings/config persistence)
- **✅ Server**: YAML serialization, filesystem session snapshots, session recovery
- **✅ Format**: YAML for jobs, JSON for API, fixtures for testing
- **✅ Progress**: Real-time tracking, session persistence, pause/resume support

## Algorithm Design

### Search Pipeline

1. **✅ Collect**: Parallel scraping, concurrency control, retry/backoff ✅ IMPLEMENTED
2. **✅ Filter**: Criteria validation, stats tracking ✅ IMPLEMENTED
3. **✅ Enrich**: OpenAI LLM processing, token/cost accounting ✅ IMPLEMENTED

### Key Algorithms

- **✅ ETA**: `(total - processed) / speed × 60` - Real-time calculation
- **✅ Retry**: Exponential backoff `delay = base × 2^(attempt - 1)` - 3 sources
- **✅ Concurrency**: Max sources/positions, queue management - Parallel processing
- **✅ Progress**: Real-time % updates, pause/resume - HTTP polling
- **✅ Cost**: Token usage × model rate per vacancy - OpenAI integration

### Rules

- Blacklist filtering priority
- User settings override auto rules
- Operations logged for audit
- API key client-side only

## Technology Stack

### Runtime

- **Node.js 18+**: JS/TS runtime
- **Express.js**: Web framework, middleware
- **TypeScript**: Strict compilation
- **ESM**: Modern modules (.js extensions)
- **Docker**: Multi-stage containers

### Frontend

- **✅ React 19**: Component UI framework with TypeScript strict
- **✅ Vite**: Fast build tool, HMR, production optimization
- **✅ Shadcn/ui**: 47 components, modern responsive design
- **✅ Tailwind CSS 4.1+**: Utility styling, themes support
- **✅ React Query**: API state, caching, real-time updates
- **✅ React Testing Library**: Component testing, jsdom environment (70+ tests)

### Backend

- **✅ Express.js**: REST API, middleware (CORS, logging, security, error handling)
- **✅ fs/promises**: File operations, session persistence, YAML serialization
- **✅ YAML**: Data serialization, test fixtures, job storage
- **✅ Zod**: Schema validation, input validation, type safety
- **✅ JSDOM**: HTML parsing, scraping (Indeed, LinkedIn)

### Integrations

- **OpenAI API**: LLM processing, WebSearch
- **JobSpy**: Scraping reference
- **NPM**: Package ecosystem

### Development

- **✅ Docker**: Containerization, multi-stage builds, development environment
- **✅ Vitest**: Testing framework, React component testing (70+ tests, 90% coverage)
- **✅ ESLint/Prettier**: Code quality, automated checks, zero warnings
- **✅ TypeScript**: Strict compilation, type safety, Zod validation
- **✅ CLI**: Unified runner (`./run check`), build/test automation

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

### Current Status: Core Features ✅ COMPLETE

**FR-2 Multi-Stage Search Pipeline: FULLY IMPLEMENTED**

- 3-stage pipeline with pause/resume ✅
- Real-time progress tracking ✅
- Parallel scraping infrastructure ✅
- LLM enrichment with cost tracking ✅
- Session persistence and recovery ✅

### Roadmap

- **FR-3**: Enhanced collection with additional job sources (Glassdoor, Monster, etc.)
- **FR-4/5**: Advanced filtering options, AI-powered job matching
- **FR-6**: Enhanced job management UI, favorites, bookmarks
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

_Last updated: September 15, 2025_
