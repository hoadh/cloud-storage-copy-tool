## Setup

### To set up

  1. Create OAuth client ID (Desktop app) in Google Cloud Console
  2. Download the JSON and save as credentials.json in the project folder
  3. Edit copy-folder.js lines 8-9 with your folder IDs:
  const SOURCE_FOLDER_ID = 'your-source-folder-id';
  const DESTINATION_FOLDER_ID = 'your-destination-folder-id';

  To run:
  npm start

### Steps for OAuth 2.0

  1. Click Create Credentials → OAuth client ID
  2. If prompted, configure the OAuth consent screen first:
    - Choose "External" (or "Internal" if using Workspace)
    - Fill in app name and your email
    - Add scope: https://www.googleapis.com/auth/drive
    - Add yourself as a test user
  3. Back to Create OAuth client ID:
    - Application type: Desktop app
    - Give it a name
    - Click Create
  4. Download JSON: After creation, click the download icon (⬇️) next to your client ID, or click on it and then click Download JSON
  5. Save the file as credentials.json in your project folder

## Features

  - Recursively copies all subfolders and files
  - Preserves folder structure
  - Handles pagination for large folders
  - Progress logging with status indicators