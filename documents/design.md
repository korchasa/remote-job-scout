# Software Design Specification (SDS)

## 1. Introduction

- **Document Purpose:** Define architectural design of remote job search and
  enrichment system.
- **Scope:** Architectural description of web application for LLM-powered job
  search.
- **Target Audience:** Developers, architects, technical project leaders.

## 2. System Architecture

- **Overall Diagram:** Web application with client-server architecture,
  integrated with external APIs.
- **Reference Implementation:** Architecture based on JobSpy library principles
  for efficient job scraping.
- **Current Status:** ✅ Basic infrastructure and settings module implemented
  - Deno web server with REST API endpoints
  - Client application with modular architecture
  - Complete TypeScript type system
  - Unit testing with mock infrastructure
- **Core Subsystems and Roles:**
  - **Settings Management Module:** User settings and filters management
    (localStorage)
  - **Search Orchestrator:** Multi-stage search process coordination
  - **Data Collection Module:** Job parsing from external sources (similar to
    JobSpy scrapers)
  - **Preliminary Filtering Module:** Fast filtering by user criteria
  - **LLM Processing Module:** Data enrichment with artificial intelligence
  - **Results Management Module:** Found jobs management
  - **Web Interface:** User interface for system interaction
  - **Database:** Search results and metrics storage (simplified schema)

## 3. Components

### 3.1 Settings Management Module ✅ IMPLEMENTED

- **Purpose:** User search settings and filters management.
- **Interfaces:** localStorage API for client storage, REST API for server
  settings transmission.
- **Dependencies:** Web browser with localStorage support, TypeScript types.
- **Implementation:**
  - `SettingsService` class with load/save/validate methods
  - Complete typing for all settings (UserSettings, CountryFilter,
    LanguageRequirement, etc.)
  - Data validation and normalization on save
  - Error handling and fallback to default settings
  - Unit tests with mock localStorage

### 3.2 Multi-Stage Search Orchestrator ✅ FULLY IMPLEMENTED

- **Purpose:** Coordinate collection, filtering, and enrichment stages.
- **Interfaces:** Internal module APIs, WebSocket for status updates.
- **Dependencies:** All data processing modules, database.
- **Implementation:**
  - `MultiStageSearchOrchestrator` for coordinating all search stages
  - `CollectionController` for search initiation & progress tracking
  - `FilteringService` for preliminary job filtering
  - `EnrichmentService` for LLM data enrichment
  - REST API endpoints: `/api/multi-stage/search`,
    `/api/multi-stage/progress/{id}`, `/api/multi-stage/stop/{id}`,
    `/api/search`, `/api/progress/{id}`, `/api/stop/{id}`
  - Real-time progress monitoring with error reporting
  - Asynchronous job processing with session management
  - Support for stopping process at any stage

### 3.3 Data Collection Module (Stage 1) ✅ IMPLEMENTED

- **Purpose:** Collect jobs from selected sources.
- **Interfaces:** Job site APIs, OpenAI WebSearch API, Playwright MCP.
- **Dependencies:** Source settings, external APIs.
- **Reference:** Architecture based on JobSpy - modular structure with separate
  scrapers per source, proxy support, concurrent processing.
- **Implementation:**
  - `BaseScraper` abstract class with retry logic & rate limiting
  - `IndeedScraper` & `LinkedInScraper` for job site parsing
  - `OpenAIWebSearchScraper` for global search via AI
  - `JobCollectionService` for parallel processing coordination
  - `CollectionController` for API endpoint management
  - Comprehensive error handling & graceful degradation

### 3.4 Preliminary Filtering Module (Stage 2)

- **Purpose:** Fast job filtering by user criteria.
- **Interfaces:** Database access, internal filters.
- **Dependencies:** User settings, database.

### 3.5 LLM Processing Module (Stage 3)

- **Purpose:** Enrich job data with artificial intelligence.
- **Interfaces:** OpenAI API, internal prompts.
- **Dependencies:** OpenAI API, user instructions.

### 3.6 Results Management Module

- **Purpose:** Manage found jobs and their display.
- **Interfaces:** REST API, user interface.
- **Dependencies:** Database, web interface.

### 3.7 Web Interface ✅ FULLY IMPLEMENTED

- **Purpose:** Provide modern user interface for system interaction.
- **Interfaces:** HTML/CSS/JavaScript, REST API, WebSocket (planned).
- **Dependencies:** Modern web browser, localStorage.
- **Implementation:**
  - ✅ Modern responsive interface with Tailwind CSS v4 + Flowbite
  - ✅ Professional UI components (forms, modals, progress bars, cards)
  - ✅ Settings form with validation and auto-save
  - ✅ JavaScript client for API interaction
  - ✅ Seamless dark/light theme switching with localStorage persistence
  - ✅ Modular client code structure with modern JavaScript features
  - ✅ Mobile-first responsive design
  - ✅ Accessibility features (ARIA labels, keyboard navigation)
  - ✅ Smooth animations and transitions

### 3.8 Database Module

