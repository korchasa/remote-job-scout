# Remote Job Scout Project Structure

## Root Directory

```
remote-job-scout/
├── .cursor/                    # IDE configuration files
│   ├── code-style-fullstack.mdc # Code style guidelines
│   ├── debug-by-playwright.mdc # Debug configuration
│   ├── docs-rds-sds-schema.mdc # Documentation schema
│   ├── gods.mdc                # Project principles
│   ├── how-to-update-docs.mdc  # Documentation update guidelines
│   ├── main.mdc                # Main configuration
│   ├── role-fullstack.mdc      # Role definitions
│   ├── run-commands.mdc        # Available commands
│   ├── tdd-rules.mdc           # TDD guidelines
│   └── zen.mdc                 # Zen philosophy
├── .dockerignore               # Docker build context exclusions
├── build.ts                    # Project build script
├── deno.json                   # Deno configuration with serve command
├── deno.lock                   # Deno dependencies lock file
├── Dockerfile                  # Docker container configuration
├── run                         # Executable file for launching
├── run.ts                      # TypeScript CLI implementation
├── documents/                  # Project documentation
│   ├── design.md              # Software design specification
│   ├── file_structure.md      # File structure (this file)
│   ├── requirements.md        # Software requirements specification
│   └── whiteboard.md          # Current project status and roadmap
├── references/                 # References and external resources
│   ├── JobSpy/                # JobSpy library reference
│   │   ├── jobspy/           # JobSpy source code
│   │   │   ├── __init__.py
│   │   │   ├── bayt/         # Bayt integration
│   │   │   ├── bdjobs/       # BDJobs integration
│   │   │   ├── exception.py
│   │   │   ├── glassdoor/    # Glassdoor integration
│   │   │   ├── google/       # Google integration
│   │   │   ├── indeed/       # Indeed integration
│   │   │   ├── linkedin/     # LinkedIn integration
│   │   │   ├── model.py      # Data models
│   │   │   ├── naukri/       # Naukri integration
│   │   │   ├── util.py       # Utilities
│   │   │   └── ziprecruiter/ # ZipRecruiter integration
│   │   ├── LICENSE           # License
│   │   ├── poetry.lock       # Poetry dependencies
│   │   ├── pyproject.toml    # Poetry configuration
│   │   └── README.md         # JobSpy documentation
│   ├── JobSpy-review.md      # JobSpy library analysis
│   ├── my-spy.py            # Custom scraping implementation
│   └── processing-prompt.md  # LLM processing prompts
├── src/                       # Application source code
│   ├── controllers/          # Request handlers
│   │   └── collectionController.ts # Job collection API controller ✅
│   ├── database/             # Database operations (planned)
│   ├── services/             # Application services
│   │   ├── jobCollectionService.ts # Multi-source job collection ✅
│   │   ├── multiStageSearchOrchestrator.ts # Multi-stage search coordinator ✅
│   │   ├── filteringService.ts # Job filtering service ✅
│   │   ├── enrichmentService.ts # LLM enrichment service ✅
│   │   ├── settingsService.ts # Settings management service ✅
│   │   └── scrapers/         # Job scraping implementations
│   │       ├── indeed.ts    # Indeed scraper ✅
│   │       ├── linkedin.ts  # LinkedIn scraper ✅
│   │       └── openai-web-search.ts # OpenAI WebSearch scraper ✅
│   ├── types/                # TypeScript type definitions
│   │   ├── database.ts       # Database operation types ✅
│   │   ├── scrapers.ts       # Scraper type definitions ✅
│   │   └── settings.ts       # Settings type definitions ✅
│   ├── utils/                # Utilities (planned)
│   └── web/                  # Web interface components
│       ├── app.js           # Client application logic with multi-stage UI ✅
│       ├── index.html       # Main HTML interface with progress visualization ✅
│       └── server.ts        # Web server with multi-stage API endpoints ✅
└── tests/                     # Test suite
    ├── collectionController_test.ts # Collection controller tests ✅
    ├── enrichmentService_test.ts # Enrichment service tests ✅
    ├── filteringService_test.ts # Filtering service tests ✅
    ├── jobCollectionService_test.ts # Job collection service tests ✅
    ├── multiStageSearchOrchestrator_test.ts # Orchestrator tests ✅
    ├── scrapers_test.ts      # Scraper tests ✅
    ├── settings_test.ts      # Settings service unit tests ✅
```

## Description of Main Components

### Configuration Files

- `Dockerfile` - Docker container configuration with Deno runtime
- `.dockerignore` - Docker build context exclusions for optimization
- `deno.json` - Deno configuration with `serve --watch` command and watch paths
- `deno.lock` - Fixed dependency versions
- `build.ts` - Project build script
- `run` and `run.ts` - CLI entry point with Docker-aware development commands
- `tmp/` - Temporary directory for experimental scripts and temporary files
- `.cursor/` - IDE-specific configuration for development environment

### Source Code (src/)

