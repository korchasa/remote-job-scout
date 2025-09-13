# Project Structure

```
remote-job-scout/
├── .cursor/              # IDE configurations
├── .devcontainer/        # Dev container configuration
│   ├── devcontainer.json # VS Code dev container config
│   ├── Dockerfile        # Dev container Dockerfile
│   ├── dev.env.example   # Environment variables template
│   └── README.md         # Dev container documentation
├── .dockerignore         # Docker exclusions
├── .prettierignore       # Prettier exclusions
├── .prettierrc.json      # Prettier configuration
├── eslint.config.js      # ESLint configuration
├── package.json          # Node.js dependencies
├── package-lock.json     # Dependency lock
├── Dockerfile           # Multi-stage container config
├── run                  # CLI launcher
├── run.ts               # CLI implementation
├── tsconfig.json        # TypeScript config (client)
├── tsconfig.server.json # TypeScript config (server)
├── tsconfig.tests.json  # TypeScript config (tests)
├── tsconfig.eslint.json # TypeScript config (ESLint)
├── documents/           # Documentation
│   ├── design.md        # Design spec
│   ├── file_structure.md # This file
│   ├── requirements.md  # Requirements spec
│   ├── whiteboard.md    # Migration status
│   └── demo.html        # HTML demo
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
│   │   │   │   ├── examples/ (6 example components)
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
│   ├── server/          # Express.js backend
│   │   ├── index.ts     # Server entry with WebSocket
│   │   ├── middleware/  # Express middleware
│   │   │   ├── cors.ts
│   │   │   ├── logging.ts
│   │   │   ├── security.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/      # API routes
│   │   │   ├── jobs.ts
│   │   │   ├── search.ts
│   │   │   └── multiStage.ts
│   │   ├── controllers/ # Request controllers
│   │   └── storage.ts   # In-memory storage
│   ├── shared/          # Shared schemas
│   │   └── schema.ts
│   ├── controllers/     # Legacy controllers
│   │   ├── collectionController.ts
│   │   └── collectionController.test.ts
│   ├── database/        # Future database integration
│   ├── services/        # Business logic services
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
│   │       ├── indeed.ts
│   │       ├── linkedin.ts
│   │       ├── openai-web-search.ts
│   │       ├── scrapers.test.ts
│   │       └── scrapers.integration.test.ts
│   ├── types/           # TypeScript definitions
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

## Architecture Overview

### Separation of Concerns

- **Client**: React/TypeScript frontend with component-based UI
- **Server**: Node.js/Express.js backend with modular middleware architecture
- **Shared**: Type-safe schemas between frontend/backend

### Key Components

- **Frontend**: 8 core components + 47 Shadcn/ui components + 6 examples
- **Backend**: Modular Express.js server with middleware, routes, controllers
- **Services**: 6 business logic services with scraper implementations
- **Tests**: 8 test files covering all functionality with Vitest
- **Dev Container**: VS Code integration with automated setup
- **CLI**: Unified `run` script for all development tasks

### Technologies

- **Runtime**: Node.js 18+ with TypeScript strict mode
- **Frontend**: React 19, Vite, Shadcn/ui, React Query, Tailwind CSS
- **Backend**: Express.js, REST API, WebSocket, modular middleware architecture
- **Build**: Docker multi-stage build with production optimization
- **Development**: Dev containers, hot reload, TypeScript compilation, ESLint/Prettier
- **Testing**: Vitest framework with comprehensive coverage
- **CLI**: Unified development workflow with `run` script
