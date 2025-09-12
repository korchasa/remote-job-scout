# Software Requirements Specification (SRS)

## 1. Introduction

- **Document Purpose:** Define requirements for remote job search and enrichment
  system using LLM for analysis and filtering.
- **Scope:** Web application for searching and analyzing remote developer jobs.
- **Target Audience:** Developers seeking remote work, project managers,
  technical directors.
- **Definitions and Abbreviations:**
  - LLM: Large Language Model
  - API: Application Programming Interface
  - SQLite: Lightweight relational database
  - localStorage: Browser local storage

## 2. Overall Description

- **System Context:** Web application providing personalized remote job search
  with AI for data analysis and enrichment. Integrates with external APIs, runs
  autonomously in user browser.
- **Assumptions and Constraints:**
  - Internet access for job searching
  - OpenAI API access for data enrichment
  - Modern web browser with localStorage support
  - External API usage limitations
- **Assumptions:**
  - User has basic web interface skills
  - All job sources are accessible and stable

## 3. Functional Requirements

### 3.1 FR-1: Search Settings ✅ FULLY IMPLEMENTED

- **Description:** System provides local-stored job search settings.
- **Use Case:** User configures search by specific criteria.
- **Implementation Status:** All acceptance criteria fully implemented
- **Acceptance Criteria:**
  1. ✅ Load settings from localStorage on startup
  2. ✅ Save setting changes to localStorage
  3. ✅ Use default settings on first launch
  4. ✅ Configure job position list
  5. ✅ Manage blacklists for words and companies
  6. ✅ Select search sources (LinkedIn, Indeed, Glassdoor)
  7. ✅ Configure filters (languages, work time, countries) - implemented
  8. ✅ Transmit all settings in single request on search start

### 3.2 FR-2: Multi-Stage Search Process ✅ FULLY IMPLEMENTED

- **Description:** System executes job search in multiple stages with progress
  visualization.
- **Use Case:** User starts search and monitors execution.
- **Implementation Status:** All acceptance criteria fully implemented
- **Acceptance Criteria:**
  1. ✅ Launch multi-stage search process
  2. ✅ Display current stage and real-time progress
  3. ✅ Allow search stop at any stage
  4. ✅ Save results on stop
  5. ✅ Display final statistics upon completion

### 3.3 FR-3: Job Data Collection (Stage 1) ✅ FULLY IMPLEMENTED

- **Description:** System collects jobs from selected sources.
- **Use Case:** System gathers new jobs by user positions.
- **Implementation Status:** All acceptance criteria fully implemented
- **Acceptance Criteria:**
  1. ✅ Use only selected sources (Indeed, LinkedIn, OpenAI WebSearch)
  2. ✅ Apply user positions for search (parallel processing)
  3. ✅ Integrate with OpenAI WebSearch API (global search support)
  4. ✅ Support global search (fallback mechanism)
  5. ✅ Display progress by sources (real-time API endpoints)
  6. ✅ Save basic job information (Vacancy entity with JSON data)
  7. ✅ Log errors (comprehensive error handling & retry logic)

### 3.4 FR-4: Preliminary Filtering (Stage 2)

- **Description:** System filters jobs by user settings.
- **Use Case:** Fast job filtering before LLM enrichment.
- **Acceptance Criteria:**
  1. Automatic transition to filtering after collection
  2. Check against all user settings
  3. Update job statuses
  4. Display filtering statistics

### 3.5 FR-5: LLM Data Enrichment (Stage 3)

- **Description:** System enriches job data using LLM.
- **Use Case:** Enrich remaining jobs with additional information.
- **Acceptance Criteria:**
  1. Automatic transition to enrichment after filtering
  2. Extract standard and additional information
  3. Research companies via web search
  4. Save information sources
  5. Handle missing data

### 3.6 FR-6: Job Management ✅ FULLY IMPLEMENTED

- **Description:** System provides modern tools for managing found jobs.
- **Use Case:** User views and manages search results with modern UI.
- **Implementation Status:** Complete modern interface with job cards, modals,
  and navigation
- **Acceptance Criteria:**
  1. ✅ View full job information - implemented with Flowbite modals
  2. ✅ Navigate to original job links - implemented with external links
  3. ✅ Move jobs to skip - implemented via UI interactions
  4. ✅ Add companies to blacklist - implemented in settings interface
  5. ✅ Basic results display interface - implemented with modern job cards

### 3.7 FR-7: Blacklist System ✅ PARTIALLY IMPLEMENTED

- **Description:** System supports company blacklists.
- **Use Case:** User excludes specific companies from search.
- **Implementation Status:** Settings interface management implemented,
  filtering not implemented
- **Acceptance Criteria:**
  1. ✅ Save companies to blacklist - implemented in settings
  2. ❌ Automatic blacklist filtering - not implemented
  3. ✅ Blacklist management via interface - implemented

### 3.8 FR-8: Performance Monitoring

- **Description:** System tracks progress and LLM costs.
- **Use Case:** User monitors search process and budget.
- **Acceptance Criteria:**
  1. Display overall progress
  2. Calculate and display ETA
  3. Track costs in real-time
  4. Forecast total costs
  5. Save performance metrics

