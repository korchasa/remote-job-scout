# Remote Job Scout Project Structure

## Root Directory

```
remote-job-scout/
├── build.ts                    # Project build script
├── deno.json                   # Deno configuration
├── deno.lock                   # Deno dependencies lock file
├── run                         # Executable file for launching
├── run.ts                      # TypeScript implementation of CLI
├── documents/                  # Project documentation
│   ├── design.md              # Design documents
│   ├── file_structure.md      # File structure (this file)
│   ├── requirements.md        # Project requirements
│   └── whiteboard.md          # Work notes and tasks
├── references/                 # References and external resources
│   ├── JobSpy/                # Link to JobSpy library
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
│   ├── JobSpy-review.md      # JobSpy review
│   ├── my-spy.py            # Custom spy implementation
│   └── processing-prompt.md  # Processing prompts
├── src/                       # Application source code
│   ├── controllers/          # Application controllers
│   ├── database/             # Database operations
│   ├── services/             # Application services
│   │   └── settingsService.ts # Settings service
│   ├── types/                # TypeScript types
│   │   ├── database.ts       # Types for database operations
│   │   └── settings.ts       # Settings types
│   ├── utils/                # Utilities
│   └── web/                  # Web components
│       ├── app.js           # Main application
│       ├── index.html       # Main HTML page
│       └── server.ts        # Web server
└── tests/                     # Tests
    └── settings_test.ts      # Settings service tests
```

## Description of Main Components

### Configuration Files

- `deno.json` - Deno runtime environment configuration
- `deno.lock` - Fixed versions of dependencies
- `build.ts` - Project build script
- `run` and `run.ts` - Entry point for the CLI application

### Source Code (src/)

- **controllers/** - Request handlers and controller business logic
- **database/** - Modules for database operations
- **services/** - Application business services
  - `settingsService.ts` - Application settings management
- **types/** - TypeScript type definitions
  - `database.ts` - Types for database operations
  - `settings.ts` - Application settings types
- **utils/** - Helper functions and utilities
- **web/** - Web interface
  - `app.js` - Main client application logic
  - `index.html` - HTML markup
  - `server.ts` - Server-side part of the web application

### Documentation (documents/)

- `design.md` - Design and architectural decisions
- `requirements.md` - Project requirements
- `whiteboard.md` - Work notes and current tasks

### External References (references/)

- **JobSpy/** - Integration with the job search library
  - Full copy of JobSpy with support for various job search platforms
  - Includes integrations with: Glassdoor, Indeed, LinkedIn, Google, Naukri,
    Bayt, BDJobs, ZipRecruiter
- `JobSpy-review.md` - Analysis and review of the JobSpy library
- `my-spy.py` - Custom implementation of search functionality
- `processing-prompt.md` - Prompts for processing job data

### Tests (tests/)

- `settings_test.ts` - Tests for the settings service

## Architectural Principles

### Separation of Concerns

- **CLI/Commands**: Command-line interface, option parsing
- **Services**: Business logic and application services
- **Controllers**: Request handling and coordination
- **Database**: Data operations
- **Web**: Web interface and API
- **Utils**: Helper functions

### Code Organization

- Using TypeScript for type safety
- Modular architecture with clear separation into services
- Centralized settings management
- Separation of web interface and server-side logic

### External Dependencies

- JobSpy for job search across various platforms
- Deno as the runtime environment
- TypeScript for development
