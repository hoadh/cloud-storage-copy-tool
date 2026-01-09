# OneDrive Setup Guide

This guide walks you through setting up OneDrive integration for the Cloud Storage Copy Tool.

## Prerequisites

- Microsoft account (personal or work/school)
- Azure account (free tier is sufficient)

## Step 1: Register App in Azure Portal

### 1.1 Go to Azure Portal

Visit: https://portal.azure.com/

### 1.2 Navigate to App Registrations

1. Search for "App registrations" in the top search bar
2. Click **App registrations**
3. Click **+ New registration**

### 1.3 Register the Application

Fill in the following details:

- **Name**: `Cloud Storage Copy Tool` (or any name you prefer)
- **Supported account types**: 
  - Choose **"Accounts in any organizational directory and personal Microsoft accounts"**
  - This allows both personal OneDrive and work/school OneDrive
- **Redirect URI**: 
  - Platform: **Web**
  - URI: `http://localhost:3001/callback/microsoft`

Click **Register**

## Step 2: Configure Authentication

### 2.1 Add Client Secret

1. In your app's page, go to **Certificates & secrets** (left sidebar)
2. Click **+ New client secret**
3. Description: `Cloud Copy Tool Secret`
4. Expires: Choose **24 months** (or your preference)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately - you won't see it again!

### 2.2 Configure API Permissions

1. Go to **API permissions** (left sidebar)
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Search for and add these permissions:
   - `Files.ReadWrite.All` - Read and write all user files
   - `offline_access` - Maintain access to data you've given it access to
6. Click **Add permissions**

**Note**: No admin consent is needed for personal accounts. For work/school accounts, an admin may need to grant consent.

## Step 3: Get Your Credentials

### 3.1 Copy Application (client) ID

1. Go to **Overview** (left sidebar)
2. Copy the **Application (client) ID** (looks like: `12345678-1234-1234-1234-123456789012`)

### 3.2 Copy Directory (tenant) ID

1. Still in **Overview**
2. Copy the **Directory (tenant) ID**

### 3.3 Copy Client Secret

You should have copied this in Step 2.1. If not, create a new one.

## Step 4: Create Credentials File

Create the file: `config/credentials/microsoft-credentials.json`

```json
{
  "clientId": "YOUR_APPLICATION_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET_VALUE",
  "tenantId": "common"
}
```

**Replace**:
- `YOUR_APPLICATION_CLIENT_ID` - The Application (client) ID from step 3.1
- `YOUR_CLIENT_SECRET_VALUE` - The client secret value from step 2.1

**Note**: Use `"tenantId": "common"` for personal accounts. For work/school accounts, you can use the specific tenant ID.

### Example

```json
{
  "clientId": "12345678-1234-1234-1234-123456789012",
  "clientSecret": "AbC~1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ",
  "tenantId": "common"
}
```

## Step 5: Test the Connection

Run a dry-run to test authentication:

```bash
# List your OneDrive root folder (dry run)
node src/index.js \
  --src "onedrive://root" \
  --dest "onedrive://root" \
  --dry-run
```

On first run:
1. Browser will open for Microsoft login
2. Sign in with your Microsoft account
3. Grant permissions to the app
4. You'll see "Authorization successful!" message
5. The token will be saved to `config/tokens/microsoft-token.json`

## OneDrive URI Formats

### Root folder
```bash
onedrive://root
onedrive:///
```

### Folder by path
```bash
onedrive:///Documents
onedrive:///Documents/Projects
onedrive:///Photos/2024
```

### Folder by ID (after you get it from API)
```bash
onedrive://ITEM_ID_HERE
```

## Usage Examples

### Copy within OneDrive

```bash
# Copy from one OneDrive folder to another
node src/index.js \
  --src "onedrive:///Documents/Source" \
  --dest "onedrive:///Backup/Destination"
```

### Cross-Provider Copy

```bash
# Google Drive → OneDrive
node src/index.js \
  --src "gdrive://GOOGLE_DRIVE_FOLDER_ID" \
  --dest "onedrive:///Backup/FromGDrive"

# OneDrive → Google Drive
node src/index.js \
  --src "onedrive:///Documents/ToBackup" \
  --dest "gdrive://GOOGLE_DRIVE_FOLDER_ID"
```

## Troubleshooting

### "Credentials file not found"

Make sure you created `config/credentials/microsoft-credentials.json` with the correct path.

### "AADSTS700016: Application with identifier 'xxx' was not found"

Your client ID is incorrect. Double-check the Application (client) ID in Azure Portal.

### "invalid_client"

Your client secret is incorrect or expired. Create a new client secret in Azure Portal.

### "AADSTS65001: The user or administrator has not consented"

Click the consent link in your browser and approve the permissions.

### "Access token expired"

The tool should automatically refresh tokens. If it doesn't work:
1. Delete `config/tokens/microsoft-token.json`
2. Run the command again to re-authenticate

### "Files.ReadWrite.All permission not granted"

Make sure you added the API permissions in Step 2.2.

## Security Best Practices

1. **Keep credentials secure**: Never commit `microsoft-credentials.json` to git
2. **Rotate secrets**: Regularly update your client secret
3. **Minimal permissions**: Only grant necessary API permissions
4. **Token storage**: The token file contains sensitive data - keep it secure

## API Limits

- **Microsoft Graph**: Throttling limits vary by account type
- **Personal OneDrive**: Generally more restrictive than business accounts
- **Large files**: Files > 4MB use resumable upload (handled automatically)

## Additional Resources

- [Azure Portal](https://portal.azure.com/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [OneDrive API Reference](https://docs.microsoft.com/en-us/onedrive/developer/)
- [App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## Need Help?

If you encounter issues:
1. Check the log file in `logs/`
2. Try with `--verbose` flag
3. Review Azure Portal app configuration
4. Ensure all API permissions are granted
