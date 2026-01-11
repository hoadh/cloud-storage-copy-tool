# Dropbox Setup Guide

This guide walks you through setting up Dropbox integration for the Cloud Storage Copy Tool.

## Prerequisites

- Dropbox account (free or paid)

## Step 1: Register App in Dropbox Developer Console

### 1.1 Go to Dropbox App Console

Visit: https://www.dropbox.com/developers/apps

### 1.2 Create a New App

1. Click **Create app**
2. Choose an API: Select **Scoped access**
3. Choose the type of access you need: Select **Full Dropbox**
   - This allows access to all files and folders
   - Alternative: **App folder** (only accesses a specific folder)
4. Name your app: `Cloud Storage Copy Tool` (or any unique name)
5. Click **Create app**

## Step 2: Configure App Permissions

### 2.1 Go to Permissions Tab

1. In your app's page, click the **Permissions** tab
2. Enable the following permissions:

**Files and folders**:
- ✅ `files.metadata.write` - View and edit information about your Dropbox files and folders
- ✅ `files.metadata.read` - View information about your Dropbox files and folders
- ✅ `files.content.write` - Edit content of your Dropbox files and folders
- ✅ `files.content.read` - View content of your Dropbox files and folders

3. Click **Submit** to save permissions

## Step 3: Configure OAuth Settings

### 3.1 Go to Settings Tab

1. Click the **Settings** tab
2. Scroll down to **OAuth 2**

### 3.2 Add Redirect URI

1. Find **Redirect URIs** section
2. Click **Add**
3. Enter: `http://localhost:3001/callback/dropbox`
4. Click **Add**

### 3.3 Enable Additional Settings (Optional)

- **Allow implicit grant**: Leave unchecked (we use authorization code flow)

## Step 4: Get Your Credentials

### 4.1 Get App Key and App Secret

1. Still in the **Settings** tab
2. Find the **App key** (looks like: `abcdefghijk1234`)
3. Find the **App secret** - Click **Show** to reveal it
4. **IMPORTANT**: Copy both values

## Step 5: Create Credentials File

Create the file: `config/credentials/dropbox-credentials.json`

```json
{
  "clientId": "YOUR_APP_KEY",
  "clientSecret": "YOUR_APP_SECRET"
}
```

**Replace**:
- `YOUR_APP_KEY` - The App key from step 4.1
- `YOUR_APP_SECRET` - The App secret from step 4.1

### Example

```json
{
  "clientId": "abcdefghijk1234",
  "clientSecret": "xyz9876543210abc"
}
```

## Step 6: Test the Connection

Run a dry-run to test authentication:

```bash
# Test with Dropbox root folder
node src/index.js \
  --src "dropbox:///" \
  --dest "dropbox:///" \
  --dry-run
```

On first run:
1. Browser will open for Dropbox login
2. Sign in with your Dropbox account
3. Click **Allow** to grant permissions to the app
4. You'll see "Authorization successful!" message
5. The token will be saved to `config/tokens/dropbox-token.json`

## Dropbox URI Formats

### Root folder
```bash
dropbox:///
dropbox://root
```

### Folder by path
```bash
dropbox:///Documents
dropbox:///Photos/2024
dropbox:///Work/Projects/Active
```

**Important**: Dropbox uses paths (not IDs) for all operations.

## Usage Examples

### Copy within Dropbox

```bash
# Copy from one Dropbox folder to another
node src/index.js \
  --src "dropbox:///Documents/Source" \
  --dest "dropbox:///Backup/Destination"
```

### Cross-Provider Copy

```bash
# Google Drive → Dropbox
node src/index.js \
  --src "gdrive://GOOGLE_DRIVE_FOLDER_ID" \
  --dest "dropbox:///Backup/FromGDrive"

# OneDrive → Dropbox
node src/index.js \
  --src "onedrive:///Documents" \
  --dest "dropbox:///Backup/FromOneDrive"

# Dropbox → Google Drive
node src/index.js \
  --src "dropbox:///Photos" \
  --dest "gdrive://GOOGLE_DRIVE_FOLDER_ID"

# Dropbox → OneDrive
node src/index.js \
  --src "dropbox:///Documents" \
  --dest "onedrive:///Backup"
```

