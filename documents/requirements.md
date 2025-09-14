# Software Requirements Specification

## System Overview

Web app for remote job search with AI-powered analysis & filtering. Built with Node.js runtime, Express.js backend & modular architecture.

## Functional Requirements

### FR-1: Search Settings

- Local storage persistence for user settings
- Position lists, blacklists, source selection
- Language/country/time filters with advanced options
- Single-request transmission on search start

### FR-2: Multi-Stage Search

- 3-stage process: Collection → Filtering → Enrichment
- Real-time progress visualization with pause/resume
- Stop/pause functionality with result preservation
- Final statistics display with filtering breakdown

### FR-3: Job Collection (Stage 1)

- Sources: Indeed (GraphQL), LinkedIn, OpenAI WebSearch
- Parallel processing with concurrency control
- Real-time progress tracking
- Error handling with exponential backoff retry
- YAML data serialization to filesystem

### FR-4: Preliminary Filtering (Stage 2)

- Automatic filtering after collection
- User settings validation with blacklist/whitelist
- Status updates & detailed filtering statistics
- Visual breakdown of skip reasons

### FR-5: LLM Enrichment (Stage 3)

- OpenAI integration for data enhancement
- Company research via web search
- Token usage & cost tracking per vacancy
- Information source tracking
- Missing data handling with graceful degradation

### FR-6: Job Management

- Modern UI with cards, modals, navigation
- External job link access
- Blacklist management
- Responsive design with theme support
- Optimized client-server communication

### FR-7: Favorites & Job Actions

- Separate Favorites screen to view saved jobs
- Replace "Snooze job" button with "Add to Favorites"
- Persist "Hide job" & "Block employer" actions in local user settings

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
- OpenAI API key stored client-side only

### Usability

- Intuitive web interface
- Responsive design
- Dark/light theme support
- Keyboard navigation

## Technical Specifications

### APIs & Integrations

- OpenAI API for LLM processing
- OpenAI WebSearch API for global search
- Job site scraping (Indeed GraphQL, LinkedIn)
- JobSpy reference architecture

### Data Formats

- REST API communication
- JSON data exchange
- YAML serialization for jobs
- HTTP polling for progress updates
- Express.js middleware architecture

### Session Persistence

- Client session persisted in localStorage
- Server session persisted to filesystem

### UI/UX Requirements

- Modern responsive interface
- Shadcn/ui component library
- Accessibility compliance
- Mobile-first design
- Real-time progress tracking

## Current Implementation

- Node.js runtime with Express.js server
- React/TypeScript frontend with Vite
- 3-stage search: Collection → Filtering → Enrichment with pause/resume
- 3 scraper implementations: Indeed, LinkedIn, OpenAI WebSearch with retry/backoff
- Job management UI with Shadcn/ui components & filtering stats
- Docker multi-stage build environment
- API integration with token/cost tracking
- TypeScript strict mode configuration
- Comprehensive testing with Vitest
- Code quality tools (ESLint, Prettier)
- CLI runner for development workflow
- YAML serialization & session persistence
