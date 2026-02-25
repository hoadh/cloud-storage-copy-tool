# Code Standards & Structure

## Application Structure

The codebase uses a domain-driven architectural structure that ensures logic is strongly separated by concern (e.g., authentication, provider integration, and core execution engine).

```
google-drive-copy-files/
├── src/
│   ├── index.js                      # CLI entry point using Commander.js
│   ├── copy-engine.js                # Core copy recursive orchestrator
│   │
│   ├── providers/                    # Cloud storage platform integrators
│   │   ├── base-provider.js          # Abstract base class / Protocol interface
│   │   ├── google-drive-provider.js  # Google Drive implementation logic
│   │   ├── onedrive-provider.js      # OneDrive implementation logic
│   │   ├── dropbox-provider.js       # Dropbox implementation logic
│   │   └── provider-factory.js       # Factory for instantiating providers via URIs
│   │
│   ├── auth/                         # OAuth 2.0 handlers for providers
│   │   ├── google-auth.js            # Google OAuth logic
│   │   ├── microsoft-auth.js         # Microsoft OAuth logic
│   │   └── dropbox-auth.js           # Dropbox OAuth logic
│   │
│   └── utils/                        # Shared utility functions
│       ├── logger.js                 # Output and logging handler
│       └── uri-parser.js             # Scheme and path extraction logic
│
├── config/                           # Sensitive OAuth configurations (Excluded from source control)
│   ├── credentials/                  # Client secrets & IDs
│   └── tokens/                       # Cached OAuth access tokens
│
├── logs/                             # System operation trails and progress logs
├── copy-folder.js                    # Legacy entry points and logic
├── docs/                             # Documentation source of truth
├── package.json                      # Project dependencies and script declarations
└── README.md                         # End-user quickstart guide
```

## General Development Rules

1. **File Naming Convention**:
   - Source code files (`.js`, `.test.js`) and directories generally use strict `kebab-case` with descriptive names (e.g., `copy-engine.js`, `google-drive-provider.js`).
   - Markdown documents (`.md`) that detail overviews should be upper-cased for project documents (`README.md`, `DESIGN.md`), and `kebab-case` for architectural specifications under `/docs/`.

2. **File Size Limits**:
   - Individual files must be kept under 200 lines to preserve optimal reading and testing paths.
   - Any module exceeding this threshold must be refactored or extracted into smaller auxiliary files.

3. **Domain-Driven Modularization**:
   - Extract logic into specific domain modules: UI/CLI endpoints should not house core execution logic.
   - Rely on dependency injection where applicable (e.g., passing `sourceProvider` and `destProvider` into `CopyEngine` during initialization).

4. **Consistent Variable & Class Naming**:
   - Classes should be written using `PascalCase` (`class GoogleDriveProvider`).
   - Private methods and fields should not be strictly enforced by `#` unless directly necessary, but generally use proper encapsulation via module exports.
   - Methods, variables, and properties should be written in `camelCase`.

5. **Code Style & Formatting**:
   - Code changes should be verified with linters.
   - Standard Prettier/ESLint rules should ideally act as baseline guardrails without hindering raw functionality.
   - Syntax must be free from errors and capable of executing cleanly on recent Node.js versions.

6. **Error Handling & Promises**:
   - Always wrap cross-provider actions and network requests in `try-catch` blocks.
   - Employ smart retries for transient networking errors.
   - Log errors gracefully using semantic error messages and structured context before throwing so that users aren't left with mysterious stack traces.

7. **Documentation Maintenance**:
   - High-level changes to operations, URIs, or CLI parameters should always trigger an update to `/docs/` and `/README.md`.
   - In-line JsDoc style comments should be provided for class interfaces representing abstractions such as `BaseProvider`.
