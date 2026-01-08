# Quick Start Guide - Phase 1

## ✅ Phase 1 Complete!

The project has been successfully refactored into a modular, multi-provider architecture. Here's how to use it:

## Current Capabilities

- ✅ **Google Drive → Google Drive** copying
- ✅ Provider abstraction ready for OneDrive and Dropbox
- ✅ Backward compatible with original script

## Setup (If Not Already Done)

### 1. Check if credentials exist

```bash
# You should already have this file:
ls -la credentials.json

# Or the new location:
ls -la config/credentials/google-credentials.json
```

### 2. If you need new credentials

Follow the instructions in [README.md](README.md#google-drive-setup)

## Usage Examples

### Basic Copy (Same as Before)

```bash
# Using new CLI
node src/index.js \
  --src "gdrive://SOURCE_FOLDER_ID" \
  --dest "gdrive://DEST_FOLDER_ID"

# Using legacy wrapper (backward compatible)
node copy-folder-legacy.js SOURCE_FOLDER_ID DEST_FOLDER_ID
```

### Dry Run (Preview Without Copying)

```bash
node src/index.js \
  --src "gdrive://SOURCE_ID" \
  --dest "gdrive://DEST_ID" \
  --dry-run
```

### Verbose Mode (See Detailed Progress)

```bash
node src/index.js \
  --src "gdrive://SOURCE_ID" \
  --dest "gdrive://DEST_ID" \
  --verbose
```

### With Full Google Drive URLs

```bash
node src/index.js \
  --src "gdrive://https://drive.google.com/drive/folders/SOURCE_ID" \
  --dest "gdrive://DEST_ID"
```

## Test the New Implementation

### 1. Run Validation

```bash
node validate-phase1.js
```

Expected output: All tests should pass ✓

### 2. Test with Your Folders

```bash
# Replace with your actual folder IDs
node src/index.js \
  --src "gdrive://YOUR_SOURCE_FOLDER_ID" \
  --dest "gdrive://YOUR_DEST_FOLDER_ID" \
  --dry-run \
  --verbose
```

## What's New?

| Feature | Old | New |
|---------|-----|-----|
| **Structure** | Single file | Modular architecture |
| **CLI** | Hardcoded IDs | Flexible URI-based |
| **Logging** | Basic console | Structured logs + files |
| **Providers** | Google Drive only | Extensible framework |
| **Testing** | None | Validation script |
| **Documentation** | Basic README | Comprehensive docs |

## Architecture Highlights

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  node src/index.js --src gdrive://... --dest gdrive://...   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Provider Factory                       │
│  Creates Google Drive provider instances                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Copy Engine                           │
│  Provider-agnostic orchestration                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Google Drive Provider                      │
│  Implements BaseProvider interface                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | New CLI entry point |
| `src/copy-engine.js` | Core copy logic |
| `src/providers/google-drive-provider.js` | Google Drive implementation |
| `src/providers/base-provider.js` | Provider interface |
| `copy-folder-legacy.js` | Backward compatibility wrapper |
| `DESIGN.md` | Full architecture documentation |
| `PHASE1-SUMMARY.md` | Implementation details |

## Logs

All operations are logged to `logs/copy-TIMESTAMP.log`

```bash
# View latest log
ls -lt logs/ | head -5

# Tail latest log
tail -f logs/copy-*.log
```

## Troubleshooting

### "Module not found"

Make sure you've installed dependencies:
```bash
npm install
```

### "Credentials file not found"

The new code looks for credentials in two places:
1. `credentials.json` (legacy location) ✅ You have this
2. `config/credentials/google-credentials.json` (new location)

Your existing `credentials.json` will work!

### Test not working

Check validation script output:
```bash
node validate-phase1.js
```

All tests should pass.

## Next Phase

Ready for **Phase 2: OneDrive Integration**?

1. Register app in Azure Portal
2. Implement OneDrive provider
3. Test cross-provider copying: `gdrive://... → onedrive://...`

See [DESIGN.md](DESIGN.md#phase-2-onedrive-integration-week-2) for details.

## Questions?

- **Architecture**: See [DESIGN.md](DESIGN.md)
- **Usage**: See [README.md](README.md)
- **Implementation**: See [PHASE1-SUMMARY.md](PHASE1-SUMMARY.md)

---

**Status**: ✅ Phase 1 Complete - Google Drive working with new architecture  
**Next**: Phase 2 - OneDrive integration
