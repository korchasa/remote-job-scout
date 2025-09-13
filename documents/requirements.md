# Software Requirements Specification

## System Overview

Web application for remote job search with AI-powered analysis and filtering. Built with Node.js runtime, Express.js backend and modular architecture.

## Functional Requirements

### ✅ FR-1: Search Settings - IMPLEMENTED

- Local storage persistence for user settings
- Position lists, blacklists, source selection
- Language, work time, country filters
- Single-request transmission on search start

### ✅ FR-2: Multi-Stage Search - IMPLEMENTED

- 3-stage process: Collection → Filtering → Enrichment
- Real-time progress visualization
- Stop/pause functionality with result preservation
- Final statistics display

### ✅ FR-3: Job Collection (Stage 1) - IMPLEMENTED

- Sources: Indeed (GraphQL), LinkedIn, OpenAI WebSearch
- Parallel processing by positions
- Real-time progress tracking
- Error handling with retry logic
- YAML data serialization
- Integration tests for API validation

### ✅ FR-4: Preliminary Filtering (Stage 2) - IMPLEMENTED

- Automatic filtering after collection
- User settings validation with blacklist/whitelist support
- Status updates and statistics
- Comprehensive filtering service with test coverage

### ✅ FR-5: LLM Enrichment (Stage 3) - IMPLEMENTED

- OpenAI integration for data enhancement
- Company research via web search
- Information source tracking
- Missing data handling
- Complete enrichment service with test coverage

### ✅ FR-6: Job Management - IMPLEMENTED

- Modern UI with cards, modals, navigation
- External job link access
- Blacklist management
- Responsive design with theme support

## Non-Functional Requirements

### Performance

- Interface response < 1s
- Process 100 jobs < 10min
- Parallel request processing

### Reliability

- Graceful API unavailability handling
- Recovery after failures
- Comprehensive logging

### Security

- Input validation at all levels
- SQL injection protection
- Secure API key storage

### Usability

- Intuitive web interface
- Responsive design
- Dark/light theme support
- Keyboard navigation

## Technical Specifications

### APIs & Integrations

- OpenAI API for LLM processing
- OpenAI WebSearch API for global search
- Job site scraping (Indeed GraphQL, LinkedIn, etc.)
- JobSpy reference architecture

### Data Formats

- REST API communication
- JSON data exchange
- YAML serialization for jobs
- HTTP polling for progress updates
- Modular Express.js middleware architecture

### UI/UX Requirements

- Modern responsive interface
- Professional component library (Shadcn/ui)
- Accessibility compliance
- Mobile-first design
- Real-time progress tracking

## Implementation Status

### Completed Features (95%)

- ✅ Node.js runtime with Express.js server and modular architecture
- ✅ React/TypeScript frontend with Vite
- ✅ Multi-stage search orchestration
- ✅ 3 scraper implementations (Indeed, LinkedIn, OpenAI)
- ✅ Job management UI with Shadcn/ui components
- ✅ Docker multi-stage build environment
- ✅ API integration and error handling
- ✅ TypeScript configuration for client/server
- ✅ FR-4: Preliminary filtering service implementation
- ✅ FR-5: LLM enrichment service implementation
- ✅ HTTP polling for progress updates
- ✅ Enhanced testing suite (Vitest)
- ✅ Code quality tools (ESLint, Prettier)
- ✅ Dev containers with VS Code integration
- ✅ CLI runner for unified development workflow
- ✅ Code formatting improvements and style consistency

### Remaining Features (5%)

- 🔄 Database integration (SQLite/PostgreSQL)
- 🔄 Additional job sources integration
- 🔄 Advanced analytics and reporting
- 🔄 Mobile application development

## Acceptance Criteria

- All functional requirements implemented
- Non-functional requirements met
- Modern browser compatibility
- Load testing successful
- Documentation complete
- Code quality standards met
