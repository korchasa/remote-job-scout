# Software Design Specification

## System Architecture

### Core Design

Client-server web app for remote job search with AI analysis.

### Subsystems

- **Settings**: localStorage persistence, language/country filters
- **Search**: 3-stage pipeline (collect → filter → enrich) with pause/resume
- **Collection**: Parallel scraping (Indeed GraphQL, LinkedIn, OpenAI WebSearch) with retry
- **Filtering**: User criteria validation, blacklist/whitelist, stats tracking
- **Enrichment**: OpenAI LLM processing, token/cost tracking, company research
- **Storage**: YAML serialization, UI presentation
- **Backend**: Express.js middleware, routes, controllers
- **API**: HTTP polling endpoints

### Reference

JobSpy library principles adapted to Node.js ecosystem.

## Component Design

### Frontend

- **Tech**: React 19, TypeScript strict, Vite, jsdom testing
- **UI**: Shadcn/ui (47 components), Tailwind CSS 4.1+
- **State**: React Query, custom hooks, localStorage persistence
- **Features**: Themes, responsive, progress polling, filtering dashboard, user config management

### Backend

- **Tech**: Express.js REST API, modular middleware, Zod validation
- **Arch**: Service-oriented, separation of concerns, type-safe schemas
- **Storage**: In-memory with YAML serialization, filesystem session persistence
- **Services**: 6 business logic + 3 scrapers, parallel processing, token/cost tracking
- **Middleware**: CORS, logging, security, error handling
- **API**: HTTP polling, pause/resume, schema validation
- **Testing**: Vitest coverage, React component testing, integration fixtures

### Shared

- **Schemas**: Type-safe TypeScript
- **Comm**: REST API, HTTP polling
- **Validation**: Zod schemas

## Data Architecture

### Entity Model

- **Vacancy**: Job data with JSON metadata, enrichment tracking
- **Settings**: User config with language/country filters
- **Progress**: Real-time tracking, 6 states (pending, running, completed, failed, stopped, paused, skipped)

### Storage Strategy

- **Client**: localStorage (privacy-focused, user settings/config persistence)
- **Server**: In-memory with YAML serialization, filesystem session snapshots
- **Format**: YAML for jobs, JSON for API, fixtures for testing
- **Progress**: Real-time tracking, session persistence, pause/resume support

## Algorithm Design

### Search Pipeline

1. **Collect**: Parallel scraping, concurrency control, retry/backoff
2. **Filter**: Criteria validation, stats tracking
3. **Enrich**: OpenAI LLM processing, token/cost accounting

### Key Algorithms

- **ETA**: `(total - processed) / speed × 60`
- **Retry**: Exponential backoff `delay = base × 2^(attempt - 1)`
- **Concurrency**: Max sources/positions, queue management
- **Progress**: Real-time % updates, pause/resume
- **Cost**: Token usage × model rate per vacancy

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

- **React 19**: Component UI framework
- **Vite**: Fast build tool, HMR
- **Shadcn/ui**: 47 components
- **Tailwind CSS 4.1+**: Utility styling
- **React Query**: API state, caching
- **React Testing Library**: Component testing, jsdom environment

### Backend

- **Express.js**: REST API, middleware (CORS, logging, security)
- **fs/promises**: File operations, session persistence
- **YAML**: Data serialization, test fixtures
- **Zod**: Schema validation, input validation
- **JSDOM**: HTML parsing, scraping

### Integrations

- **OpenAI API**: LLM processing, WebSearch
- **JobSpy**: Scraping reference
- **NPM**: Package ecosystem

### Development

- **Docker**: Containerization, multi-stage builds
- **Vitest**: Testing framework, React component testing
- **ESLint/Prettier**: Code quality, automated checks
- **TypeScript**: Strict compilation, type safety
- **CLI**: Unified runner, build/test automation

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

### Roadmap

- Database migration from in-memory
- Enhanced filtering, advanced search options
- Additional job sources, API integrations
- Performance optimization, caching strategies
- User authentication, personalized dashboards
- Mobile app development

### Scalability

- Service modularization, microservices architecture
- Database indexing, query optimization
- Distributed processing, load balancing
- Horizontal scaling, container orchestration
- Caching layers, CDN integration
