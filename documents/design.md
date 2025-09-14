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

- **Tech**: React 19, TypeScript strict, Vite
- **UI**: Shadcn/ui (47 components), Tailwind CSS 4.1+
- **State**: React Query, custom hooks
- **Features**: Themes, responsive, progress polling, filtering dashboard

### Backend

- **Tech**: Express.js REST API, modular middleware
- **Arch**: Service-oriented, separation of concerns
- **Storage**: In-memory with YAML serialization
- **Services**: 6 business logic + 3 scrapers, parallel processing
- **Middleware**: CORS, logging, security, error handling
- **API**: HTTP polling, pause/resume
- **Testing**: Vitest coverage

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

- **Client**: localStorage (privacy-focused)
- **Server**: In-memory with YAML serialization
- **Format**: YAML for jobs, JSON for API
- **Progress**: Real-time tracking, session persistence

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

### Backend

- **Express.js**: REST API, middleware (CORS, logging, security)
- **fs/promises**: File operations
- **YAML**: Data serialization
- **Zod**: Schema validation
- **JSDOM**: HTML parsing

### Integrations

- **OpenAI API**: LLM processing, WebSearch
- **JobSpy**: Scraping reference
- **NPM**: Package ecosystem

### Development

- **Docker**: Containerization
- **Vitest**: Testing framework
- **ESLint/Prettier**: Code quality
- **TypeScript**: Compilation
- **CLI**: Unified runner

## Constraints

### Design Decisions

- **Node.js**: Enterprise runtime, extensive ecosystem
- Client-side storage (privacy over server persistence)
- In-memory storage (dev over prod optimization)
- HTTP polling (efficiency over real-time)
- Modular architecture (maintainability over monolithic)
- Streamlined API (simplicity over completeness)

### Performance

- Parallel processing across sources
- Lazy loading for large datasets
- Bundle optimization, code splitting
- API caching, error recovery

## Extensions

### Roadmap

- Database migration from in-memory
- Enhanced filtering
- Additional sources
- Performance optimization

### Scalability

- Service modularization
- Database indexing
- Distributed processing
