/**
 * Copy engine - orchestrates file/folder copying between providers
 */
class CopyEngine {
    constructor(sourceProvider, destProvider, logger, options = {}) {
        this.source = sourceProvider;
        this.dest = destProvider;
        this.logger = logger;
        this.options = {
            skipExisting: options.skipExisting !== false,
            deleteSource: options.deleteSource || false,
            dryRun: options.dryRun || false,
            ...options,
        };

        this.stats = {
            foldersCreated: 0,
            foldersSkipped: 0,
            filesCopied: 0,
            filesSkipped: 0,
            errors: 0,
            bytesTransferred: 0,
        };
    }

    /**
     * Copy folder contents recursively
     */
    async copyFolder(sourceFolderId, destFolderId, indent = '') {
        this.logger.debug(`Listing contents of folder: ${sourceFolderId}`);
        const items = await this.source.listFolderContents(sourceFolderId);
        this.logger.debug(`Found ${items.length} items`);

        for (const item of items) {
            try {
                if (item.type === 'folder') {
                    await this.processFolder(item, destFolderId, indent);
                } else {
                    await this.processFile(item, destFolderId, indent);
                }
            } catch (error) {
                this.logger.error(`${indent}Error processing ${item.name}:`, error.message);
                this.stats.errors++;
            }
        }
    }

    /**
     * Process a folder item
     */
    async processFolder(item, destFolderId, indent) {
        this.logger.info(`${indent}[Folder] ${item.name}`);

        // Check if folder exists
        let destFolder = null;
        if (this.options.skipExisting) {
            destFolder = await this.dest.itemExists(item.name, destFolderId, 'folder');
        }

        if (destFolder) {
            this.logger.info(`${indent}  Skipped (already exists)`);
            this.stats.foldersSkipped++;
        } else {
            if (this.options.dryRun) {
                this.logger.info(`${indent}  Would create folder`);
                // Create a mock folder for dry run
                destFolder = { id: 'dry-run-' + item.id, name: item.name, type: 'folder' };
            } else {
                destFolder = await this.dest.createFolder(item.name, destFolderId);
                this.logger.info(`${indent}  Created`);
                this.stats.foldersCreated++;
            }
        }

        // Recurse into folder
        await this.copyFolder(item.id, destFolder.id, indent + '  ');
    }

    /**
     * Process a file item
     */
    async processFile(item, destFolderId, indent) {
        this.logger.info(`${indent}[File] ${item.name}`);

        // Check if file exists
        if (this.options.skipExisting) {
            const existing = await this.dest.itemExists(item.name, destFolderId, 'file');
            if (existing) {
                this.logger.info(`${indent}  Skipped (already exists)`);
                this.stats.filesSkipped++;
                return;
            }
        }

        if (this.options.dryRun) {
            this.logger.info(`${indent}  Would copy file (${this.formatBytes(item.size)})`);
            return;
        }

        // Copy file
        if (this.isSameProvider() && this.source.supportsNativeCopy()) {
            await this.source.copyFileNative(item.id, item.name, destFolderId);
            this.logger.info(`${indent}  Copied (native)`);
        } else {
            await this.copyFileCrossProvider(item, destFolderId, indent);
            this.logger.info(`${indent}  Copied (streamed)`);
        }

        this.stats.filesCopied++;
        if (item.size) {
            this.stats.bytesTransferred += item.size;
        }

        // Delete source if requested
        if (this.options.deleteSource) {
            // TODO: Implement delete functionality
            this.logger.warn(`${indent}  Delete source not yet implemented`);
        }
    }

    /**
     * Copy file via stream (cross-provider or fallback)
     */
    async copyFileCrossProvider(item, destFolderId, indent) {
        this.logger.debug(`${indent}  Downloading from source...`);
        const stream = await this.source.downloadFileStream(item.id);

        this.logger.debug(`${indent}  Uploading to destination...`);
        await this.dest.uploadFileStream(item.name, destFolderId, stream, item.size);
    }

    /**
     * Check if source and destination are the same provider
     */
    isSameProvider() {
        return this.source.constructor.PROVIDER_ID === this.dest.constructor.PROVIDER_ID;
    }

    /**
     * Get copy statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Print summary statistics
     */
    printSummary() {
        this.logger.info('\n' + '='.repeat(50));
        this.logger.info('Copy Summary');
        this.logger.info('='.repeat(50));
        this.logger.info(`Folders created: ${this.stats.foldersCreated}`);
        this.logger.info(`Folders skipped: ${this.stats.foldersSkipped}`);
        this.logger.info(`Files copied: ${this.stats.filesCopied}`);
        this.logger.info(`Files skipped: ${this.stats.filesSkipped}`);
        this.logger.info(`Errors: ${this.stats.errors}`);
        this.logger.info(`Data transferred: ${this.formatBytes(this.stats.bytesTransferred)}`);
        this.logger.info('='.repeat(50));
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
    }
}

module.exports = CopyEngine;