- **Purpose:** Manage data storage and access.
- **Interfaces:** SQL queries, schema migrations.
- **Dependencies:** SQLite database.

## 4. Data and Storage

- **Entities and Attributes:**
  - `vacancies`: Complete job information (id, title, description, url,
    published_date, status, skip_reason, processed_at, created_at, collected_at,
    filtered_at, enriched_at, source, country, data)
    - `data` field contains all additional information in JSON format
    - Includes company data, location, salary, job type, remote status
  - `scrapers`: Abstract interface for job source scraping
    - `BaseScraper` with retry logic & rate limiting
    - `JobPost` standardized job data format
    - `ScraperInput` unified search parameters
    - `ScraperResponse` consistent result structure
- **ER Diagram:** Simplified relational model for search results and metrics
  storage.
- **Settings Storage:** ✅ IMPLEMENTED
  - All user settings stored in client-side localStorage
  - Transmitted to backend in single request on search start
  - Data validation and normalization on load/save
  - Fallback to default settings on corrupted data
  - Typed data structures with full TypeScript support

## 5. Algorithms and Logic

- **Key Algorithms:**
  - Multi-stage search process with parallel processing
  - ETA calculation algorithm:
    `eta_seconds = (total_vacancies - processed_vacancies) / processing_speed_per_minute * 60`
  - LLM prompts for extracting structured data
  - Filtering algorithm with priorities (blacklists → user filters → automatic
    rules)
  - Job scraping algorithms:
    - Exponential backoff retry: `delay = base_delay * 2^(attempt - 1)`
    - Rate limiting: Configurable delays between requests
    - HTML parsing: Regex-based extraction with error handling
    - Source prioritization: Indeed (primary) → LinkedIn (secondary) → OpenAI
      (fallback)
- **Business Rules:**
  - Blacklist filtering has highest priority
  - LLM enrichment applied only to filtered jobs
  - All operations logged for audit and debugging
  - User settings take priority over automatic ones

## 6. Non-Functional Aspects

- **Scalability:**
  - Asynchronous request processing
  - Database optimization with indexes
  - Caching of frequently used data
  - Support for large number of concurrent users
- **Fault Tolerance:**
  - Graceful degradation on API unavailability
  - Retry mechanisms for external requests
  - Recovery after failures with state preservation
  - Database backup
- **Security:**
  - Input validation at all levels
  - SQL injection protection via parameterized queries
  - Secure API key storage (encryption)
  - Logging without sensitive data
- **Monitoring and Logging:**
  - Logging all operations with severity levels
  - Real-time performance metrics
  - LLM cost tracking with detail
  - External API usage monitoring

## 7. Constraints and Trade-offs

- **Simplified:** All user settings stored in client localStorage, transmitted
  in single request to backend
- **Simplified:** Complex relational model removed - all job information stored
  in single table as YAML
- **Simplified:** Settings not saved on server - ensures privacy and simplicity
- **Deferred:** Multi-language interface support (first version English only)
- **Simplified:** Synchronous processing instead of distributed for architecture
  simplicity
- **Limited:** Support for main job sites only in first version
- **Simplified:** Text logs instead of structured logging

## 8. Technology Stack

### Implemented Technologies ✅

- **Runtime:** Deno 1.28+ with TypeScript support
- **Web Framework:** Native Deno HTTP server with REST API
- **Frontend:** Modern JavaScript + HTML5 + CSS3 with ES6+ features
- **CSS Framework:** Tailwind CSS v4 + Flowbite for modern UI components
- **UI Components:** Flowbite (modals, forms, progress bars, cards, navigation)
- **Theming:** Seamless dark/light theme switching with localStorage
- **Typing:** TypeScript with strict mode & advanced types
- **Storage:** localStorage for client settings, in-memory sessions
- **Testing:** Deno test framework with comprehensive unit tests
- **Build:** Deno native build system
- **Containerization:** Docker with live reload and auto-restart
- **Scraping:** Regex-based HTML parsing, API integration
- **External APIs:** OpenAI WebSearch, job site scraping
- **Error Handling:** Retry logic, exponential backoff, rate limiting

### Architectural Decisions

- **Client-Server:** REST API between browser and server
- **Modularity:** Separation into services, controllers, types, utilities
- **Privacy:** All settings stored locally in browser
- **Reliability:** Graceful error handling and validation
- **Containerization:** Docker-based development with automatic detection and
  fallback
- **Extensibility:** Modular architecture for easy addition of new features
- **Scraping Architecture:** Abstract scraper pattern with inheritance
- **Error Resilience:** Exponential backoff, rate limiting, graceful degradation
- **Data Flow:** Unified JobPost format across all scrapers
- **API Design:** RESTful endpoints with session-based job tracking

## 9. Future Extensions

- Integration with additional job sources (Glassdoor, Naukri, ZipRecruiter,
  etc.)
- Machine learning for personalized search and recommendations
- Mobile app with native capabilities
- Integration with calendars and tasks for deadline tracking
- Analytics dashboard with charts and trends
- Export results to various formats (PDF, CSV, Excel)
- API for integration with other systems
- Team collaboration support with shared settings
