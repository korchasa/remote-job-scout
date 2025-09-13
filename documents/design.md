# Software Design Specification

## System Architecture

### Overall Design
Client-server web application with external API integrations for job search and AI enrichment.

### Core Subsystems
- **Settings Management**: User configuration with localStorage persistence
- **Search Orchestrator**: Multi-stage process coordination (collection → filtering → enrichment)
- **Data Collection**: Job scraping from Indeed (GraphQL), LinkedIn, OpenAI WebSearch
- **Preliminary Filtering**: Fast user criteria validation
- **LLM Processing**: OpenAI-powered data enhancement
- **Results Management**: Job storage and UI presentation

### Reference Architecture
Based on JobSpy library principles for scalable job scraping.

## Component Design

### Frontend (React/TypeScript)
- **Stack**: React 18, TypeScript strict mode, Vite build tool
- **UI**: Shadcn/ui component library with Tailwind CSS
- **State**: React Query for API management, custom hooks for data
- **Features**: Dark/light themes, responsive design, WebSocket support

### Backend (Deno/TypeScript)
- **Framework**: Oak for REST API routing
- **Architecture**: Service-oriented with clear separation
- **Storage**: In-memory (production-ready for database migration)
- **Services**: Modular business logic components

### Shared Layer
- **Schemas**: Type-safe TypeScript definitions
- **Communication**: REST API + WebSocket for real-time updates
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
- **Deno 1.28+**: Modern JavaScript/TypeScript runtime
- **Oak**: Web framework for API routing
- **TypeScript**: Strict mode compilation

### Frontend Technologies
- **React 18**: Component-based UI framework
- **Vite**: Fast development and build tool
- **Shadcn/ui**: Professional component library
- **Tailwind CSS**: Utility-first styling
- **React Query**: Efficient API state management

### External Integrations
- **OpenAI API**: LLM processing and WebSearch
- **JobSpy**: Scraping architecture reference
- **ESM.sh**: Deno-compatible package hosting

### Development Tools
- **Docker**: Containerized development environment
- **Playwright MCP**: Browser automation (planned)
- **YAML**: Structured data serialization

## Constraints & Trade-offs

### Simplified Design Decisions
- Client-side settings storage (privacy over server persistence)
- Single-table job storage (simplicity over normalization)
- In-memory backend storage (development over production optimization)
- REST polling over WebSocket (compatibility over real-time performance)

### Performance Considerations
- Parallel job processing across sources
- Lazy loading for large result sets
- Bundle optimization with code splitting
- API response caching and error recovery

## Future Extensions

### Planned Enhancements
- Database migration (SQLite/PostgreSQL)
- WebSocket implementation for real-time updates
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
