#!/usr/bin/env node

/**
 * Validation script for Phase 3 implementation (Dropbox)
 */

const UriParser = require('./src/utils/uri-parser');
const ProviderFactory = require('./src/providers/provider-factory');

console.log('='.repeat(60));
console.log('Phase 3 Implementation Validation (Dropbox)');
console.log('='.repeat(60));
console.log('');

// Test 1: Dropbox URI Parser
console.log('Test 1: Dropbox URI Parsing');
console.log('-'.repeat(60));

const testUris = [
    'dropbox:///',
    'dropbox://root',
    'dropbox:///Documents',
    'dropbox:///Photos/2024',
    'dropbox:///Work/Projects/Active',
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
console.log('Test 2: Dropbox Module Imports');
console.log('-'.repeat(60));

try {
    const DropboxAuth = require('./src/auth/dropbox-auth');
    console.log('✓ DropboxAuth loaded');

    const DropboxProvider = require('./src/providers/dropbox-provider');
    console.log('✓ DropboxProvider loaded');

    // Check if it extends BaseProvider
    const BaseProvider = require('./src/providers/base-provider');
    const testProvider = new DropboxProvider();
    if (testProvider instanceof BaseProvider) {
        console.log('✓ DropboxProvider extends BaseProvider');
    } else {
        console.log('✗ DropboxProvider does not extend BaseProvider');
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

if (availableProviders.includes('dropbox')) {
    console.log('✓ Dropbox provider registered');
} else {
    console.log('✗ Dropbox provider not registered');
}

if (availableProviders.includes('gdrive')) {
    console.log('✓ Google Drive provider still registered');
} else {
    console.log('✗ Google Drive provider missing');
}

if (availableProviders.includes('onedrive')) {
    console.log('✓ OneDrive provider still registered');
} else {
    console.log('✗ OneDrive provider missing');
}

console.log('');

// Test 4: All Provider Combinations
console.log('Test 4: All Cross-Provider Combinations');
console.log('-'.repeat(60));

const combinations = [
    { src: 'gdrive://123', dest: 'gdrive://456', name: 'gdrive → gdrive' },
    { src: 'gdrive://123', dest: 'onedrive:///Backup', name: 'gdrive → onedrive' },
    { src: 'gdrive://123', dest: 'dropbox:///Backup', name: 'gdrive → dropbox' },
    { src: 'onedrive:///Docs', dest: 'gdrive://456', name: 'onedrive → gdrive' },
    { src: 'onedrive:///Docs', dest: 'onedrive:///Backup', name: 'onedrive → onedrive' },
    { src: 'onedrive:///Docs', dest: 'dropbox:///Backup', name: 'onedrive → dropbox' },
    { src: 'dropbox:///Photos', dest: 'gdrive://456', name: 'dropbox → gdrive' },
    { src: 'dropbox:///Photos', dest: 'onedrive:///Backup', name: 'dropbox → onedrive' },
    { src: 'dropbox:///Photos', dest: 'dropbox:///Backup', name: 'dropbox → dropbox' },
];

combinations.forEach(test => {
    try {
        const srcParsed = UriParser.parse(test.src);
        const destParsed = UriParser.parse(test.dest);
        console.log(`✓ ${test.name}`);
    } catch (error) {
        console.log(`✗ ${test.name}: ${error.message}`);
    }
});

console.log('');

// Test 5: Dependencies Check
console.log('Test 5: Dependencies Check');
console.log('-'.repeat(60));

try {
    const dropbox = require('dropbox');
    console.log('✓ dropbox SDK installed');

    const fetch = require('isomorphic-fetch');
    console.log('✓ isomorphic-fetch installed');
} catch (error) {
    console.log(`✗ Dependency missing: ${error.message}`);
}

console.log('');

// Test 6: Provider Count
console.log('Test 6: Complete Provider Coverage');
console.log('-'.repeat(60));

const expectedProviders = ['gdrive', 'onedrive', 'dropbox'];
const registeredProviders = ProviderFactory.getAvailableProviders();

if (registeredProviders.length === expectedProviders.length) {
    console.log(`✓ All ${expectedProviders.length} providers registered`);
} else {
    console.log(`✗ Expected ${expectedProviders.length} providers, got ${registeredProviders.length}`);
}

expectedProviders.forEach(provider => {
    if (registeredProviders.includes(provider)) {
        console.log(`✓ ${provider}`);
    } else {
        console.log(`✗ ${provider} missing`);
    }
});

console.log('');

console.log('='.repeat(60));
console.log('Phase 3 Validation Complete!');
console.log('='.repeat(60));
console.log('');
console.log('Summary:');
console.log(`  Total providers: ${registeredProviders.length}/3`);
console.log(`  Total combinations: 9 (3x3 matrix)`);
console.log('');
console.log('Next steps:');
console.log('1. Set up Dropbox credentials following DROPBOX-SETUP.md');
console.log('2. Create config/credentials/dropbox-credentials.json');
console.log('3. Test authentication:');
console.log('   node src/index.js --src "dropbox:///" --dest "dropbox:///" --dry-run');
console.log('4. Test all cross-provider combinations!');
console.log('');
console.log('Available combinations:');
combinations.forEach(combo => {
    console.log(`  - ${combo.name}`);
});
console.log('');
