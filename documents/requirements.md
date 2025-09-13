# Software Requirements Specification

## System Overview
Web application for remote job search with AI-powered analysis and filtering.

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

### FR-4: Preliminary Filtering (Stage 2)
- Automatic filtering after collection
- User settings validation
- Status updates and statistics

### FR-5: LLM Enrichment (Stage 3)
- OpenAI integration for data enhancement
- Company research via web search
- Information source tracking
- Missing data handling

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
- WebSocket for real-time updates
- YAML serialization for jobs

### UI/UX Requirements
- Modern responsive interface
- Professional component library (Shadcn/ui)
- Accessibility compliance
- Mobile-first design

## Implementation Status

### Completed Features (90%)
- ✅ React/TypeScript frontend migration
- ✅ Multi-stage search orchestration
- ✅ 3 scraper implementations with GraphQL
- ✅ Job management UI with modern components
- ✅ 61 comprehensive tests
- ✅ Docker development environment
- ✅ API integration and error handling

### Remaining Features (10%)
- FR-4: Preliminary filtering implementation
- FR-5: LLM enrichment with OpenAI
- Performance monitoring UI
- Additional job sources integration

## Acceptance Criteria
- All functional requirements implemented
- Non-functional requirements met
- Modern browser compatibility
- Load testing successful
- Documentation complete
- Code quality standards met