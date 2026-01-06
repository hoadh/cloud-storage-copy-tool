const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

// Create log file with datetime format
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const LOG_FILE = path.join(__dirname, `copy-folder-${timestamp}.log`);
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Override console.log and console.error to also write to log file
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  logStream.write(message + '\n');
  originalLog.apply(console, args);
};

console.error = (...args) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  logStream.write('[ERROR] ' + message + '\n');
  originalError.apply(console, args);
};

const getFolderId = (input) => {
  const prefix = 'https://drive.google.com/drive/folders/';
  if (input && input.startsWith(prefix)) {
    return input.split('folders/')[1].split(/[?#]/)[0];
  }
  return input;
};

const SOURCE_FOLDER_ID = getFolderId(process.argv[2]);
const DESTINATION_FOLDER_ID = getFolderId(process.argv[3]);

if (!SOURCE_FOLDER_ID || !DESTINATION_FOLDER_ID) {
  console.error('Usage: node copy-folder.js <SOURCE_FOLDER_ID> <DESTINATION_FOLDER_ID>');
  process.exit(1);
}

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Authenticate with Google Drive API using OAuth 2.0
 */
async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3001/callback'
  );

  // Check if we have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(token);

    // Check if token is expired and refresh if needed
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('Token expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
    }

    return oauth2Client;
  }

  // Get new token via browser authorization
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Opening browser for authorization...');
  console.log('If browser does not open, visit this URL manually:\n');
  console.log(authUrl + '\n');

  // Open browser
  const open = (await import('open')).default;
  open(authUrl);

  // Start local server to receive callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const queryParams = new url.URL(req.url, 'http://localhost:3001').searchParams;
      const code = queryParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>');
        server.close();
        resolve(code);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Authorization failed</h1></body></html>');
      }
    });

    server.listen(3001, () => {
      console.log('Waiting for authorization...\n');
    });

    server.on('error', reject);
  });

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Save token for future use
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token saved for future use.\n');

  return oauth2Client;
}

/**
 * List all files and folders in a given folder
 */
async function listFolderContents(drive, folderId) {
  const items = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken: pageToken,
    });

    items.push(...response.data.files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return items;
}

/**
 * Check if a file already exists in the destination folder
 */
async function fileExistsInFolder(drive, fileName, destinationFolderId) {
  const response = await drive.files.list({
    q: `'${destinationFolderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });
  return response.data.files.length > 0 ? response.data.files[0] : null;
}

/**
 * Check if a folder already exists in the destination folder
 */
async function folderExistsInFolder(drive, folderName, destinationFolderId) {
  const response = await drive.files.list({
    q: `'${destinationFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });
  return response.data.files.length > 0 ? response.data.files[0] : null;
}

/**
 * Copy a single file to a destination folder (skip if exists)
 */
async function copyFile(drive, fileId, fileName, destinationFolderId) {
  try {
    // Check if file already exists
    const existingFile = await fileExistsInFolder(drive, fileName, destinationFolderId);
    if (existingFile) {
      console.log(`  Skipped file (already exists): ${fileName}`);
      return existingFile;
    }

    const response = await drive.files.copy({
      fileId: fileId,
      requestBody: {
        name: fileName,
        parents: [destinationFolderId],
      },
    });
    console.log(`  Copied file: ${fileName}`);
    return response.data;
  } catch (error) {
    console.error(`  Error copying file ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Create a new folder in the destination (or return existing one)
 */
async function createFolder(drive, folderName, destinationFolderId) {
  try {
    // Check if folder already exists
    const existingFolder = await folderExistsInFolder(drive, folderName, destinationFolderId);
    if (existingFolder) {
      console.log(`  Skipped folder (already exists): ${folderName}`);
      return existingFolder;
    }

    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [destinationFolderId],
      },
      fields: 'id, name',
    });
    console.log(`  Created folder: ${folderName}`);
    return response.data;
  } catch (error) {
    console.error(`  Error creating folder ${folderName}:`, error.message);
    throw error;
  }
}

/**
 * Recursively copy folder contents
 */
async function copyFolderContents(drive, sourceFolderId, destinationFolderId, indent = '') {
  const items = await listFolderContents(drive, sourceFolderId);

  for (const item of items) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      console.log(`${indent}[Folder] ${item.name}`);
      const newFolder = await createFolder(drive, item.name, destinationFolderId);
      await copyFolderContents(drive, item.id, newFolder.id, indent + '  ');
    } else {
      console.log(`${indent}[File] ${item.name}`);
      await copyFile(drive, item.id, item.name, destinationFolderId);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Google Drive Folder Copy\n');
  console.log('========================\n');
  console.log(`Log file: ${LOG_FILE}\n`);

  try {
    const auth = await authenticate();
    const drive = google.drive({ version: 'v3', auth });

    // Verify source folder exists
    const sourceFolder = await drive.files.get({
      fileId: SOURCE_FOLDER_ID,
      fields: 'id, name',
    });
    console.log(`Source: ${sourceFolder.data.name}`);

    // Verify destination folder exists
    const destFolder = await drive.files.get({
      fileId: DESTINATION_FOLDER_ID,
      fields: 'id, name',
    });
    console.log(`Destination: ${destFolder.data.name}\n`);

    console.log('Copying contents...\n');
    await copyFolderContents(drive, SOURCE_FOLDER_ID, DESTINATION_FOLDER_ID);

    console.log('\nDone! Folder copy completed successfully.');
    logStream.end();
  } catch (error) {
    console.error('\nError:', error.message);
    logStream.end();
    process.exit(1);
  }
}

main();