- **controllers/** - Request handlers and controller logic
  - `collectionController.ts` - Multi-stage search API controller with progress
    tracking ✅
- **database/** - Database operations and models (planned for Stage 2)
- **services/** - Application business services
  - `jobCollectionService.ts` - Multi-source job collection with parallel
    processing ✅
  - `multiStageSearchOrchestrator.ts` - Coordinates collection, filtering, and
    enrichment stages ✅
  - `filteringService.ts` - Preliminary job filtering by user settings ✅
  - `enrichmentService.ts` - LLM data enrichment with OpenAI integration ✅
  - `settingsService.ts` - Complete settings management with validation ✅
  - **scrapers/** - Job scraping implementations
    - `indeed.ts` - Indeed job scraper with retry logic ✅
    - `linkedin.ts` - LinkedIn job scraper with retry logic ✅
    - `openai-web-search.ts` - OpenAI WebSearch integration for global search ✅
- **types/** - TypeScript type definitions
  - `database.ts` - Database operation types with multi-stage progress support
    ✅
  - `scrapers.ts` - Scraper interface definitions and job post types ✅
  - `settings.ts` - Comprehensive settings type definitions ✅
- **utils/** - Helper functions and utilities ✅
  - `index.ts` - Utilities export
  - `utils.ts` - YAML processing utilities with flow-style formatting ✅
- **web/** - Modern web interface components
  - `app.js` - Client application with modern UI, theme switching, and real-time
    updates ✅
  - `index.html` - Responsive HTML interface with Tailwind CSS + Flowbite
    components ✅
  - `styles.css` - Custom CSS with modern styling and animations ✅
  - `server.ts` - Deno serve-compatible web server with multi-stage API
    endpoints ✅

### Documentation (documents/)

- `design.md` - Software design specification with current architecture
- `requirements.md` - Software requirements specification with implementation
  status
- `whiteboard.md` - Current project status and development roadmap
- `file_structure.md` - This file structure documentation

### External References (references/)

- **JobSpy/** - Reference implementation for job scraping
  - Complete JobSpy library with multi-platform support
  - Integrations: Glassdoor, Indeed, LinkedIn, Google, Naukri, Bayt, BDJobs,
    ZipRecruiter
- `JobSpy-review.md` - JobSpy library analysis and integration assessment
- `my-spy.py` - Custom scraping implementation reference
- `processing-prompt.md` - LLM processing prompts for job analysis

### Tests (tests/)

- `collectionController_test.ts` - Collection controller unit tests ✅
- `enrichmentService_test.ts` - LLM enrichment service unit tests ✅
- `filteringService_test.ts` - Job filtering service unit tests ✅
- `jobCollectionService_test.ts` - Job collection service unit tests ✅
- `multiStageSearchOrchestrator_test.ts` - Multi-stage orchestrator unit tests
  ✅
- `scrapers_test.ts` - Job scraper implementations unit tests ✅
- `settings_test.ts` - Settings service unit tests ✅
- `integration_scrapers_test.ts` - Real API integration tests for Indeed GraphQL
  ✅

## Architectural Principles

### Separation of Concerns

- **CLI/Commands**: Command-line interface and option parsing
- **Services**: Business logic and application services
  - Orchestrator: Multi-stage process coordination
  - Scrapers: Job data collection from various sources
  - Filtering: Job filtering by user criteria
  - Enrichment: LLM data enrichment
  - Settings: User configuration management
- **Controllers**: Request handling and coordination
- **Database**: Data operations (planned)
- **Web**: Web interface and API with real-time progress
- **Utils**: YAML processing utilities with flow-style formatting
- **Types**: TypeScript type definitions for all components

### Code Organization

- TypeScript strict mode for type safety
- Modular architecture with clear service separation
- Multi-stage search orchestrator for process coordination
- Abstract scraper pattern with inheritance
- Client-side settings storage for privacy
- REST API between browser and server with real-time progress
- Comprehensive unit testing with mock infrastructure
- Error handling with retry logic and graceful degradation

### External Dependencies

- **Docker** - Containerization with live reload and auto-restart
- **JobSpy** - Python library for job scraping reference and architecture
  inspiration
- **OpenAI API** - LLM integration for job data enrichment
- **Deno runtime** - Modern JavaScript/TypeScript runtime with built-in web
  server
- **TypeScript** - Development with strict type checking and advanced types
- **Tailwind CSS v4 + Flowbite** - Modern utility-first CSS framework with
  professional UI components
- **Playwright MCP** - Browser automation for advanced scraping (planned)
- **YAML** - Data serialization with flow-style array formatting for compact
  output

### Current Implementation Status

- ✅ **Multi-Stage Search Process** - Complete orchestrator with progress
  tracking
- ✅ **Job Collection** - Indeed (GraphQL API), LinkedIn, OpenAI WebSearch
  scrapers
- ✅ **Job Filtering** - Settings-based filtering with blacklists and whitelists
- ✅ **LLM Enrichment** - OpenAI integration for job data enhancement
- ✅ **Web Interface** - Real-time progress visualization with stage details
- ✅ **API Endpoints** - RESTful API with multi-stage progress tracking
- ✅ **Unit Tests** - 42 comprehensive tests covering all components
- ✅ **Documentation** - Complete SRS, SDS, and architectural documentation
