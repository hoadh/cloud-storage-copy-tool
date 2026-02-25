# Project Overview & Product Design Record (PDR)

## Project Name
Cloud Storage Copy Tool (google-drive-copy-files)

## Objective
A multi-provider cloud storage CLI tool that allows users to copy entire folder structures between different cloud storage providers (Google Drive, OneDrive, and Dropbox) efficiently, supporting smart resumption, native server-side optimization, and cross-provider streaming.

## Core Features
1. **Multi-Provider Support**: Supports Google Drive, OneDrive, and Dropbox.
2. **Recursive Copying**: Replicates directory structures comprehensively.
3. **Smart Resume**: Idempotent operations ensuring already-copied files are skipped.
4. **Native Optimization**: Uses provider-native copy APIs when transferring within the same provider for faster execution.
5. **Cross-Provider Streaming**: Facilitates efficient file transfers between different cloud providers without keeping entire files in memory.
6. **Detailed Logging & Progress**: Console and file-based logging for monitoring transfers.
7. **Dry Run & Verbose Modes**: For safely previewing transfers before execution.

## Target Audience
Developers and power users needing a robust tool to migrate or backup large folder structures across various cloud storage platforms via the command line.

## High-Level Architecture
- **CLI Interface**: Built with Commander.js. User interactions via URIs in the format `<provider>://<path-or-id>`.
- **Copy Engine**: Orchestrates the core copy logic, manages folder recursion, skipping logic, and cross-provider streams.
- **Provider Interface**: Pluggable architecture based on `base-provider.js` allowing seamless addition of new cloud services.
- **Auth Managers**: Dedicated provider-specific OAuth handlers for obtaining and managing access tokens.

## Current Status
- Google Drive: Supported
- OneDrive: Supported (Phase 2 completed)
- Dropbox: Supported (Phase 3 completed)
