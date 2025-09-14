# Software Requirements Specification

## System Overview

Web app for remote job search with AI analysis. Node.js runtime, Express.js backend, modular architecture.

## Functional Requirements

### FR-1: Settings

- localStorage persistence
- Position lists, blacklists, sources
- Language/country filters
- Single-request transmission

### FR-2: Multi-Stage Search

- 3-stage: Collection → Filtering → Enrichment
- Real-time progress, pause/resume
- Stop/pause with result preservation
- Statistics with filtering breakdown

### FR-3: Collection (Stage 1)

- Sources: Indeed GraphQL, LinkedIn, OpenAI WebSearch
- Parallel processing, concurrency control
- Real-time progress tracking
- Error handling, exponential backoff retry
- YAML serialization

### FR-4: Filtering (Stage 2)

- Auto-filtering post-collection
- User settings validation, blacklist/whitelist
- Status updates, detailed statistics
- Skip reasons breakdown

### FR-5: LLM Enrichment (Stage 3)

- OpenAI integration
- Company research via web search
- Token/cost tracking per vacancy
- Source tracking
- Graceful missing data handling

### FR-6: Job Management

- UI: cards, modals, navigation
- External job links
- Blacklist management
- Responsive design, themes
- Optimized client-server comm

### FR-7: Favorites

- Separate Favorites screen
- Replace "Snooze" with "Add to Favorites"
- Persist "Hide" & "Block" in localStorage

## Non-Functional Requirements

### Performance

- UI response < 1s
- 100 jobs < 10min processing
- Parallel request processing

### Reliability

- Graceful API unavailability handling
- Recovery after failures
- Comprehensive logging

### Security

- Input validation all levels
- SQL injection protection
- OpenAI API key client-side only

### Usability

- Intuitive interface
- Responsive design
- Dark/light themes
- Keyboard navigation

## Technical Specifications

### APIs & Integrations

- OpenAI API for LLM processing
- OpenAI WebSearch for global search
- Job scraping: Indeed GraphQL, LinkedIn
- JobSpy reference architecture

### Data Formats

- REST API communication
- JSON data exchange
- YAML job serialization
- HTTP polling for progress
- Express.js middleware

### Session Persistence

- Client: localStorage
- Server: filesystem

### UI/UX

- Modern responsive interface
- Shadcn/ui components
- Accessibility compliance
- Mobile-first design
- Real-time progress tracking

## Current Implementation

- Node.js + Express.js server
- React/TypeScript + Vite frontend
- 3-stage search pipeline with pause/resume
- 3 scrapers: Indeed, LinkedIn, OpenAI with retry/backoff
- Job UI with Shadcn/ui, filtering stats
- Docker multi-stage build
- API integration, token/cost tracking
- TypeScript strict mode
- Vitest testing
- ESLint/Prettier code quality
- CLI runner workflow
- YAML serialization, session persistence
