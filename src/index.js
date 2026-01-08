#!/usr/bin/env node

const { Command } = require('commander');
const ProviderFactory = require('./providers/provider-factory');
const CopyEngine = require('./copy-engine');
const Logger = require('./utils/logger');
const UriParser = require('./utils/uri-parser');

const program = new Command();

program
    .name('cloud-copy')
    .description('Copy files and folders between cloud storage providers')
    .version('2.0.0')
    .requiredOption('--src <uri>', 'Source folder URI (e.g., gdrive://FOLDER_ID)')
    .requiredOption('--dest <uri>', 'Destination folder URI (e.g., gdrive://FOLDER_ID)')
    .option('--skip-existing', 'Skip files that already exist (default: true)', true)
    .option('--no-skip-existing', 'Overwrite existing files')
    .option('--delete-source', 'Delete source files after successful copy', false)
    .option('--dry-run', 'Show what would be copied without actually copying', false)
    .option('--verbose', 'Enable verbose logging', false)
    .option('--log-file <path>', 'Custom log file path')
    .option('--log-level <level>', 'Log level: debug, info, warn, error', 'info');

program.parse();

const options = program.opts();

async function main() {
    // Initialize logger
    const loggerOptions = {
        logLevel: options.verbose ? 'debug' : options.logLevel,
    };

    if (options.logFile) {
        loggerOptions.logFileName = options.logFile;
    }

    const logger = new Logger(loggerOptions);

    try {
        // Display header
        logger.info('='.repeat(60));
        logger.info('Cloud Storage Copy Tool v2.0');
        logger.info('='.repeat(60));
        if (logger.getLogFilePath()) {
            logger.info(`Log file: ${logger.getLogFilePath()}`);
        }
        logger.info('');

        // Validate URIs
        logger.info('Validating URIs...');
        if (!UriParser.isValid(options.src)) {
            throw new Error(`Invalid source URI: ${options.src}`);
        }
        if (!UriParser.isValid(options.dest)) {
            throw new Error(`Invalid destination URI: ${options.dest}`);
        }

        // Parse and create providers
        logger.info('Creating source provider...');
        const { provider: sourceProvider, itemId: sourceId } = await ProviderFactory.fromUri(options.src);
        logger.info(`✓ Connected to ${sourceProvider.getProviderName()}`);

        logger.info('Creating destination provider...');
        const { provider: destProvider, itemId: destId } = await ProviderFactory.fromUri(options.dest);
        logger.info(`✓ Connected to ${destProvider.getProviderName()}`);
        logger.info('');

        // Verify folders exist
        logger.info('Verifying folders...');
        const sourceMetadata = await sourceProvider.getItemMetadata(sourceId);
        logger.info(`Source: ${sourceMetadata.name}`);

        const destMetadata = await destProvider.getItemMetadata(destId);
        logger.info(`Destination: ${destMetadata.name}`);
        logger.info('');

        // Check if source is a folder
        if (sourceMetadata.type !== 'folder') {
            throw new Error('Source must be a folder, not a file');
        }

        // Check if destination is a folder
        if (destMetadata.type !== 'folder') {
            throw new Error('Destination must be a folder, not a file');
        }

        // Display copy configuration
        logger.info('Copy Configuration:');
        logger.info(`  Skip existing: ${options.skipExisting}`);
        logger.info(`  Delete source: ${options.deleteSource}`);
        logger.info(`  Dry run: ${options.dryRun}`);
        logger.info('');

        if (options.dryRun) {
            logger.warn('DRY RUN MODE - No files will be copied');
            logger.info('');
        }

        // Initialize copy engine
        const copyEngine = new CopyEngine(sourceProvider, destProvider, logger, {
            skipExisting: options.skipExisting,
            deleteSource: options.deleteSource,
            dryRun: options.dryRun,
        });

        // Start copying
        logger.info('Starting copy operation...');
        logger.info('');

        const startTime = Date.now();
        await copyEngine.copyFolder(sourceId, destId);
        const duration = Date.now() - startTime;

        // Display summary
        logger.info('');
        copyEngine.printSummary();
        logger.info(`Duration: ${(duration / 1000).toFixed(2)}s`);
        logger.info('');

        if (copyEngine.getStats().errors > 0) {
            logger.warn('⚠ Copy completed with errors. Check the log for details.');
            process.exitCode = 1;
        } else {
            logger.info('✓ Copy completed successfully!');
        }

        await logger.close();
    } catch (error) {
        logger.error('');
        logger.error('Fatal error:', error.message);
        logger.error('');

        if (options.verbose && error.stack) {
            logger.error('Stack trace:');
            logger.error(error.stack);
        }

        await logger.close();
        process.exit(1);
    }
}

main();
