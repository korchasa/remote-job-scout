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
├── documents/           # Docs
│   ├── design.md        # Design spec
│   ├── file_structure.md # Structure
│   └── requirements.md  # Requirements
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
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useSearchSessions.ts
│   │   │   │   ├── useUserConfig.ts
│   │   │   │   ├── use-mobile.tsx
│   │   │   │   └── use-toast.ts
│   │   │   ├── lib/      # Utils
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
│   │   │   └── errorHandler.ts
│   │   ├── routes/      # API routes
│   │   │   ├── jobs.ts
│   │   │   ├── search.ts
│   │   │   └── multiStage.ts
│   │   ├── controllers/ # Controllers
│   │   └── storage.ts   # In-memory storage
│   ├── shared/          # Shared schemas
│   │   └── schema.ts
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

- **Frontend**: 9 core + 47 Shadcn/ui + 6 examples
- **Backend**: Express.js server, middleware, routes, controllers
- **Services**: 6 business + 3 scrapers, parallel processing
- **Tests**: 13 files, Vitest coverage
- **CLI**: Unified `run` script
- **Storage**: YAML serialization, session persistence

### Technologies

- **Runtime**: Node.js 18+, TypeScript strict
- **Frontend**: React 19, Vite, Shadcn/ui, React Query, Tailwind 4.1+
- **Backend**: Express.js, REST API, HTTP polling, JSDOM, YAML
- **Build**: Docker multi-stage, prod optimization
- **Dev**: Hot reload, TS compilation, ESLint/Prettier
- **Testing**: Vitest framework, comprehensive coverage
- **CLI**: Unified workflow
- **Processing**: Parallel scraping, retry/backoff, token/cost tracking