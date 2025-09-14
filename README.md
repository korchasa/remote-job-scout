# Remote Job Scout

Web app for remote job search with AI analysis. Node.js runtime, Express.js backend, React frontend.

## Setup

### OpenAI API Key

Configure OpenAI API key in UI settings:

1. Start application
2. Go to Search Configuration
3. Enter OpenAI API key
4. Key stored locally in browser (localStorage)

**Security**: Client-side storage only. Enrichment skipped without key.

## Features

- **Multi-Stage Search**: Collection → Filtering → Enrichment with pause/resume
- **Parallel Scraping**: Concurrent processing, retry/backoff
- **AI Enrichment**: OpenAI analysis, token/cost tracking
- **Advanced Filtering**: Language/country filters, statistics
- **Real-Time Progress**: Live updates, filtering breakdown
- **YAML Export**: Job data serialization
- **Responsive UI**: Modern interface, themes

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

- `./run check`: Full validation
- `./run test`: Unit tests
- `./run test integration`: Integration tests
- `./run start`: Development server
- `./run stop`: Stop server

## Architecture

- **Backend**: Express.js, REST API, HTTP polling
- **Frontend**: React 19, TypeScript, Vite
- **Processing**: Parallel scraping, LLM enrichment
- **Storage**: YAML serialization, session persistence
- **Testing**: Vitest, comprehensive coverage
