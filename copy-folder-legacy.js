#!/usr/bin/env node

/**
 * Legacy CLI for backward compatibility
 * Usage: node copy-folder.js <SOURCE_FOLDER_ID> <DESTINATION_FOLDER_ID>
 * 
 * This script now redirects to the new modular implementation
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('');
console.log('================================================================================');
console.log('LEGACY MODE: This script is deprecated. Please use the new CLI:');
console.log('  node src/index.js --src gdrive://SOURCE_ID --dest gdrive://DEST_ID');
console.log('================================================================================');
console.log('');
console.log('Redirecting to new implementation...');
console.log('');

// Get folder IDs from command line arguments
const sourceFolderId = process.argv[2];
const destFolderId = process.argv[3];

if (!sourceFolderId || !destFolderId) {
    console.error('Usage: node copy-folder.js <SOURCE_FOLDER_ID> <DESTINATION_FOLDER_ID>');
    process.exit(1);
}

// Build new CLI args
const newCliPath = path.join(__dirname, 'src', 'index.js');
const args = [
    newCliPath,
    '--src', `gdrive://${sourceFolderId}`,
    '--dest', `gdrive://${destFolderId}`,
];

// Spawn the new CLI
const child = spawn('node', args, {
    stdio: 'inherit',
    cwd: __dirname,
});

child.on('exit', (code) => {
    process.exit(code);
});
