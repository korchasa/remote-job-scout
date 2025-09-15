# Remote Job Scout

Web app for remote job search with AI analysis. Node.js runtime, Express.js backend, React frontend.

## Status: 🚀 FR-2 Multi-Stage Search COMPLETED ✅

All core functionality implemented and tested:

- ✅ 3-stage pipeline (Collect → Filter → Enrich)
- ✅ Pause/Resume with state persistence
- ✅ Real-time progress tracking
- ✅ Parallel scraping with retry/backoff
- ✅ LLM enrichment with token/cost tracking
- ✅ Modern responsive UI with filtering stats

## Setup

### OpenAI API Key

Configure OpenAI API key in UI settings:

1. Start application
2. Go to Search Configuration
3. Enter OpenAI API key
4. Key stored locally in browser (localStorage)

**Security**: Client-side storage only. Enrichment skipped without key.

## Features

- **✅ Multi-Stage Search**: Collection → Filtering → Enrichment with pause/resume
- **✅ Parallel Scraping**: Concurrent processing, retry/backoff (Indeed, LinkedIn, OpenAI WebSearch)
- **✅ AI Enrichment**: OpenAI analysis, token/cost tracking, company research
- **✅ Advanced Filtering**: Language/country filters, statistics, blacklist/whitelist
- **✅ Real-Time Progress**: Live updates, filtering breakdown, ETA calculation
- **✅ Session Persistence**: Server-side snapshots, client-side recovery
- **✅ Responsive UI**: Modern interface, themes, accessibility
- **✅ Type Safety**: Full TypeScript strict mode, Zod validation

## Development

### Prerequisites

- Node.js 18+
- Docker

### Quick Start

```bash
# Install dependencies
npm install

# Development server
./run start

# Run checks
./run check

# Run tests
./run test
```

### CLI Commands

- `./run check`: Full validation (build + lint + test)
- `./run test`: Unit tests (70 passed, 8 skipped)
- `./run test integration`: Integration tests
- `./run start`: Development server (client + server)
- `./run stop`: Stop server

## Architecture

- **Backend**: Express.js, REST API, HTTP polling, Zod validation, session persistence
- **Frontend**: React 19, TypeScript strict, Vite, Shadcn/ui, React Query
- **Processing**: 3-stage pipeline (Collect → Filter → Enrich), parallel scraping, LLM enrichment
- **Storage**: YAML serialization, filesystem sessions, localStorage client settings
- **Testing**: Vitest, React Testing Library, 70+ tests, comprehensive coverage
- **Scraping**: Indeed GraphQL, LinkedIn, OpenAI WebSearch with retry/backoff
