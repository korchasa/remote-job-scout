# Software Design Specification

## System Architecture

### Overall Design

Client-server web application with Node.js/Express.js backend and React frontend for remote job search with AI-powered analysis and filtering.

### Core Subsystems

- **Settings Management**: User configuration with localStorage persistence
- **Search Orchestrator**: Multi-stage process coordination (collection → filtering → enrichment)
- **Data Collection**: Job scraping from Indeed (GraphQL), LinkedIn, OpenAI WebSearch
- **Preliminary Filtering**: User criteria validation with blacklist/whitelist support
- **LLM Processing**: OpenAI-powered data enhancement and company research
- **Results Management**: Job storage and UI presentation
- **Modular Backend**: Express.js with middleware, routes, and controllers separation
- **Dev Container**: Docker-based development environment with VS Code integration

### Reference Architecture

Based on JobSpy library principles for scalable job scraping, implemented in Node.js ecosystem.

## Component Design

### Frontend (React/TypeScript)

- **Stack**: React 19, TypeScript strict mode, Vite build tool
- **UI**: Shadcn/ui component library with Tailwind CSS
- **State**: React Query for API management, custom hooks for data
- **Features**: Dark/light themes, responsive design, polling for progress updates

### Backend (Node.js/Express.js)

- **Framework**: Express.js for REST API routing with modular middleware
- **Architecture**: Service-oriented with clear separation of concerns
- **Storage**: In-memory (production-ready for database migration)
- **Services**: 6 business logic services with scraper implementations
- **Middleware**: CORS, logging, security, error handling
- **Polling**: HTTP polling for progress updates
- **Testing**: Vitest framework with comprehensive test coverage

### Shared Layer

- **Schemas**: Type-safe TypeScript definitions
- **Communication**: REST API with HTTP polling for progress updates
- **Validation**: Zod schema validation

## Data Architecture

### Entity Model

- **Vacancy**: Core job data with JSON metadata storage
- **Settings**: User configuration with validation
- **Search Sessions**: Process tracking with progress states

### Storage Strategy

- **Client**: localStorage for user settings (privacy-focused)
- **Server**: In-memory maps (SQLite migration path ready)
- **Serialization**: YAML for job data, JSON for API communication

## Algorithm Design

### Search Process

1. **Collection**: Parallel scraping across selected sources
2. **Filtering**: User criteria validation with blacklists/whitelists
3. **Enrichment**: OpenAI LLM processing for data enhancement

### Key Algorithms

- **ETA Calculation**: `(total - processed) / speed × 60`
- **Retry Logic**: Exponential backoff `delay = base × 2^(attempt - 1)`
- **Rate Limiting**: Configurable delays between requests
- **Progress Tracking**: Real-time percentage updates

### Business Rules

- Blacklist filtering takes highest priority
- User settings override automatic rules
- All operations logged for audit trails

## Technology Stack

### Runtime & Framework

- **Node.js 18+**: Enterprise JavaScript/TypeScript runtime
- **Express.js**: Web framework for API routing with middleware architecture
- **TypeScript**: Strict mode compilation for client and server
- **ESM Modules**: Modern ES modules with .js extensions
- **Docker**: Multi-stage containerized development and production

### Frontend Technologies

- **React 19**: Component-based UI framework with latest features
- **Vite**: Fast development and build tool with HMR
- **Shadcn/ui**: Professional component library with 47 components
- **Tailwind CSS 4.1+**: Utility-first styling with advanced features
- **React Query**: Efficient API state management and caching

### Backend Technologies

- **Express.js**: REST API with modular middleware (CORS, logging, security)
- **Node.js fs/promises**: File system operations for storage
- **YAML**: Structured data serialization for job data
- **Zod**: Schema validation for type safety

### External Integrations

- **OpenAI API**: LLM processing and WebSearch capabilities
- **JobSpy**: Scraping architecture reference (Python library)
- **NPM Registry**: Node.js package ecosystem

### Development Tools

- **Docker**: Multi-stage containerized development and production
- **Dev Containers**: VS Code integration with automated setup
- **Vitest**: Modern testing framework for unit and integration tests
- **ESLint/Prettier**: Code quality and formatting tools
- **TypeScript Compiler**: Strict compilation for client/server
- **CLI Runner**: Unified `run` script for all development tasks

## Constraints & Trade-offs

### Design Decisions

- **Node.js Runtime**: Enterprise JavaScript/TypeScript runtime with extensive ecosystem
- Client-side settings storage (privacy over server persistence)
- Single-table job storage (simplicity over normalization)
- In-memory backend storage (development over production optimization)
- HTTP polling for progress updates (simplicity over real-time performance)
- Modular Express.js architecture (maintainability over monolithic design)

### Performance Considerations

- Parallel job processing across sources
- Lazy loading for large result sets
- Bundle optimization with code splitting
- API response caching and error recovery

## Future Extensions

### Current Enhancements

- **Completed**: FR-4 (filtering) and FR-5 (LLM enrichment) services implemented
- **Completed**: ESLint/Prettier configuration and TypeScript strict mode
- **Completed**: Vitest testing framework with comprehensive coverage
- **Completed**: Dev containers with VS Code integration
- **Completed**: HTTP polling implementation for progress updates
- **Completed**: Code formatting improvements and style consistency
- Database migration (SQLite/PostgreSQL)
- Additional job sources (Glassdoor, Naukri, ZipRecruiter)
- Advanced analytics and reporting
- Mobile application development
- Team collaboration features
- API for third-party integrations

### Scalability Considerations

- Service modularization for microservices migration
- Database indexing strategy
- CDN integration for static assets
- Load balancing for concurrent users