### 3.9 FR-9: Dev Application Launch ✅ FULLY IMPLEMENTED

- **Description:** Dev server launches via dev-containers (Docker).
- **Use Case:** User launches application for development.
- **Implementation Status:** All acceptance criteria fully implemented
- **Acceptance Criteria:**
  1. ✅ Application launches via dev-containers (Docker).
  2. ✅ Application auto-restarts on code changes.
  3. ✅ Previous application instances stopped on relaunch.

## 4. Non-Functional Requirements

- **Performance:**
  - Interface response time < 1 second
  - Process 100 jobs < 10 minutes
  - Parallel request processing
- **Reliability:**
  - Graceful degradation on API unavailability
  - Recovery after failures
  - Log all operations
- **Security:**
  - Input data validation
  - SQL injection protection
  - Secure API key storage
- **Scalability:**
  - Support large job volumes
  - Database query optimization
  - Asynchronous processing
- **Usability:**
  - Intuitive web interface
  - Responsive design
  - Dark theme support

## 5. Interfaces

- **APIs and Integrations:**
  - OpenAI API for LLM processing
  - OpenAI WebSearch API for job searching
  - Job sites (LinkedIn, Indeed, Glassdoor, etc.)
  - Playwright MCP for browser automation
  - **JobSpy** as reference implementation for job scraping (Python library)
- **Protocols and Data Formats:**
  - REST API for web interface
  - JSON for data exchange
  - WebSocket for status updates
- **UI/UX Constraints:**
  - Modern web interface
  - Responsive design
  - Keyboard navigation support

### 5.1 JobSpy Reference Implementation

System considers JobSpy library experience and architecture
(https://github.com/cullenwatson/JobSpy) as reference for job scraping:

**Supported Sources:**

- LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter, Bayt, Naukri, BDJobs

**Key Integration Features:**

- Concurrent scraping from multiple sources
- Proxy support for bypassing blocks
- Flexible filtering by parameters (location, job type, salary, publication
  date)
- Support for different job description formats
- Rate limiting and block handling

**Architectural Solutions:**

- Modular structure with separate scrapers per source
- Single entry point for multi-source search
- Error handling and retry mechanisms
- Standardized job data format

## 6. Project Implementation Status

### Overall Progress

- **Current Stage:** Stage 6 (Modern Web Interface) - ✅ COMPLETED
- **Next Stage:** Stage 7 (Performance monitoring UI integration)
- **Functional Requirements Coverage:** ~85% implemented

### Implemented Components

- ✅ **FR-1 (Search Settings):** Fully implemented (settings, storage, UI,
  filters)
- ✅ **FR-2 (Multi-Stage Search Process):** Fully implemented (orchestrator,
  progress tracking, stop functionality)
- ✅ **FR-3 (Job Data Collection):** Fully implemented (scrapers, API
  integration, progress tracking)
- ✅ **FR-6 (Job Management):** Fully implemented (modern job cards, modals,
  navigation, company details)
- ✅ **FR-9 (Dev Application Launch):** Docker dev-containers with auto-restart
- ✅ **Modern Web Interface:** Tailwind CSS v4 + Flowbite, responsive design,
  dark/light themes, accessibility
- ✅ **UI Components:** Professional forms, progress bars, job cards, modals,
  navigation, theme switching
- ✅ **Data Collection Infrastructure:** Scrapers, controllers, services, types
- ✅ **API Endpoints:** `/api/multi-stage/search`,
  `/api/multi-stage/progress/{id}`, `/api/multi-stage/stop/{id}`, `/api/search`,
  `/api/progress/{id}`, `/api/stop/{id}`, `/api/stats/{id}`
- ✅ **Error Handling:** Retry logic, rate limiting, graceful degradation
- ✅ **Technical Documentation:** SDS, SRS, file structure, whiteboard
- ✅ **Code Quality:** TypeScript strict, unit tests, linting, formatting

### Next Implementation Stages

1. **Stage 7:** Performance monitoring UI (FR-8) - real-time metrics & cost
   tracking
2. **Stage 8:** Enhanced filtering UI (FR-4) - advanced filtering controls
3. **Stage 9:** LLM enrichment visualization (FR-5) - enrichment progress &
   results
4. **Stage 10:** Additional job sources (Glassdoor, Naukri, ZipRecruiter)
5. **Stage 11:** Advanced features (export, sharing, notifications)

### Testing and Quality

- ✅ **Unit Tests:** Comprehensive coverage for scrapers, services, controllers,
  orchestrator, filtering, enrichment (42 tests total)
- ✅ **Integration Tests:** API endpoints testing with mock responses
- ✅ **Error Handling Tests:** Retry logic, rate limiting, failure scenarios
- ✅ **Code Quality:** Passes all checks (lint, fmt, compile)
- ✅ **Type Safety:** Full TypeScript strict mode compliance
- ✅ **Documentation:** Architecture and requirements fully documented

## 7. Acceptance Criteria

System is accepted when following conditions are met:

1. All functional requirements implemented and tested
2. Non-functional requirements meet specified parameters
3. Web interface works in all modern browsers
4. System passes load testing
5. Documentation meets requirements
6. Code passes all quality checks
