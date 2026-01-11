const { Dropbox } = require('dropbox');
const BaseProvider = require('./base-provider');
const DropboxAuth = require('../auth/dropbox-auth');
const stream = require('stream');

/**
 * Dropbox provider implementation
 */
class DropboxProvider extends BaseProvider {
    static PROVIDER_ID = 'dropbox';

    constructor(config = {}) {
        super(config);
        this.auth = new DropboxAuth(config);
        this.dbx = null;
    }

    /**
     * Authenticate with Dropbox
     */
    async authenticate() {
        this.dbx = await this.auth.authenticate();
        this.client = this.dbx;
        this.authenticated = true;
    }

    /**
     * Get metadata for a single item
     */
    async getItemMetadata(itemId) {
        try {
            const path = this.normalizePath(itemId);

            const response = await this.dbx.filesGetMetadata({ path });
            return this.toItemMetadata(response.result);
        } catch (error) {
            throw new Error(`Failed to get metadata for ${itemId}: ${error.message}`);
        }
    }

    /**
     * List contents of a folder
     */
    async listFolderContents(folderId) {
        const items = [];

        try {
            const path = this.normalizePath(folderId);

            let hasMore = true;
            let cursor = null;

            // Initial request
            let response = await this.dbx.filesListFolder({
                path: path,
                recursive: false,
            });

            items.push(...response.result.entries.map(item => this.toItemMetadata(item)));
            hasMore = response.result.has_more;
            cursor = response.result.cursor;

            // Continue with pagination if needed
            while (hasMore) {
                response = await this.dbx.filesListFolderContinue({ cursor });
                items.push(...response.result.entries.map(item => this.toItemMetadata(item)));
                hasMore = response.result.has_more;
                cursor = response.result.cursor;
            }

            return items;
        } catch (error) {
            throw new Error(`Failed to list folder contents: ${error.message}`);
        }
    }

    /**
     * Download a file as a readable stream
     */
    async downloadFileStream(fileId) {
        try {
            const path = this.normalizePath(fileId);

            const response = await this.dbx.filesDownload({ path });

            // The response contains fileBinary which is a Buffer
            // Convert to a readable stream
            const readable = new stream.Readable();
            readable.push(response.result.fileBinary);
            readable.push(null);

            return readable;
        } catch (error) {
            throw new Error(`Failed to download file ${fileId}: ${error.message}`);
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(name, parentId) {
        try {
            const parentPath = this.normalizePath(parentId);
            const folderPath = `${parentPath}/${name}`.replace('//', '/');

            const response = await this.dbx.filesCreateFolderV2({
                path: folderPath,
                autorename: false,
            });

            return this.toItemMetadata(response.result.metadata);
        } catch (error) {
            // Check if folder already exists
            if (error.status === 409) {
                // Folder exists, return existing folder metadata
                const existing = await this.itemExists(name, parentId, 'folder');
                if (existing) {
                    return existing;
                }
            }
            throw new Error(`Failed to create folder "${name}": ${error.message}`);
        }
    }

    /**
     * Upload a file from a readable stream
     */
    async uploadFileStream(name, parentId, readableStream, size) {
        try {
            const parentPath = this.normalizePath(parentId);
            const filePath = `${parentPath}/${name}`.replace('//', '/');

            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of readableStream) {
                chunks.push(chunk);
            }
            const contents = Buffer.concat(chunks);

            // Dropbox has a 150MB limit for regular upload
            // For larger files, we should use upload session
            if (size > 150 * 1024 * 1024) {
                return await this.uploadLargeFile(filePath, contents, size);
            } else {
                return await this.uploadSmallFile(filePath, contents);
            }
        } catch (error) {
            throw new Error(`Failed to upload file "${name}": ${error.message}`);
        }
    }

    /**
     * Upload small file (<150MB)
     */
    async uploadSmallFile(path, contents) {
        const response = await this.dbx.filesUpload({
            path: path,
            contents: contents,
            mode: { '.tag': 'overwrite' },
            autorename: false,
        });

        return this.toItemMetadata(response.result);
    }

    /**
     * Upload large file (>150MB) using upload session
     */
    async uploadLargeFile(path, contents, size) {
        const chunkSize = 8 * 1024 * 1024; // 8MB chunks
        let offset = 0;

        // Start session
        const startResponse = await this.dbx.filesUploadSessionStart({
            contents: contents.slice(0, chunkSize),
            close: false,
        });

        const sessionId = startResponse.result.session_id;
        offset += chunkSize;

        // Upload chunks
        while (offset < size - chunkSize) {
            await this.dbx.filesUploadSessionAppendV2({
                cursor: {
                    session_id: sessionId,
                    offset: offset,
                },
                contents: contents.slice(offset, offset + chunkSize),
                close: false,
            });
            offset += chunkSize;
        }

        // Finish session
        const finishResponse = await this.dbx.filesUploadSessionFinish({
            cursor: {
                session_id: sessionId,
                offset: offset,
            },
            commit: {
                path: path,
                mode: { '.tag': 'overwrite' },
                autorename: false,
            },
            contents: contents.slice(offset),
        });

        return this.toItemMetadata(finishResponse.result);
    }

    /**
     * Check if an item exists in a folder
     */
    async itemExists(name, parentId, type = null) {
        try {
            const items = await this.listFolderContents(parentId);

            const found = items.find(item => {
                if (item.name !== name) return false;
                if (type && item.type !== type) return false;
                return true;
            });

            return found || null;
        } catch (error) {
            throw new Error(`Failed to check if item exists: ${error.message}`);
        }
    }

    /**
     * Copy a file using native Dropbox API
     */
    async copyFileNative(fileId, name, destinationFolderId) {
        try {
            const sourcePath = this.normalizePath(fileId);
            const destPath = this.normalizePath(destinationFolderId);
            const destFilePath = `${destPath}/${name}`.replace('//', '/');

            const response = await this.dbx.filesCopyV2({
                from_path: sourcePath,
                to_path: destFilePath,
                autorename: false,
            });

            return this.toItemMetadata(response.result.metadata);
        } catch (error) {
            throw new Error(`Failed to copy file "${name}": ${error.message}`);
        }
    }

    /**
     * Dropbox supports native copy
     */
    supportsNativeCopy() {
        return true;
    }

    /**
     * Convert Dropbox metadata to ItemMetadata
     */
    toItemMetadata(item) {
        // Dropbox uses .tag to indicate type
        const isFolder = item['.tag'] === 'folder';

        return {
            id: item.path_lower || item.id, // Use path as ID
            name: item.name,
            type: isFolder ? 'folder' : 'file',
            size: item.size,
            mimeType: undefined, // Dropbox doesn't provide MIME type in metadata
            modifiedTime: item.client_modified ? new Date(item.client_modified) : undefined,
            _dropboxPath: item.path_lower, // Store the path for future use
        };
    }

    /**
     * Normalize path for Dropbox API
     * Dropbox paths must start with / and cannot end with /
     * Empty string means root
     */
    normalizePath(path) {
        if (!path || path === 'root' || path === '/') {
            return ''; // Root folder
        }

        // Ensure it starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Remove trailing slash
        if (path.endsWith('/') && path.length > 1) {
            path = path.slice(0, -1);
        }

        return path;
    }

    /**
     * Get provider display name
     */
    getProviderName() {
        return 'Dropbox';
    }
}

module.exports = DropboxProvider;
