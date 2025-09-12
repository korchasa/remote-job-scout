# Remote Job Scout Project Structure

## Root Directory

```
remote-job-scout/
├── .cursor/                    # IDE configuration files
│   ├── code-style-fullstack.mdc # Code style guidelines
│   ├── debug-by-playwright.mdc # Debug configuration
│   ├── docs-rds-sds-schema.mdc # Documentation schema
│   ├── gods.mdc                # Project principles
│   ├── main.mdc                # Main configuration
│   ├── role-fullstack.mdc      # Role definitions
│   ├── run-commands.mdc        # Available commands
│   ├── tdd-rules.mdc           # TDD guidelines
│   └── zen.mdc                 # Zen philosophy
├── build.ts                    # Project build script
├── deno.json                   # Deno configuration with serve command
├── deno.lock                   # Deno dependencies lock file
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
│   ├── controllers/          # Request handlers (planned)
│   ├── database/             # Database operations (planned)
│   ├── services/             # Application services
│   │   └── settingsService.ts # Settings management service ✅
│   ├── types/                # TypeScript type definitions
│   │   ├── database.ts       # Database operation types
│   │   └── settings.ts       # Settings type definitions ✅
│   ├── utils/                # Utilities (planned)
│   └── web/                  # Web interface components
│       ├── app.js           # Client application logic ✅
│       ├── index.html       # Main HTML interface ✅
│       └── server.ts        # Web server with deno serve ✅
└── tests/                     # Test suite
    └── settings_test.ts      # Settings service unit tests ✅
```

## Description of Main Components

### Configuration Files

- `deno.json` - Deno configuration with `serve --watch` command and watch paths
- `deno.lock` - Fixed dependency versions
- `build.ts` - Project build script
- `run` and `run.ts` - CLI entry point with development commands
- `.cursor/` - IDE-specific configuration for development environment

### Source Code (src/)

- **controllers/** - Request handlers and controller logic (planned for future stages)
- **database/** - Database operations and models (planned for Stage 2)
- **services/** - Application business services
  - `settingsService.ts` - Complete settings management with validation ✅
- **types/** - TypeScript type definitions
  - `database.ts` - Database operation types (prepared for future use)
  - `settings.ts` - Comprehensive settings type definitions ✅
- **utils/** - Helper functions and utilities (planned for future stages)
- **web/** - Web interface components
  - `app.js` - Client application with dynamic UI and auto-save ✅
  - `index.html` - Responsive HTML interface with Chota CSS ✅
  - `server.ts` - Deno serve-compatible web server ✅

### Documentation (documents/)

- `design.md` - Software design specification with current architecture
- `requirements.md` - Software requirements specification with implementation status
- `whiteboard.md` - Current project status and development roadmap
- `file_structure.md` - This file structure documentation

### External References (references/)

- **JobSpy/** - Reference implementation for job scraping
  - Complete JobSpy library with multi-platform support
  - Integrations: Glassdoor, Indeed, LinkedIn, Google, Naukri, Bayt, BDJobs, ZipRecruiter
- `JobSpy-review.md` - JobSpy library analysis and integration assessment
- `my-spy.py` - Custom scraping implementation reference
- `processing-prompt.md` - LLM processing prompts for job analysis

### Tests (tests/)

- `settings_test.ts` - Comprehensive unit tests for settings service ✅

## Architectural Principles

### Separation of Concerns

- **CLI/Commands**: Command-line interface and option parsing
- **Services**: Business logic and application services
- **Controllers**: Request handling and coordination (planned)
- **Database**: Data operations (planned)
- **Web**: Web interface and API
- **Utils**: Helper functions (planned)

### Code Organization

- TypeScript strict mode for type safety
- Modular architecture with clear service separation
- Client-side settings storage for privacy
- REST API between browser and server
- Unit testing with mock infrastructure

### External Dependencies

- JobSpy library for job scraping reference
- Deno runtime with modern `serve` command
- TypeScript for development and type safety
- Chota CSS for responsive UI components
