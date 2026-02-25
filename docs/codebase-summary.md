# Codebase Summary

The codebase represents a Node.js CLI tool that facilitates copying files and folder structures between distinct cloud storage providers natively.

## Current Supported Integrations

- **Google Drive**: `gdrive://` (fully supported, native copy inside identical provider possible).
- **Microsoft OneDrive**: `onedrive://` (fully supported via Microsoft Graph API and multi-part upload).
- **Dropbox**: `dropbox://` (fully supported via Dropbox API v2).

## Core Modules & Status

1. **CLI Layer (`src/index.js`)**
   - Main entry point utilizing Commander.js. Provides a suite of configuration options such as `--dry-run`, `--verbose`, `--delete-source`, and `--skip-existing`.
   - Normalizes all runtime inputs for provider agnostic execution.

2. **Core Operations Orchestrator (`src/copy-engine.js`)**
   - Maintains folder navigation state recursively.
   - Computes diffs natively between destination and source paths to facilitate a smart resumé process (idempotent copying), drastically cutting down bandwidth when copying massive archives.
   - Implements native single-provider copying optimizations, routing cross-provider operations into memory-efficient stream downloads/uploads.

3. **Provider System Layer (`src/providers/` & `src/utils/uri-parser.js`)**
   - An extensible base class `BaseProvider` guarantees operations for any cloud drive implementation (`listFolderContents`, `uploadFileStream`, etc.).
   - `ProviderFactory` cleanly orchestrates initializing raw URIs (e.g. `gdrive://1234` or `onedrive:///Backup`) and bootstrapping their respective authentication routines.

4. **Authentication Abstraction (`src/auth/`)**
   - Decoupled modules securely manage OAuth state tracking, acquiring tokens via HTTP callback servers, token refresh logic, and API configuration.
   - Stores all sensitive keys inside an unversioned `config/` directory.

## Current Evolution Phase

The project has cleared its fundamental architectural milestones (Phase 1 to Phase 3) outlaid structurally in `DESIGN.md`. All legacy Google Drive scripts (`copy-folder-legacy.js`) have been superseded by the `BaseProvider` approach, accommodating OneDrive and Dropbox cleanly.

The focus is stability, maintaining optimal dependency footprints, and ensuring correct operations across multi-provider streaming edge-cases.
