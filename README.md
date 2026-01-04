## Setup

1. Get Google Cloud credentials:
  - Go to https://console.cloud.google.com
  - Create a project (or use existing)
  - Enable the Google Drive API
  - Create a Service Account (APIs & Services → Credentials → Create Credentials)
  - Download the JSON key file and save it as credentials.json in this folder
2. Share folders with the service account:
  - Copy the service account email (looks like name@project.iam.gserviceaccount.com)
  - Share both source and destination folders with this email (Editor access)
3. Update the script:
Edit copy  -folder.js and set:
const SOURCE_FOLDER_ID = 'your-source-folder-id';
const DESTINATION_FOLDER_ID = 'your-destination-folder-id';
3. (Folder IDs are in the URL: drive.google.com/drive/folders/{FOLDER_ID})
4. Run:
npm start

## Features

  - Recursively copies all subfolders and files
  - Preserves folder structure
  - Handles pagination for large folders
  - Progress logging with status indicators