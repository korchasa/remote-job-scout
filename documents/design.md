# Software Design Specification

## System Architecture

### Overall Design

Client-server web app with Node.js/Express.js backend & React frontend for remote job search with AI-powered analysis & filtering.

### Core Subsystems

- **Settings Management**: User config with localStorage persistence, including language/country/time filters
- **Search Orchestrator**: 3-stage process (collection → filtering → enrichment) with pause/resume support
- **Data Collection**: Parallel job scraping from Indeed (GraphQL), LinkedIn, OpenAI WebSearch with retry/backoff
- **Preliminary Filtering**: User criteria validation with blacklist/whitelist, advanced filtering stats
- **LLM Processing**: OpenAI-powered data enhancement with token/cost tracking & company research
- **Results Management**: Job storage with YAML serialization & UI presentation
- **Modular Backend**: Express.js with middleware, routes, controllers
- **Optimized API**: Streamlined endpoints with HTTP polling

### Reference Architecture

Based on JobSpy library principles for scalable job scraping, implemented in Node.js ecosystem.

## Component Design

### Frontend (React/TypeScript)

- **Stack**: React 19, TypeScript strict mode, Vite build tool
- **UI**: Shadcn/ui (47 components) with Tailwind CSS 4.1+
- **State**: React Query for API management, custom hooks
- **Features**: Dark/light themes, responsive design, progress polling, filtering stats dashboard

### Backend (Node.js/Express.js)

- **Framework**: Express.js for REST API with modular middleware
- **Architecture**: Service-oriented with separation of concerns
- **Storage**: In-memory job storage with YAML serialization
- **Services**: 6 business logic services + 3 scrapers with parallel processing
- **Middleware**: CORS, logging, security, error handling
- **API**: Streamlined endpoints with HTTP polling & pause/resume
- **Testing**: Vitest with comprehensive coverage

### Shared Layer

- **Schemas**: Type-safe TypeScript definitions
- **Communication**: REST API with HTTP polling
- **Validation**: Zod schema validation

## Data Architecture

### Entity Model

- **Vacancy**: Core job data with JSON metadata & enrichment tracking
- **Settings**: Extended user config with language/country/time filters
- **Search Progress**: Real-time tracking with 6-stage states (pending, running, completed, failed, stopped, paused, skipped)

### Storage Strategy

- **Client**: localStorage for settings (privacy-focused)
- **Server**: In-memory storage with YAML serialization
- **Serialization**: YAML for jobs, JSON for API
- **Progress**: Real-time tracking with session persistence

## Algorithm Design

### Search Process

1. **Collection**: Parallel scraping with concurrency control & retry/backoff
2. **Filtering**: Advanced criteria validation with stats tracking
3. **Enrichment**: OpenAI LLM processing with token/cost accounting

### Key Algorithms

- **ETA**: `(total - processed) / speed × 60`
- **Retry**: Exponential backoff `delay = base × 2^(attempt - 1)`
- **Concurrency**: Max sources/positions with queue management
- **Progress Tracking**: Real-time % updates with pause/resume
- **Cost Tracking**: Token usage × model rate per vacancy

### Business Rules

- Blacklist filtering has highest priority
- User settings override auto rules
- Operations logged for audit trails
- API key stored client-side only

## Technology Stack

### Runtime & Framework

- **Node.js 18+**: Enterprise JavaScript/TypeScript runtime
- **Express.js**: Web framework with middleware architecture
- **TypeScript**: Strict mode compilation for client/server
- **ESM Modules**: Modern ES modules with .js extensions
- **Docker**: Multi-stage containerized dev/prod

### Frontend Technologies

- **React 19**: Component-based UI framework
- **Vite**: Fast dev/build tool with HMR
- **Shadcn/ui**: Professional component library (47 components)
- **Tailwind CSS 4.1+**: Utility-first styling
- **React Query**: Efficient API state & caching

### Backend Technologies

- **Express.js**: REST API with modular middleware (CORS, logging, security)
- **Node.js fs/promises**: File system operations
- **YAML**: Structured data serialization
- **Zod**: Schema validation for type safety
- **JSDOM**: HTML parsing for scraping

### External Integrations

- **OpenAI API**: LLM processing & WebSearch
- **JobSpy**: Scraping architecture reference
- **NPM Registry**: Node.js package ecosystem

### Development Tools

- **Docker**: Multi-stage containerized dev/prod
- **Vitest**: Modern testing framework
- **ESLint/Prettier**: Code quality & formatting
- **TypeScript Compiler**: Strict compilation
- **CLI Runner**: Unified `run` script

## Constraints & Trade-offs

### Design Decisions

- **Node.js Runtime**: Enterprise JS/TS runtime with extensive ecosystem
- Client-side settings storage (privacy over server persistence)
- In-memory backend storage (dev over prod optimization)
- Optimized HTTP polling (efficiency over real-time performance)
- Modular Express.js architecture (maintainability over monolithic)
- Streamlined API endpoints (simplicity over feature completeness)

### Performance Considerations

- Parallel job processing across sources
- Lazy loading for large result sets
- Bundle optimization with code splitting
- API response caching & error recovery

## Future Extensions

### Roadmap

- Database migration from in-memory storage
- Enhanced filtering capabilities
- Additional job sources integration
- Performance optimization

### Scalability Considerations

- Service modularization for microservices
- Database indexing strategy
- Distributed processing for large-scale scraping
