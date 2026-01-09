#!/usr/bin/env node

/**
 * Validation script for Phase 2 implementation (OneDrive)
 */

const UriParser = require('./src/utils/uri-parser');
const ProviderFactory = require('./src/providers/provider-factory');

console.log('='.repeat(60));
console.log('Phase 2 Implementation Validation (OneDrive)');
console.log('='.repeat(60));
console.log('');

// Test 1: OneDrive URI Parser
console.log('Test 1: OneDrive URI Parsing');
console.log('-'.repeat(60));

const testUris = [
    'onedrive://root',
    'onedrive:///',
    'onedrive:///Documents',
    'onedrive:///Documents/Projects/2024',
    'onedrive://ITEM_ID_12345',
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

// Test 2: Module Imports
console.log('Test 2: OneDrive Module Imports');
console.log('-'.repeat(60));

try {
    const MicrosoftAuth = require('./src/auth/microsoft-auth');
    console.log('✓ MicrosoftAuth loaded');

    const OneDriveProvider = require('./src/providers/onedrive-provider');
    console.log('✓ OneDriveProvider loaded');

    // Check if it extends BaseProvider
    const BaseProvider = require('./src/providers/base-provider');
    const testProvider = new OneDriveProvider();
    if (testProvider instanceof BaseProvider) {
        console.log('✓ OneDriveProvider extends BaseProvider');
    } else {
        console.log('✗ OneDriveProvider does not extend BaseProvider');
    }
} catch (error) {
    console.log(`✗ Module import failed: ${error.message}`);
}

console.log('');

// Test 3: Provider Factory Registration
console.log('Test 3: Provider Factory Registration');
console.log('-'.repeat(60));

const availableProviders = ProviderFactory.getAvailableProviders();
console.log(`Available providers: ${availableProviders.join(', ')}`);

if (availableProviders.includes('onedrive')) {
    console.log('✓ OneDrive provider registered');
} else {
    console.log('✗ OneDrive provider not registered');
}

if (availableProviders.includes('gdrive')) {
    console.log('✓ Google Drive provider still registered');
} else {
    console.log('✗ Google Drive provider missing');
}

console.log('');

// Test 4: Cross-Provider URI Combinations
console.log('Test 4: Cross-Provider URI Combinations');
console.log('-'.repeat(60));

const crossProviderTests = [
    { src: 'gdrive://123', dest: 'onedrive:///Backup' },
    { src: 'onedrive:///Documents', dest: 'gdrive://456' },
    { src: 'onedrive://root', dest: 'onedrive:///Copy' },
];

crossProviderTests.forEach(test => {
    try {
        const srcParsed = UriParser.parse(test.src);
        const destParsed = UriParser.parse(test.dest);
        console.log(`✓ ${srcParsed.scheme} → ${destParsed.scheme}`);
    } catch (error) {
        console.log(`✗ Parse failed: ${error.message}`);
    }
});

console.log('');

// Test 5: Dependencies Check
console.log('Test 5: Dependencies Check');
console.log('-'.repeat(60));

try {
    const msal = require('@azure/msal-node');
    console.log('✓ @azure/msal-node installed');

    const graphClient = require('@microsoft/microsoft-graph-client');
    console.log('✓ @microsoft/microsoft-graph-client installed');

    require('isomorphic-fetch');
    console.log('✓ isomorphic-fetch installed');
} catch (error) {
    console.log(`✗ Dependency missing: ${error.message}`);
}

console.log('');

console.log('='.repeat(60));
console.log('Phase 2 Validation Complete!');
console.log('='.repeat(60));
console.log('');
console.log('Next steps:');
console.log('1. Set up OneDrive credentials following ONEDRIVE-SETUP.md');
console.log('2. Create config/credentials/microsoft-credentials.json');
console.log('3. Test authentication:');
console.log('   node src/index.js --src "onedrive://root" --dest "onedrive://root" --dry-run');
console.log('4. Test cross-provider copy:');
console.log('   node src/index.js --src "gdrive://ID" --dest "onedrive:///Backup" --dry-run');
console.log('');