## Troubleshooting

### "Credentials file not found"

Make sure you created `config/credentials/dropbox-credentials.json` with the correct path.

### "Invalid OAuth request"

Your App key or App secret is incorrect. Double-check both values in the Dropbox App Console.

### "Redirect URI mismatch"

Make sure you added `http://localhost:3001/callback/dropbox` as a redirect URI in the app settings.

### "Missing required scope"

Go back to the **Permissions** tab and make sure you enabled all required permissions, then click **Submit**.

### "The app has not been approved for use yet"

For development apps, this is normal. You can still use the app with your own account. To allow other users, you need to apply for production approval.

### "Token expired" or "Invalid token"

Dropbox now uses short-lived tokens with refresh tokens:
1. Delete `config/tokens/dropbox-token.json`
2. Run the command again to re-authenticate

## Token Refresh

Dropbox supports two types of tokens:

1. **Long-lived tokens** (legacy): Never expire
2. **Short-lived tokens** (recommended): Expire after 4 hours, can be refreshed

The tool automatically handles token refresh if you have a refresh token.

## Security Best Practices

1. **Keep credentials secure**: Never commit `dropbox-credentials.json` to git
2. **Use scoped access**: Only request the permissions you need
3. **Rotate secrets**: Regularly regenerate your app secret
4. **Token storage**: The token file contains sensitive data - keep it secure

## API Limits

- **Dropbox API**: Rate limits vary by account type
- **File upload limits**:
  - Small files (<150MB): Single upload
  - Large files (>150MB): Upload session (automatic)
- **Batch operations**: Dropbox supports batch operations for efficiency

## Access Types

### Full Dropbox
- Access to all files and folders in the user's Dropbox
- Recommended for this tool

### App Folder
- Only accesses a specific folder (`/Apps/YourAppName/`)
- More restrictive but more secure
- If you chose this, all paths will be relative to the app folder

## Additional Resources

- [Dropbox Developer Console](https://www.dropbox.com/developers/apps)
- [Dropbox API Documentation](https://www.dropbox.com/developers/documentation)
- [OAuth Guide](https://www.dropbox.com/developers/documentation/http/documentation#oauth2-authorize)
- [Scoped Access Migration Guide](https://www.dropbox.com/developers/reference/oauth-guide)

## Differences from Google Drive / OneDrive

| Feature | Google Drive | OneDrive | Dropbox |
|---------|-------------|----------|---------|
| **Item Identifier** | ID | ID or Path | Path only |
| **Native Copy** | ✅ Instant | ✅ Async | ✅ Instant |
| **Upload Size Limit** | Unlimited (resumable) | Unlimited (sessions) | 150MB single / Unlimited sessions |
| **Token Expiry** | 1 hour (auto-refresh) | 1 hour (auto-refresh) | 4 hours (auto-refresh) |
| **Pagination** | ✅ | ✅ | ✅ |

## Need Help?

If you encounter issues:
1. Check the log file in `logs/`
2. Try with `--verbose` flag
3. Review Dropbox App Console settings
4. Ensure all permissions are enabled
5. Make sure redirect URI is exactly `http://localhost:3001/callback/dropbox`

## Example Complete Workflow

```bash
# 1. Create credentials file
mkdir -p config/credentials
cat > config/credentials/dropbox-credentials.json << EOF
{
  "clientId": "your-app-key",
  "clientSecret": "your-app-secret"
}
EOF

# 2. Test authentication
node src/index.js \
  --src "dropbox:///" \
  --dest "dropbox:///" \
  --dry-run

# 3. Copy some files
node src/index.js \
  --src "dropbox:///Photos" \
  --dest "dropbox:///Backup/Photos" \
  --verbose

# 4. Cross-provider backup
node src/index.js \
  --src "dropbox:///Important" \
  --dest "gdrive://YOUR_BACKUP_FOLDER_ID"
```

---

**Status**: Ready to use Dropbox with the Cloud Storage Copy Tool!
