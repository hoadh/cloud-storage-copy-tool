const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const BaseProvider = require('./base-provider');
const MicrosoftAuth = require('../auth/microsoft-auth');
const stream = require('stream');

/**
 * OneDrive provider implementation using Microsoft Graph API
 */
class OneDriveProvider extends BaseProvider {
    static PROVIDER_ID = 'onedrive';

    constructor(config = {}) {
        super(config);
        this.auth = new MicrosoftAuth(config);
        this.graphClient = null;
    }

    /**
     * Authenticate with OneDrive/Microsoft Graph
     */
    async authenticate() {
        const accessToken = await this.auth.authenticate();

        this.graphClient = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });

        this.client = this.graphClient;
        this.authenticated = true;
    }

    /**
     * Get metadata for a single item
     */
    async getItemMetadata(itemId) {
        try {
            // Handle special cases
            const itemPath = this.getItemPath(itemId);

            const item = await this.graphClient
                .api(itemPath)
                .get();

            return this.toItemMetadata(item);
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
            const itemPath = this.getItemPath(folderId);
            let nextLink = `${itemPath}/children`;

            while (nextLink) {
                const response = await this.graphClient
                    .api(nextLink)
                    .get();

                const mappedItems = response.value.map(item => this.toItemMetadata(item));
                items.push(...mappedItems);

                nextLink = response['@odata.nextLink'] || null;
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
            const itemPath = this.getItemPath(fileId);

            // Get download URL
            const response = await this.graphClient
                .api(`${itemPath}/content`)
                .getStream();

            return response;
        } catch (error) {
            throw new Error(`Failed to download file ${fileId}: ${error.message}`);
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(name, parentId) {
        try {
            const parentPath = this.getItemPath(parentId);

            const driveItem = {
                name: name,
                folder: {},
                '@microsoft.graph.conflictBehavior': 'fail',
            };

            const newFolder = await this.graphClient
                .api(`${parentPath}/children`)
                .post(driveItem);

            return this.toItemMetadata(newFolder);
        } catch (error) {
            throw new Error(`Failed to create folder "${name}": ${error.message}`);
        }
    }

    /**
     * Upload a file from a readable stream
     */
    async uploadFileStream(name, parentId, readableStream, size) {
        try {
            const parentPath = this.getItemPath(parentId);

            // For small files (< 4MB), use simple upload
            if (size < 4 * 1024 * 1024) {
                return await this.simpleUpload(name, parentPath, readableStream);
            } else {
                // For large files, use resumable upload session
                return await this.resumableUpload(name, parentPath, readableStream, size);
            }
        } catch (error) {
            throw new Error(`Failed to upload file "${name}": ${error.message}`);
        }
    }

    /**
     * Simple upload for small files
     */
    async simpleUpload(name, parentPath, readableStream) {
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of readableStream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const uploadedFile = await this.graphClient
            .api(`${parentPath}:/${name}:/content`)
            .put(buffer);

        return this.toItemMetadata(uploadedFile);
    }

    /**
     * Resumable upload for large files
     */
    async resumableUpload(name, parentPath, readableStream, size) {
        // Create upload session
        const uploadSession = await this.graphClient
            .api(`${parentPath}:/${name}:/createUploadSession`)
            .post({
                item: {
                    '@microsoft.graph.conflictBehavior': 'replace',
                },
            });

        const uploadUrl = uploadSession.uploadUrl;
        const chunkSize = 320 * 1024 * 10; // 3.2 MB chunks
        let uploadedBytes = 0;

        // Read stream in chunks and upload
        const chunks = [];
        for await (const chunk of readableStream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        while (uploadedBytes < size) {
            const chunk = buffer.slice(uploadedBytes, Math.min(uploadedBytes + chunkSize, size));
            const contentLength = chunk.length;

            const headers = {
                'Content-Length': contentLength.toString(),
                'Content-Range': `bytes ${uploadedBytes}-${uploadedBytes + contentLength - 1}/${size}`,
            };

            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: headers,
                body: chunk,
            });

            if (response.status === 200 || response.status === 201) {
                // Upload complete
                const uploadedFile = await response.json();
                return this.toItemMetadata(uploadedFile);
            } else if (response.status === 202) {
                // Continue uploading
                uploadedBytes += contentLength;
            } else {
                throw new Error(`Upload failed with status ${response.status}`);
            }
        }
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
     * Copy a file using native OneDrive API
     */
    async copyFileNative(fileId, name, destinationFolderId) {
        try {
            const itemPath = this.getItemPath(fileId);
            const destPath = this.getItemPath(destinationFolderId);

            // Get destination folder reference
            const destFolder = await this.graphClient
                .api(destPath)
                .get();

            // OneDrive copy is async - returns a monitor URL
            const response = await this.graphClient
                .api(`${itemPath}/copy`)
                .post({
                    parentReference: {
                        driveId: destFolder.parentReference?.driveId || 'me',
                        id: destinationFolderId,
                    },
                    name: name,
                });

            // The response contains a Location header with a monitor URL
            // For now, we'll wait a bit and then get the file
            // In production, you'd poll the monitor URL
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Try to find the copied file
            const copiedFile = await this.itemExists(name, destinationFolderId, 'file');

            if (copiedFile) {
                return copiedFile;
            }

            throw new Error('Copy operation did not complete in time');
        } catch (error) {
            throw new Error(`Failed to copy file "${name}": ${error.message}`);
        }
    }

    /**
     * OneDrive supports native copy (but it's async)
     */
    supportsNativeCopy() {
        return true;
    }

    /**
     * Convert OneDrive item to ItemMetadata
     */
    toItemMetadata(item) {
        const isFolder = !!item.folder;

        return {
            id: item.id,
            name: item.name,
            type: isFolder ? 'folder' : 'file',
            size: item.size,
            mimeType: item.file?.mimeType,
            modifiedTime: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : undefined,
        };
    }

    /**
     * Get API path for an item
     */
    getItemPath(itemId) {
        if (itemId === 'root' || itemId === '/') {
            return '/me/drive/root';
        }

        // If it's a path (starts with /), use path syntax
        if (itemId.startsWith('/')) {
            return `/me/drive/root:${itemId}`;
        }

        // Otherwise, it's an ID
        return `/me/drive/items/${itemId}`;
    }

    /**
     * Get provider display name
     */
    getProviderName() {
        return 'OneDrive';
    }
}

module.exports = OneDriveProvider;
