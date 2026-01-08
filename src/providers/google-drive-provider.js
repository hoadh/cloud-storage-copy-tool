const { google } = require('googleapis');
const BaseProvider = require('./base-provider');
const GoogleAuth = require('../auth/google-auth');

/**
 * Google Drive provider implementation
 */
class GoogleDriveProvider extends BaseProvider {
    static PROVIDER_ID = 'gdrive';

    constructor(config = {}) {
        super(config);
        this.auth = new GoogleAuth(config);
        this.drive = null;
    }

    /**
     * Authenticate with Google Drive
     */
    async authenticate() {
        const oauth2Client = await this.auth.authenticate();
        this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        this.client = this.drive;
        this.authenticated = true;
    }

    /**
     * Get metadata for a single item
     */
    async getItemMetadata(itemId) {
        try {
            const response = await this.drive.files.get({
                fileId: itemId,
                fields: 'id, name, mimeType, size, modifiedTime',
            });

            return this.toItemMetadata(response.data);
        } catch (error) {
            throw new Error(`Failed to get metadata for ${itemId}: ${error.message}`);
        }
    }

    /**
     * List contents of a folder
     */
    async listFolderContents(folderId) {
        const items = [];
        let pageToken = null;

        try {
            do {
                const response = await this.drive.files.list({
                    q: `'${folderId}' in parents and trashed = false`,
                    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
                    pageSize: 1000,
                    pageToken: pageToken,
                });

                const files = response.data.files.map(file => this.toItemMetadata(file));
                items.push(...files);
                pageToken = response.data.nextPageToken;
            } while (pageToken);

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
            const response = await this.drive.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            return response.data;
        } catch (error) {
            throw new Error(`Failed to download file ${fileId}: ${error.message}`);
        }
    }

    /**
     * Create a new folder
     */
    async createFolder(name, parentId) {
        try {
            const response = await this.drive.files.create({
                requestBody: {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId],
                },
                fields: 'id, name, mimeType',
            });

            return this.toItemMetadata(response.data);
        } catch (error) {
            throw new Error(`Failed to create folder "${name}": ${error.message}`);
        }
    }

    /**
     * Upload a file from a readable stream
     */
    async uploadFileStream(name, parentId, stream, size) {
        try {
            const response = await this.drive.files.create({
                requestBody: {
                    name: name,
                    parents: [parentId],
                },
                media: {
                    body: stream,
                },
                fields: 'id, name, mimeType, size',
            });

            return this.toItemMetadata(response.data);
        } catch (error) {
            throw new Error(`Failed to upload file "${name}": ${error.message}`);
        }
    }

    /**
     * Check if an item exists in a folder
     */
    async itemExists(name, parentId, type = null) {
        try {
            // Escape single quotes in name
            const escapedName = name.replace(/'/g, "\\'");

            // Build query
            let query = `'${parentId}' in parents and name = '${escapedName}' and trashed = false`;

            if (type === 'folder') {
                query += ` and mimeType = 'application/vnd.google-apps.folder'`;
            } else if (type === 'file') {
                query += ` and mimeType != 'application/vnd.google-apps.folder'`;
            }

            const response = await this.drive.files.list({
                q: query,
                fields: 'files(id, name, mimeType, size)',
                pageSize: 1,
            });

            if (response.data.files.length > 0) {
                return this.toItemMetadata(response.data.files[0]);
            }

            return null;
        } catch (error) {
            throw new Error(`Failed to check if item exists: ${error.message}`);
        }
    }

    /**
     * Copy a file using native Google Drive API
     */
    async copyFileNative(fileId, name, destinationFolderId) {
        try {
            const response = await this.drive.files.copy({
                fileId: fileId,
                requestBody: {
                    name: name,
                    parents: [destinationFolderId],
                },
                fields: 'id, name, mimeType, size',
            });

            return this.toItemMetadata(response.data);
        } catch (error) {
            throw new Error(`Failed to copy file "${name}": ${error.message}`);
        }
    }

    /**
     * Google Drive supports native copy
     */
    supportsNativeCopy() {
        return true;
    }

    /**
     * Convert Google Drive file object to ItemMetadata
     */
    toItemMetadata(file) {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

        return {
            id: file.id,
            name: file.name,
            type: isFolder ? 'folder' : 'file',
            size: file.size ? parseInt(file.size, 10) : undefined,
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
        };
    }

    /**
     * Get provider display name
     */
    getProviderName() {
        return 'Google Drive';
    }
}

module.exports = GoogleDriveProvider;
