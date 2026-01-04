const { google } = require('googleapis');
const path = require('path');

// Configuration - Update these values
const SOURCE_FOLDER_ID = 'YOUR_SOURCE_FOLDER_ID';
const DESTINATION_FOLDER_ID = 'YOUR_DESTINATION_FOLDER_ID';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

/**
 * Authenticate with Google Drive API using a service account
 */
async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return auth;
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
 * Copy a single file to a destination folder
 */
async function copyFile(drive, fileId, fileName, destinationFolderId) {
  try {
    const response = await drive.files.copy({
      fileId: fileId,
      requestBody: {
        name: fileName,
        parents: [destinationFolderId],
      },
    });
    console.log(`✓ Copied file: ${fileName}`);
    return response.data;
  } catch (error) {
    console.error(`✗ Error copying file ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Create a new folder in the destination
 */
async function createFolder(drive, folderName, destinationFolderId) {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [destinationFolderId],
      },
      fields: 'id, name',
    });
    console.log(`✓ Created folder: ${folderName}`);
    return response.data;
  } catch (error) {
    console.error(`✗ Error creating folder ${folderName}:`, error.message);
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
      // Create the subfolder in destination
      console.log(`${indent}📁 Processing folder: ${item.name}`);
      const newFolder = await createFolder(drive, item.name, destinationFolderId);

      // Recursively copy contents of this subfolder
      await copyFolderContents(drive, item.id, newFolder.id, indent + '  ');
    } else {
      // Copy the file
      console.log(`${indent}📄 Copying file: ${item.name}`);
      await copyFile(drive, item.id, item.name, destinationFolderId);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Google Drive folder copy...\n');

  try {
    // Authenticate
    const auth = await authenticate();
    const drive = google.drive({ version: 'v3', auth });

    // Verify source folder exists
    const sourceFolder = await drive.files.get({
      fileId: SOURCE_FOLDER_ID,
      fields: 'id, name',
    });
    console.log(`📂 Source folder: ${sourceFolder.data.name}`);

    // Verify destination folder exists
    const destFolder = await drive.files.get({
      fileId: DESTINATION_FOLDER_ID,
      fields: 'id, name',
    });
    console.log(`📂 Destination folder: ${destFolder.data.name}\n`);

    // Start copying
    await copyFolderContents(drive, SOURCE_FOLDER_ID, DESTINATION_FOLDER_ID);

    console.log('\n✅ Folder copy completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
