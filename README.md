# Cloud Storage Copy Tool

Multi-provider cloud storage copy tool supporting Google Drive, OneDrive (coming soon), and Dropbox (coming soon).

## Features

- **Multi-Provider Support**: Copy files between different cloud storage providers
- **Recursive Copying**: Automatically copies entire folder structures
- **Smart Resume**: Skip already-copied files (idempotent operations)
- **Progress Logging**: Detailed logs to console and file
- **Native Optimization**: Uses provider-native copy APIs when possible (faster)
- **Cross-Provider Streaming**: Efficient file transfers without loading entire files into memory
- **Dry Run Mode**: Preview what would be copied without actually copying

## Current Status

✅ **Google Drive** - Fully supported  
✅ **OneDrive** - Fully supported (Phase 2 complete!)  
✅ **Dropbox** - Fully supported (Phase 3 complete!)

## Quick Start

### Installation

```bash
npm install
```

### Google Drive Setup

1. **Create OAuth client ID** in [Google Cloud Console](https://console.cloud.google.com/)
   - Click **Create Credentials → OAuth client ID**
   - If prompted, configure the OAuth consent screen:
     - Choose "External" (or "Internal" if using Workspace)
     - Fill in app name and your email
     - Add scope: `https://www.googleapis.com/auth/drive`
     - Add yourself as a test user
   - Back to Create OAuth client ID:
     - Application type: **Desktop app**
     - Give it a name
     - Click **Create**

2. **Download credentials**
   - Click the download icon (⬇️) next to your client ID
   - Save as `credentials.json` in the project root
   - Or save as `config/credentials/google-credentials.json` (new structure)

### Usage

#### New CLI (Recommended)

```bash
# Copy within Google Drive
node src/index.js --src "gdrive://SOURCE_FOLDER_ID" --dest "gdrive://DEST_FOLDER_ID"

# Copy with full Google Drive URL
node src/index.js \
  --src "gdrive://https://drive.google.com/drive/folders/SOURCE_ID" \
  --dest "gdrive://DEST_ID"

# Dry run (preview what would be copied)
node src/index.js --src "gdrive://SOURCE_ID" --dest "gdrive://DEST_ID" --dry-run

# Verbose logging
node src/index.js --src "gdrive://SOURCE_ID" --dest "gdrive://DEST_ID" --verbose

# Custom log file
node src/index.js --src "gdrive://SOURCE_ID" --dest "gdrive://DEST_ID" --log-file my-copy.log
```

#### Legacy CLI (Backward Compatible)

```bash
node copy-folder-legacy.js SOURCE_FOLDER_ID DEST_FOLDER_ID
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--src <uri>` | Source folder URI | (required) |
| `--dest <uri>` | Destination folder URI | (required) |
| `--skip-existing` | Skip files that already exist | `true` |
| `--no-skip-existing` | Overwrite existing files | - |
| `--delete-source` | Delete source after copy (move) | `false` |
| `--dry-run` | Preview without copying | `false` |
| `--verbose` | Enable verbose logging | `false` |
| `--log-file <path>` | Custom log file path | Auto-generated |
| `--log-level <level>` | Set log level (debug/info/warn/error) | `info` |

## URI Format

```
<provider>://<path-or-id>
```

### Examples

```bash
# Google Drive with folder ID
gdrive://1ABC123xyz

# Google Drive with full URL
gdrive://https://drive.google.com/drive/folders/1ABC123xyz

# OneDrive (coming soon)
onedrive:///Documents/Backup
onedrive://root

# Dropbox (coming soon)
dropbox:///Photos/2024
```

## Project Structure

```
google-drive-copy-files/
├── src/
│   ├── index.js                      # CLI entry point
│   ├── copy-engine.js                # Core copy orchestration
│   ├── providers/
│   │   ├── base-provider.js          # Provider interface
│   │   ├── google-drive-provider.js  # Google Drive implementation
│   │   └── provider-factory.js       # Provider instantiation
│   ├── auth/
│   │   └── google-auth.js            # Google OAuth handler
│   └── utils/
│       ├── logger.js                 # Logging utility
│       └── uri-parser.js             # URI parsing
├── config/
│   ├── credentials/                  # OAuth credentials (gitignored)
│   └── tokens/                       # OAuth tokens (gitignored)
├── logs/                             # Copy operation logs
├── copy-folder-legacy.js             # Legacy compatibility wrapper
├── DESIGN.md                         # Architecture design document
└── README.md                         # This file
```

## Architecture

See [DESIGN.md](DESIGN.md) for detailed architecture documentation.

## Troubleshooting

### "Credentials file not found"

Make sure you've downloaded the OAuth credentials from Google Cloud Console and saved them as:
- `credentials.json` in the project root, OR
- `config/credentials/google-credentials.json`

### "Authorization failed"

1. Make sure the OAuth consent screen is configured correctly
2. Add yourself as a test user if using "External" mode
3. Try deleting `token.json` and re-authenticating

### Files are being skipped

This is normal if files already exist at the destination. Use `--no-skip-existing` to overwrite, or `--verbose` to see detailed skip reasons.

## Development

### Running Tests

```bash
# TODO: Add tests
npm test
```

### Adding a New Provider

See [DESIGN.md](DESIGN.md) Phase 2 and Phase 3 for implementation guides.

## License

MIT