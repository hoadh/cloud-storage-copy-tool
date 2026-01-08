#!/usr/bin/env node

/**
 * Validation script to test Phase 1 implementation
 */

const UriParser = require('./src/utils/uri-parser');
const Logger = require('./src/utils/logger');

console.log('='.repeat(60));
console.log('Phase 1 Implementation Validation');
console.log('='.repeat(60));
console.log('');

// Test 1: URI Parser
console.log('Test 1: URI Parser');
console.log('-'.repeat(60));

const testUris = [
    'gdrive://1ABC123xyz',
    'gdrive://https://drive.google.com/drive/folders/1XYZ789',
    'onedrive:///Documents/Backup',
    'onedrive://root',
    'dropbox:///Photos/2024',
];

testUris.forEach(uri => {
    try {
        const parsed = UriParser.parse(uri);
        console.log(`✓ ${uri}`);
        console.log(`  → Scheme: ${parsed.scheme}, Path: ${parsed.path}`);
    } catch (error) {
        console.log(`✗ ${uri}`);
        console.log(`  → Error: ${error.message}`);
    }
});

console.log('');

// Test 2: Logger
console.log('Test 2: Logger');
console.log('-'.repeat(60));

const logger = new Logger({
    logLevel: 'info',
    logToFile: false,
    logToConsole: true,
});

logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.debug('Debug message (should not show)');

console.log('✓ Logger working');
console.log('');

// Test 3: Module Imports
console.log('Test 3: Module Imports');
console.log('-'.repeat(60));

try {
    const BaseProvider = require('./src/providers/base-provider');
    console.log('✓ BaseProvider loaded');

    const GoogleDriveProvider = require('./src/providers/google-drive-provider');
    console.log('✓ GoogleDriveProvider loaded');

    const ProviderFactory = require('./src/providers/provider-factory');
    console.log('✓ ProviderFactory loaded');

    const GoogleAuth = require('./src/auth/google-auth');
    console.log('✓ GoogleAuth loaded');

    const CopyEngine = require('./src/copy-engine');
    console.log('✓ CopyEngine loaded');
} catch (error) {
    console.log(`✗ Module import failed: ${error.message}`);
}

console.log('');

// Test 4: Provider Factory
console.log('Test 4: Provider Factory');
console.log('-'.repeat(60));

const ProviderFactory = require('./src/providers/provider-factory');
const availableProviders = ProviderFactory.getAvailableProviders();
console.log(`Available providers: ${availableProviders.join(', ')}`);
console.log('✓ Provider factory working');

console.log('');
console.log('='.repeat(60));
console.log('Phase 1 Validation Complete!');
console.log('='.repeat(60));
console.log('');
console.log('Next steps:');
console.log('1. Set up Google Drive credentials (credentials.json)');
console.log('2. Test with actual Google Drive copy:');
console.log('   node src/index.js --src "gdrive://SOURCE_ID" --dest "gdrive://DEST_ID" --dry-run');
console.log('');
