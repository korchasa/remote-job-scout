# Remote Job Scout

Web application for remote job search with AI-powered analysis & filtering. Features parallel scraping, LLM enrichment with cost tracking, and advanced filtering statistics.

## Настройка

### OpenAI API Key

For LLM enrichment functionality, configure your OpenAI API key in the UI settings panel:

1. Start the application
2. Go to Search Configuration
3. Enter your OpenAI API key in the "OpenAI API Key" field
4. The key is stored locally in your browser (localStorage) and never sent to the server

**Security Note**: The API key is stored client-side only for privacy. Enrichment stage is skipped if no key is provided.

### Key Features

- **Multi-Stage Search**: Collection → Filtering → Enrichment with pause/resume
- **Parallel Scraping**: Concurrent processing with retry/backoff mechanisms
- **AI Enrichment**: OpenAI-powered job analysis with token/cost tracking
- **Advanced Filtering**: Language/country/time filters with detailed statistics
- **Real-Time Progress**: Live updates with filtering breakdown
- **YAML Export**: Job data serialization for persistence
- **Responsive UI**: Modern interface with dark/light themes
