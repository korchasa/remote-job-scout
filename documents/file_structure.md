# Project Structure

```
remote-job-scout/
├── .cursor/              # IDE configs
├── .env                  # Environment vars
├── .dockerignore         # Docker exclusions
├── .prettierignore       # Prettier exclusions
├── .prettierrc.json      # Prettier config
├── eslint.config.js      # ESLint config
├── package.json          # Dependencies
├── package-lock.json     # Lock file
├── Dockerfile           # Multi-stage container
├── run                  # CLI launcher
├── run.ts               # CLI implementation
├── tsconfig.json        # TS config (client)
├── tsconfig.server.json # TS config (server)
├── tsconfig.tests.json  # TS config (tests)
├── tsconfig.eslint.json # TS config (ESLint)
├── README.md            # Project documentation
├── CHANGELOG.md         # Change history
├── documents/           # Docs
│   ├── design.md        # Design spec
│   ├── file_structure.md # Structure
│   ├── requirements.md  # Requirements
│   └── whiteboard.md    # Project status
├── references/          # External resources
│   ├── JobSpy/          # Scraping library
│   ├── JobSpy-review.md # Analysis
│   ├── my-spy.py        # Custom scraper
│   └── processing-prompt.md # LLM prompts
├── src/                 # Source code
│   ├── client/          # React frontend
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   │   ├── FilteringStatsDashboard.test.tsx
│   │   │   │   ├── FilteringStatsDashboard.tsx
│   │   │   │   ├── HiddenJobsView.tsx              # FR-11: Hidden jobs management UI
│   │   │   │   ├── JobCard.tsx
│   │   │   │   ├── JobDetailsModal.tsx
│   │   │   │   ├── JobListView.tsx
│   │   │   │   ├── MainDashboard.tsx
│   │   │   │   ├── ProgressDashboard.tsx
│   │   │   │   ├── SearchConfigPanel.tsx
│   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   ├── examples/ (6 examples)
│   │   │   │   └── ui/ (47 Shadcn/ui)
│   │   │   ├── hooks/    # React hooks
│   │   │   │   ├── useClientJobActions.test.ts # FR-11: Client-side job actions tests
│   │   │   │   ├── useClientJobActions.ts      # FR-11: Client-side job actions hook
│   │   │   │   ├── useFavorites.test.ts
│   │   │   │   ├── useFavorites.ts
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useSearchSessions.ts
│   │   │   │   ├── useSessions.test.ts
│   │   │   │   ├── useSessions.ts
│   │   │   │   ├── useUserConfig.ts
│   │   │   │   ├── use-mobile.tsx
│   │   │   │   └── use-toast.ts
│   │   │   ├── lib/      # Utils
│   │   │   │   ├── clientSideFiltering.test.ts # FR-11: Client-side filtering tests
│   │   │   │   ├── clientSideFiltering.ts      # FR-11: Client-side filtering utilities
│   │   │   │   ├── queryClient.ts
│   │   │   │   └── utils.ts
│   │   │   ├── pages/    # Route pages
│   │   │   │   └── not-found.tsx
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   ├── server/          # Express backend
│   │   ├── index.ts     # Server entry
│   │   ├── middleware/  # Middleware
│   │   │   ├── cors.ts
│   │   │   ├── logging.ts
│   │   │   ├── security.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── validation.ts # Zod validation middleware (FR-12)
│   │   │   └── validation.test.ts # Zod validation middleware tests (FR-12)
│   │   ├── routes/      # API routes
│   │   │   ├── jobs.ts
│   │   │   ├── search.ts
│   │   │   └── multiStage.ts
│   │   ├── controllers/ # Controllers
│   │   └── storage.ts   # In-memory storage
│   ├── shared/          # Shared schemas
│   │   ├── schema.ts    # TypeScript interfaces (JobPost, HiddenJob, BlockedCompany, etc.)
│   │   ├── validationSchemas.ts # Zod validation schemas (FR-12)
│   │   └── validationSchemas.test.ts # Zod validation tests (FR-12)
│   ├── controllers/     # Legacy controllers
│   │   ├── collectionController.ts
│   │   └── collectionController.test.ts
│   ├── database/        # Future DB
│   ├── services/        # Business services
│   │   ├── jobCollectionService.ts
│   │   ├── jobCollectionService.test.ts
│   │   ├── multiStageSearchOrchestrator.ts
│   │   ├── multiStageSearchOrchestrator.test.ts
│   │   ├── filteringService.ts
│   │   ├── filteringService.test.ts
│   │   ├── enrichmentService.ts
│   │   ├── enrichmentService.test.ts
│   │   ├── sessionSnapshotService.ts
│   │   ├── sessionSnapshotService.test.ts
│   │   ├── settingsService.ts
│   │   ├── settings.test.ts
│   │   └── scrapers/    # Scrapers
│       ├── indeed.ts
│       ├── linkedin.ts
│       ├── linkedin.test.ts
│       ├── linkedin.integration.test.ts
│       ├── openai-web-search.ts
│       ├── scrapers.test.ts
│       └── scrapers.integration.test.ts
│   ├── types/           # Type definitions
│   │   ├── database.ts
│   │   ├── scrapers.ts
│   │   └── settings.ts
│   └── utils/           # Utilities
│       ├── index.ts
│       └── utils.ts
├── data/                # Runtime data
│   ├── jobs/            # Job fixtures
│   │   ├── parallel-test-session.yml
│   │   ├── retry-test-session.yml
│   │   └── yaml-test-session.yml
│   └── sessions/        # Session snapshots
│       └── <sessionId>.json
├── tests/               # Tests and fixtures
│   ├── integration/     # Integration tests
│   └── fixtures/        # Static YAML fixtures for jobs/sessions
│       ├── parallel-test-session.yml
│       ├── retry-test-session.yml
│       └── yaml-test-session.yml
└── dist/                # Build output
    ├── client/          # Built React app
    └── server/          # Built server
```

## Architecture

### Separation

- **Client**: React/TypeScript, component UI
- **Server**: Node.js/Express.js, modular middleware
- **Shared**: Type-safe schemas

### Components

- **Frontend**: 11 core + 47 Shadcn/ui + 6 examples + test setup
- **Backend**: Express.js server, middleware, routes, controllers
- **Services**: 7 business + 4 scrapers, parallel processing, LLM enrichment, session snapshots, logging, ETA calculation
- **Tests**: 22+ files, Vitest coverage (118+ passed), fixtures in `tests/fixtures`, React component testing
- **CLI**: Unified `run` script with full validation pipeline
- **Storage**: YAML serialization, filesystem session persistence, localStorage client storage

### Technologies

- **Runtime**: Node.js 18+, TypeScript strict, ESM modules
- **Frontend**: React 19, Vite, Shadcn/ui, React Query, Tailwind 4.1+, jsdom testing
- **Backend**: Express.js, REST API, HTTP polling, JSDOM, YAML, Zod validation, Winston logging
- **Build**: Docker multi-stage, prod optimization
- **Dev**: Hot reload, TS compilation, ESLint/Prettier, modular architecture
- **Testing**: Vitest framework, React Testing Library, comprehensive coverage (118+ tests), test fixtures
- **CLI**: Unified workflow, build/check/test automation
- **Processing**: Parallel scraping, retry/backoff, token/cost tracking, localStorage persistence, session snapshots, filesystem persistence, ETA calculation
