# Multi-Provider Cloud Storage Copy Tool

## Design Document

**Version:** 1.0  
**Created:** 2026-01-08  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Architecture Overview](#3-architecture-overview)
4. [Provider Abstraction Layer](#4-provider-abstraction-layer)
5. [Authentication System](#5-authentication-system)
6. [Copy Engine](#6-copy-engine)
7. [Provider Implementations](#7-provider-implementations)
8. [CLI Interface](#8-cli-interface)
9. [Directory Structure](#9-directory-structure)
10. [Implementation Phases](#10-implementation-phases)
11. [Error Handling & Resilience](#11-error-handling--resilience)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. Executive Summary

This document describes the architecture for extending the existing Google Drive folder copy tool into a **multi-provider cloud storage copy system**. The system will support:

- **Google Drive**
- **Microsoft OneDrive**
- **Dropbox**

Users will be able to copy files and folders **within the same provider** or **across different providers** (e.g., Google Drive → OneDrive).

### Core Principle

The design follows the **Strategy Pattern** with a common `Provider` interface. This allows the copy engine to work with any provider without knowing the implementation details of each cloud storage API.

---

## 2. Goals and Non-Goals

### Goals

| ID | Goal |
|----|------|
| G1 | Support Google Drive, OneDrive, and Dropbox as storage providers |
| G2 | Enable copying files/folders between any two providers |
| G3 | Preserve folder structure during copy operations |
| G4 | Skip already-copied files (idempotent/resumable operations) |
| G5 | Provide clear progress logging |
| G6 | Handle large files via streaming (not loading entire file into memory) |
| G7 | Maintain backward compatibility with existing Google Drive usage |

### Non-Goals (Out of Scope for v1.0)

| ID | Non-Goal |
|----|----------|
| NG1 | Real-time sync (this is a one-time copy tool) |
| NG2 | GUI interface (CLI only) |
| NG3 | Two-way sync or conflict resolution |
| NG4 | Support for S3, Azure Blob, or other non-consumer cloud storage |
| NG5 | Sharing permissions or metadata preservation |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                  │
│  node copy.js --src gdrive://<id> --dest onedrive:///Documents/Backup   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            URI Parser                                   │
│  Parses provider URIs → { provider: 'gdrive', path: '<id>' }            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Provider Factory                               │
│  Creates appropriate provider instance based on URI scheme              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌──────────────┐                ┌──────────────┐
            │ Source       │                │ Destination  │
            │ Provider     │                │ Provider     │
            └──────────────┘                └──────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Copy Engine                                   │
│  - Orchestrates recursive folder traversal                              │
│  - Handles same-provider optimization (native copy)                     │
│  - Handles cross-provider streaming (download → upload)                 │
│  - Manages progress logging                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  GoogleDrive    │       │    OneDrive     │       │    Dropbox      │
│    Provider     │       │    Provider     │       │    Provider     │
│                 │       │                 │       │                 │
│ - authenticate  │       │ - authenticate  │       │ - authenticate  │
│ - listFolder    │       │ - listFolder    │       │ - listFolder    │
│ - downloadFile  │       │ - downloadFile  │       │ - downloadFile  │
│ - uploadFile    │       │ - uploadFile    │       │ - uploadFile    │
│ - createFolder  │       │ - createFolder  │       │ - createFolder  │
│ - copyFile      │       │ - copyFile      │       │ - copyFile      │
└─────────────────┘       └─────────────────┘       └─────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
    Google Drive API        Microsoft Graph API        Dropbox API v2
```

---

## 4. Provider Abstraction Layer

### 4.1 Base Provider Interface

All providers must implement this interface:

```javascript
/**
 * @typedef {Object} ItemMetadata
 * @property {string} id - Provider-specific item ID
 * @property {string} name - Item name
 * @property {string} type - 'file' or 'folder'
 * @property {number} [size] - File size in bytes (files only)
 * @property {string} [mimeType] - MIME type (files only)
 * @property {Date} [modifiedTime] - Last modified timestamp
 */

class BaseProvider {
  /**
   * Provider identifier
   * @type {string}
   */
  static PROVIDER_ID = 'base';

  /**
   * Initialize the provider with credentials
   * @param {Object} config - Provider-specific configuration
   */
  constructor(config) {
    this.config = config;
    this.client = null;
  }

  // ==================== Authentication ====================

  /**
   * Authenticate with the provider
   * @returns {Promise<void>}
   */
  async authenticate() {
    throw new Error('Not implemented');
  }

  /**
   * Check if currently authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    throw new Error('Not implemented');
  }

  // ==================== Read Operations ====================

  /**
   * Get metadata for a single item
   * @param {string} itemId - Item identifier
   * @returns {Promise<ItemMetadata>}
   */
  async getItemMetadata(itemId) {
    throw new Error('Not implemented');
  }

  /**
   * List contents of a folder
   * @param {string} folderId - Folder identifier
   * @returns {Promise<ItemMetadata[]>}
   */
  async listFolderContents(folderId) {
    throw new Error('Not implemented');
  }

  /**
   * Download a file as a readable stream
   * @param {string} fileId - File identifier
   * @returns {Promise<ReadableStream>}
   */
  async downloadFileStream(fileId) {
    throw new Error('Not implemented');
  }

  // ==================== Write Operations ====================

  /**
   * Create a new folder
   * @param {string} name - Folder name
   * @param {string} parentId - Parent folder identifier
   * @returns {Promise<ItemMetadata>}
   */
  async createFolder(name, parentId) {
    throw new Error('Not implemented');
  }

  /**
   * Upload a file from a readable stream
   * @param {string} name - File name
   * @param {string} parentId - Parent folder identifier
   * @param {ReadableStream} stream - File content stream
   * @param {number} size - File size in bytes
   * @returns {Promise<ItemMetadata>}
   */
  async uploadFileStream(name, parentId, stream, size) {
    throw new Error('Not implemented');
  }

  // ==================== Check Operations ====================

  /**
   * Check if an item exists in a folder
   * @param {string} name - Item name to check
   * @param {string} parentId - Parent folder identifier
   * @param {'file'|'folder'} [type] - Optional type filter
   * @returns {Promise<ItemMetadata|null>}
   */
  async itemExists(name, parentId, type = null) {
    throw new Error('Not implemented');
  }

  // ==================== Optimized Operations ====================

  /**
   * Copy a file within the same provider (native copy if supported)
   * Default implementation: download + re-upload
   * @param {string} fileId - Source file identifier
   * @param {string} name - Name for the copy
   * @param {string} destinationFolderId - Destination folder identifier
   * @returns {Promise<ItemMetadata>}
   */
  async copyFileNative(fileId, name, destinationFolderId) {
    // Default: stream-based copy (can be overridden for native copy)
    const stream = await this.downloadFileStream(fileId);
    const metadata = await this.getItemMetadata(fileId);
    return this.uploadFileStream(name, destinationFolderId, stream, metadata.size);
  }

  /**
   * Check if this provider supports native copy
   * @returns {boolean}
   */
  supportsNativeCopy() {
    return false;
  }
}
```

### 4.2 Provider Factory

```javascript
class ProviderFactory {
  static providers = {
    'gdrive': GoogleDriveProvider,
    'onedrive': OneDriveProvider,
    'dropbox': DropboxProvider,
  };

  /**
   * Create a provider instance from a URI
   * @param {string} uri - Provider URI (e.g., 'gdrive://folder-id')
   * @returns {Promise<{provider: BaseProvider, itemId: string}>}
   */
  static async fromUri(uri) {
    const { scheme, path } = UriParser.parse(uri);
    
    const ProviderClass = this.providers[scheme];
    if (!ProviderClass) {
      throw new Error(`Unknown provider: ${scheme}`);
    }

    const provider = new ProviderClass();
    await provider.authenticate();
    
    return { provider, itemId: path };
  }
}
```

---

## 5. Authentication System

### 5.1 Overview

Each provider uses OAuth 2.0 with different authorization servers:

| Provider | Auth Endpoint | Token Storage |
|----------|---------------|---------------|
| Google Drive | Google OAuth 2.0 | `config/tokens/google-token.json` |
| OneDrive | Microsoft Identity Platform | `config/tokens/microsoft-token.json` |
| Dropbox | Dropbox OAuth 2.0 | `config/tokens/dropbox-token.json` |

### 5.2 Auth Manager

```javascript
class AuthManager {
  constructor(providerType, credentialsPath, tokenPath) {
    this.providerType = providerType;
    this.credentialsPath = credentialsPath;
    this.tokenPath = tokenPath;
  }

  /**
   * Get valid access token, refreshing if necessary
   * @returns {Promise<string>}
   */
  async getAccessToken() { /* ... */ }

  /**
   * Perform initial OAuth flow
   * @returns {Promise<Object>} tokens
   */
  async performOAuthFlow() { /* ... */ }

  /**
   * Refresh expired token
   * @returns {Promise<Object>} new tokens
   */
  async refreshToken() { /* ... */ }
}
```

### 5.3 OAuth Callback Server

A local HTTP server (port 3001) handles OAuth callbacks for all providers:

```javascript
// Callback URL patterns:
// Google:    http://localhost:3001/callback/google
// Microsoft: http://localhost:3001/callback/microsoft
// Dropbox:   http://localhost:3001/callback/dropbox
```

### 5.4 Credentials Configuration

**`config/credentials/google-credentials.json`**
```json
{
  "installed": {
    "client_id": "xxx.apps.googleusercontent.com",
    "client_secret": "xxx",
    "redirect_uris": ["http://localhost:3001/callback/google"]
  }
}
```

**`config/credentials/microsoft-credentials.json`**
```json
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "redirectUri": "http://localhost:3001/callback/microsoft",
  "scopes": ["Files.ReadWrite.All", "offline_access"]
}
```

**`config/credentials/dropbox-credentials.json`**
```json
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "redirectUri": "http://localhost:3001/callback/dropbox"
}
```

---

## 6. Copy Engine

### 6.1 Core Logic

The Copy Engine is provider-agnostic and handles:

1. **Same-provider copy**: Uses native copy API when available (faster, no data transfer)
2. **Cross-provider copy**: Downloads from source, uploads to destination via streaming

```javascript
class CopyEngine {
  constructor(sourceProvider, destProvider, options = {}) {
    this.source = sourceProvider;
    this.dest = destProvider;
    this.options = {
      skipExisting: true,
      deleteSource: false,
      parallelism: 1,
      ...options,
    };
    this.stats = { folders: 0, files: 0, skipped: 0, errors: 0 };
  }

  /**
   * Copy folder contents recursively
   */
  async copyFolder(sourceFolderId, destFolderId, indent = '') {
    const items = await this.source.listFolderContents(sourceFolderId);

    for (const item of items) {
      if (item.type === 'folder') {
        await this.processFolder(item, destFolderId, indent);
      } else {
        await this.processFile(item, destFolderId, indent);
      }
    }
  }

  async processFolder(item, destFolderId, indent) {
    logger.info(`${indent}[Folder] ${item.name}`);

    // Check if folder exists
    let destFolder = await this.dest.itemExists(item.name, destFolderId, 'folder');
    
    if (destFolder) {
      logger.info(`${indent}  Skipped (exists)`);
    } else {
      destFolder = await this.dest.createFolder(item.name, destFolderId);
      logger.info(`${indent}  Created`);
      this.stats.folders++;
    }

    // Recurse into folder
    await this.copyFolder(item.id, destFolder.id, indent + '  ');
  }

  async processFile(item, destFolderId, indent) {
    logger.info(`${indent}[File] ${item.name}`);

    // Check if file exists
    if (this.options.skipExisting) {
      const existing = await this.dest.itemExists(item.name, destFolderId, 'file');
      if (existing) {
        logger.info(`${indent}  Skipped (exists)`);
        this.stats.skipped++;
        return;
      }
    }

    // Copy file
    if (this.isSameProvider() && this.source.supportsNativeCopy()) {
      await this.source.copyFileNative(item.id, item.name, destFolderId);
    } else {
      await this.copyFileCrossProvider(item, destFolderId);
    }

    logger.info(`${indent}  Copied`);
    this.stats.files++;
  }

  async copyFileCrossProvider(item, destFolderId) {
    const stream = await this.source.downloadFileStream(item.id);
    await this.dest.uploadFileStream(item.name, destFolderId, stream, item.size);
  }

  isSameProvider() {
    return this.source.constructor.PROVIDER_ID === this.dest.constructor.PROVIDER_ID;
  }
}
```

### 6.2 Copy Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           START COPY                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ List source folder contents   │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ For each item in folder       │◄─────────────────┐
                    └───────────────────────────────┘                  │
                                    │                                  │
                    ┌───────────────┴───────────────┐                  │
                    ▼                               ▼                  │
            ┌──────────────┐                ┌──────────────┐           │
            │ Is Folder?   │                │  Is File?    │           │
            └──────────────┘                └──────────────┘           │
                    │                               │                  │
                    ▼                               ▼                  │
        ┌───────────────────┐           ┌───────────────────┐          │
        │ Folder exists in  │           │ File exists in    │          │
        │ destination?      │           │ destination?      │          │
        └───────────────────┘           └───────────────────┘          │
                │                               │                      │
        ┌───────┴───────┐               ┌───────┴───────┐              │
        ▼               ▼               ▼               ▼              │
    ┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐          │
    │  Yes  │       │  No   │       │  Yes  │       │  No   │          │
    └───────┘       └───────┘       └───────┘       └───────┘          │
        │               │               │               │              │
        ▼               ▼               ▼               ▼              │
    ┌───────┐   ┌────────────┐   ┌───────┐   ┌──────────────────┐      │
    │ Skip  │   │ Create     │   │ Skip  │   │ Same provider?   │      │
    │ folder│   │ folder     │   │ file  │   └──────────────────┘      │
    └───────┘   └────────────┘   └───────┘           │                 │
        │               │               │     ┌──────┴──────┐          │
        │               │               │     ▼             ▼          │
        │               │               │ ┌───────┐   ┌───────────┐    │
        │               │               │ │  Yes  │   │    No     │    │
        │               │               │ └───────┘   └───────────┘    │
        │               │               │     │             │          │
        │               │               │     ▼             ▼          │
        │               ▼               │ ┌───────┐   ┌───────────┐    │
        │       ┌──────────────┐        │ │Native │   │ Download  │    │
        │       │ Recurse into │        │ │ Copy  │   │ + Upload  │    │
        │       │ subfolder    │────────┘ └───────┘   └───────────┘    │
        │       └──────────────┘                │             │        │
        │               │                       │             │        │
        └───────────────┴───────────────────────┴─────────────┴────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ More items?                   │
                    └───────────────────────────────┘
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                        ┌───────┐       ┌───────┐
                        │  Yes  │───────│  No   │
                        └───────┘       └───────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │           DONE                │
                            └───────────────────────────────┘
```

---

## 7. Provider Implementations

### 7.1 Google Drive Provider

**API**: Google Drive API v3  
**NPM Package**: `googleapis`

| Operation | API Endpoint |
|-----------|--------------|
| List folder | `GET /drive/v3/files?q='folderId' in parents` |
| Get metadata | `GET /drive/v3/files/{fileId}` |
| Download file | `GET /drive/v3/files/{fileId}?alt=media` |
| Upload file | `POST /upload/drive/v3/files` (resumable) |
| Create folder | `POST /drive/v3/files` (mimeType: folder) |
| Copy file | `POST /drive/v3/files/{fileId}/copy` |

**Native Copy:** ✅ Supported (same-provider only)

```javascript
class GoogleDriveProvider extends BaseProvider {
  static PROVIDER_ID = 'gdrive';

  supportsNativeCopy() {
    return true; // Google Drive supports server-side copy
  }

  async copyFileNative(fileId, name, destinationFolderId) {
    const response = await this.client.files.copy({
      fileId: fileId,
      requestBody: {
        name: name,
        parents: [destinationFolderId],
      },
    });
    return this.toItemMetadata(response.data);
  }
}
```

### 7.2 OneDrive Provider

**API**: Microsoft Graph API  
**NPM Package**: `@microsoft/microsoft-graph-client`

| Operation | API Endpoint |
|-----------|--------------|
| List folder | `GET /me/drive/items/{itemId}/children` |
| Get metadata | `GET /me/drive/items/{itemId}` |
| Download file | `GET /me/drive/items/{itemId}/content` |
| Upload file (small) | `PUT /me/drive/items/{parentId}:/{filename}:/content` |
| Upload file (large) | `POST /me/drive/items/{parentId}:/{filename}:/createUploadSession` |
| Create folder | `POST /me/drive/items/{parentId}/children` |
| Copy file | `POST /me/drive/items/{itemId}/copy` |

**Native Copy:** ✅ Supported (same-provider only, async operation)

```javascript
class OneDriveProvider extends BaseProvider {
  static PROVIDER_ID = 'onedrive';

  supportsNativeCopy() {
    return true; // OneDrive supports server-side copy (async)
  }

  async copyFileNative(fileId, name, destinationFolderId) {
    // OneDrive copy is async - returns a monitor URL
    const response = await this.client
      .api(`/me/drive/items/${fileId}/copy`)
      .post({
        parentReference: { id: destinationFolderId },
        name: name,
      });
    
    // Poll until complete
    return this.waitForCopyComplete(response);
  }
}
```

### 7.3 Dropbox Provider

**API**: Dropbox API v2  
**NPM Package**: `dropbox`

| Operation | API Endpoint |
|-----------|--------------|
| List folder | `POST /files/list_folder` |
| Get metadata | `POST /files/get_metadata` |
| Download file | `POST /files/download` |
| Upload file (small) | `POST /files/upload` |
| Upload file (large) | `POST /files/upload_session/start` + chunks |
| Create folder | `POST /files/create_folder_v2` |
| Copy file | `POST /files/copy_v2` |

**Native Copy:** ✅ Supported (same-provider only)

**Note:** Dropbox uses paths instead of IDs for most operations.

```javascript
class DropboxProvider extends BaseProvider {
  static PROVIDER_ID = 'dropbox';

  supportsNativeCopy() {
    return true;
  }

  async copyFileNative(filePath, name, destinationFolderPath) {
    const response = await this.client.filesCopyV2({
      from_path: filePath,
      to_path: `${destinationFolderPath}/${name}`,
    });
    return this.toItemMetadata(response.result.metadata);
  }
}
```

---

## 8. CLI Interface

### 8.1 Command Syntax

```bash
node src/index.js [options] --src <source-uri> --dest <destination-uri>
```

### 8.2 URI Format

```
<provider>://<path-or-id>

Examples:
  gdrive://1ABC123xyz                    # Google Drive folder ID
  gdrive://https://drive.google.com/...  # Full Google Drive URL
  onedrive:///Documents/Backup           # OneDrive path
  onedrive://root                        # OneDrive root
  dropbox:///Photos/2024                 # Dropbox path
```

### 8.3 Options

| Option | Description | Default |
|--------|-------------|---------|
| `--src <uri>` | Source folder URI | (required) |
| `--dest <uri>` | Destination folder URI | (required) |
| `--skip-existing` | Skip files that already exist at destination | `true` |
| `--no-skip-existing` | Overwrite existing files | `false` |
| `--delete-source` | Delete source files after successful copy (move) | `false` |
| `--parallel <n>` | Number of parallel file transfers | `1` |
| `--dry-run` | Show what would be copied without copying | `false` |
| `--verbose` | Enable verbose logging | `false` |
| `--log-file <path>` | Path to log file | `copy-TIMESTAMP.log` |

### 8.4 Usage Examples

```bash
# Copy within Google Drive
node src/index.js --src "gdrive://SOURCE_ID" --dest "gdrive://DEST_ID"

# Copy from Google Drive to OneDrive
node src/index.js --src "gdrive://SOURCE_ID" --dest "onedrive:///Backup/FromGDrive"

# Copy from Dropbox to Google Drive with parallel transfers
node src/index.js --src "dropbox:///Photos" --dest "gdrive://DEST_ID" --parallel 5

# Move from OneDrive to Dropbox (delete source after copy)
node src/index.js --src "onedrive:///Documents" --dest "dropbox:///Archive" --delete-source

# Dry run to preview what would be copied
node src/index.js --src "gdrive://ID" --dest "onedrive:///Backup" --dry-run
```

---

## 9. Directory Structure

```
google-drive-copy-files/
├── src/
│   ├── index.js                      # CLI entry point
│   ├── copy-engine.js                # Core copy orchestration
│   │
│   ├── providers/
│   │   ├── base-provider.js          # Abstract base class
│   │   ├── google-drive-provider.js  # Google Drive implementation
│   │   ├── onedrive-provider.js      # OneDrive implementation
│   │   ├── dropbox-provider.js       # Dropbox implementation
│   │   └── provider-factory.js       # Provider instantiation
│   │
│   ├── auth/
│   │   ├── auth-manager.js           # Common auth utilities
│   │   ├── oauth-server.js           # Local OAuth callback server
│   │   ├── google-auth.js            # Google OAuth logic
│   │   ├── microsoft-auth.js         # Microsoft OAuth logic
│   │   └── dropbox-auth.js           # Dropbox OAuth logic
│   │
│   └── utils/
│       ├── logger.js                 # Logging utility
│       ├── uri-parser.js             # URI parsing and validation
│       ├── stream-utils.js           # Stream helpers
│       └── retry.js                  # Retry with backoff
│
├── config/
│   ├── credentials/                  # OAuth credentials (gitignored)
│   │   ├── google-credentials.json
│   │   ├── microsoft-credentials.json
│   │   └── dropbox-credentials.json
│   │
│   └── tokens/                       # OAuth tokens (gitignored)
│       ├── google-token.json
│       ├── microsoft-token.json
│       └── dropbox-token.json
│
├── logs/                             # Copy operation logs
│
├── copy-folder.js                    # Legacy script (deprecated)
├── package.json
├── package-lock.json
├── README.md
├── DESIGN.md                         # This document
└── .gitignore
```

---

## 10. Implementation Phases

### Phase 1: Foundation & Refactoring (Week 1)

| Task | Description | Priority |
|------|-------------|----------|
| 1.1 | Create new directory structure | High |
| 1.2 | Implement `BaseProvider` abstract class | High |
| 1.3 | Create `Logger` utility with file output | High |
| 1.4 | Create `UriParser` utility | High |
| 1.5 | Refactor existing code into `GoogleDriveProvider` | High |
| 1.6 | Extract auth into `google-auth.js` | High |
| 1.7 | Implement `CopyEngine` with provider abstraction | High |
| 1.8 | Implement `ProviderFactory` | Medium |
| 1.9 | Create new CLI with `commander` | Medium |
| 1.10 | Verify Google Drive ↔ Google Drive still works | High |

**Deliverable:** Working Google Drive copy with new architecture

### Phase 2: OneDrive Integration (Week 2)

| Task | Description | Priority |
|------|-------------|----------|
| 2.1 | Register app in Azure Portal | High |
| 2.2 | Implement `microsoft-auth.js` | High |
| 2.3 | Implement `OneDriveProvider` | High |
| 2.4 | Add OneDrive to `ProviderFactory` | High |
| 2.5 | Test OneDrive ↔ OneDrive copy | High |
| 2.6 | Test Google Drive → OneDrive copy | High |
| 2.7 | Test OneDrive → Google Drive copy | High |
| 2.8 | Handle large file uploads (resumable) | Medium |

**Deliverable:** Working Google Drive ↔ OneDrive copy

### Phase 3: Dropbox Integration (Week 3)

| Task | Description | Priority |
|------|-------------|----------|
| 3.1 | Register app in Dropbox Developer Console | High |
| 3.2 | Implement `dropbox-auth.js` | High |
| 3.3 | Implement `DropboxProvider` | High |
| 3.4 | Add Dropbox to `ProviderFactory` | High |
| 3.5 | Test Dropbox ↔ Dropbox copy | High |
| 3.6 | Test all cross-provider combinations | High |
| 3.7 | Handle large file uploads (upload sessions) | Medium |

**Deliverable:** Full 3-provider support

### Phase 4: Polish & Enhancements (Week 4)

| Task | Description | Priority |
|------|-------------|----------|
| 4.1 | Add progress bar with `cli-progress` | Medium |
| 4.2 | Implement parallel file transfers | Medium |
| 4.3 | Add `--delete-source` for move operations | Medium |
| 4.4 | Add `--dry-run` option | Low |
| 4.5 | Improve error messages | Medium |
| 4.6 | Update README with full documentation | High |
| 4.7 | Add retry logic with exponential backoff | Medium |
| 4.8 | Create setup scripts for each provider | Low |

**Deliverable:** Production-ready tool

---

## 11. Error Handling & Resilience

### 11.1 Retry Strategy

```javascript
const retryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'RATE_LIMIT_EXCEEDED',
    'SERVICE_UNAVAILABLE',
    '429', // Too Many Requests
    '500', // Internal Server Error
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
  ],
};
```

### 11.2 Error Categories

| Category | Handling |
|----------|----------|
| **Auth Errors** | Re-authenticate, prompt user |
| **Rate Limits** | Exponential backoff, respect Retry-After header |
| **Network Errors** | Retry with backoff |
| **File Not Found** | Log and skip |
| **Permission Denied** | Log and skip, continue with other files |
| **Quota Exceeded** | Stop and notify user |

### 11.3 Resumability

The tool is designed to be resumable:

1. **Skip existing files**: By default, files that already exist in the destination are skipped
2. **Idempotent operations**: Running the same copy command multiple times is safe
3. **Log files**: Detailed logs allow users to identify where a failure occurred

---

## 12. Future Enhancements

### 12.1 Potential Additional Providers

| Provider | API | Complexity |
|----------|-----|------------|
| Box | Box API | Medium |
| iCloud Drive | No public API | Not possible |
| Amazon Drive | Amazon Drive API | Medium |
| pCloud | pCloud API | Low |
| MEGA | MEGA API | High (encryption) |

### 12.2 Potential Features

| Feature | Description |
|---------|-------------|
| **Sync Mode** | Two-way sync with conflict resolution |
| **Filters** | Include/exclude patterns (e.g., `*.jpg`, `!*.tmp`) |
| **Bandwidth Limit** | Throttle transfer speed |
| **Scheduling** | Cron-like scheduled copies |
| **Web UI** | Browser-based interface |
| **Config File** | YAML/JSON config for complex setups |
| **Checksum Verification** | Verify file integrity after copy |

---

## Appendix A: API Rate Limits

| Provider | Requests/second | Daily Quota |
|----------|-----------------|-------------|
| Google Drive | 10 req/s | 1 billion queries/day |
| OneDrive | 4 req/s (guidance) | Varies by subscription |
| Dropbox | Varies | 25,000 API calls/month (free) |

---

## Appendix B: Dependencies

```json
{
  "dependencies": {
    "googleapis": "^100.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.0",
    "@azure/msal-node": "^2.0.0",
    "dropbox": "^10.0.0",
    "open": "^9.0.0",
    "commander": "^11.0.0",
    "cli-progress": "^3.12.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-08 | AI Assistant | Initial draft |
