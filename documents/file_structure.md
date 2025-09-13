# Project Structure

```
remote-job-scout/
├── .cursor/              # IDE configurations
├── .dockerignore         # Docker exclusions
├── deno.json            # Deno config + React/Vite deps
├── deno.lock            # Dependency lock
├── Dockerfile           # Container config
├── run                  # CLI launcher
├── run.ts               # CLI implementation
├── documents/           # Documentation
│   ├── design.md        # Design spec
│   ├── file_structure.md # This file
│   ├── requirements.md  # Requirements spec
│   └── whiteboard.md    # Project status
├── references/          # External resources
│   ├── JobSpy/          # Scraping reference library
│   ├── JobSpy-review.md # Library analysis
│   ├── my-spy.py        # Custom scraper
│   └── processing-prompt.md # LLM prompts
├── src/                 # Application code
│   ├── client/          # React frontend
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   │   ├── JobCard.tsx
│   │   │   │   ├── JobDetailsModal.tsx
│   │   │   │   ├── JobListView.tsx
│   │   │   │   ├── MainDashboard.tsx
│   │   │   │   ├── ProgressDashboard.tsx
│   │   │   │   ├── SearchConfigPanel.tsx
│   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   └── ui/ (47 Shadcn/ui files)
│   │   │   ├── hooks/    # React hooks
│   │   │   │   ├── useJobs.ts
│   │   │   │   ├── useSearchSessions.ts
│   │   │   │   ├── useUserConfig.ts
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   ├── use-mobile.tsx
│   │   │   │   └── use-toast.ts
│   │   │   ├── lib/      # Utilities
│   │   │   │   ├── queryClient.ts
│   │   │   │   └── utils.ts
│   │   │   ├── pages/    # Route pages
│   │   │   │   └── not-found.tsx
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   └── vite.config.ts
│   ├── server/          # Backend services
│   │   ├── index.ts     # Server entry
│   │   ├── routes.ts    # API routes
│   │   ├── services/    # Business logic
│   │   │   ├── jobCollector.ts
│   │   │   ├── jobFilter.ts
│   │   │   ├── llmEnricher.ts
│   │   │   └── searchOrchestrator.ts
│   │   ├── storage.ts   # Data storage
│   │   └── vite.ts      # Dev server
│   ├── shared/          # Shared schemas
│   │   └── schema.ts
│   ├── controllers/     # Legacy controllers
│   │   └── collectionController.ts
│   ├── database/        # Future database
│   ├── services/        # Legacy services
│   │   ├── jobCollectionService.ts
│   │   ├── multiStageSearchOrchestrator.ts
│   │   ├── filteringService.ts
│   │   ├── enrichmentService.ts
│   │   ├── settingsService.ts
│   │   └── scrapers/    # Scrapers
│   │       ├── indeed.ts
│   │       ├── linkedin.ts
│   │       └── openai-web-search.ts
│   ├── types/           # Legacy types
│   │   ├── database.ts
│   │   ├── scrapers.ts
│   │   └── settings.ts
│   └── utils/           # Utilities
│       ├── index.ts
│       └── utils.ts
└── tests/               # Test suite
    ├── collectionController_test.ts
    ├── enrichmentService_test.ts
    ├── filteringService_test.ts
    ├── jobCollectionService_test.ts
    ├── multiStageSearchOrchestrator_test.ts
    ├── scrapers_test.ts
    ├── settings_test.ts
    └── integration_scrapers_test.ts
```

## Architecture Overview

### Separation of Concerns
- **Client**: React/TypeScript frontend with component-based UI
- **Server**: Deno backend with service-oriented architecture
- **Shared**: Type-safe schemas between frontend/backend

### Key Components
- **Frontend**: 8 core components + 47 Shadcn/ui components
- **Backend**: 4 services + API routes + data storage
- **Tests**: 8 test files covering all functionality

### Technologies
- **Runtime**: Deno 1.28+ with TypeScript strict mode
- **Frontend**: React 18, Vite, Shadcn/ui, React Query
- **Backend**: Oak framework, REST API, WebSocket support
- **Build**: Docker containerization with live reload