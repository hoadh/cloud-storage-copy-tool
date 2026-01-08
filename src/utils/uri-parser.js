/**
 * URI Parser for cloud storage provider URIs
 * 
 * Supported URI formats:
 * - gdrive://FOLDER_ID
 * - gdrive://https://drive.google.com/drive/folders/FOLDER_ID
 * - onedrive:///path/to/folder
 * - onedrive://root
 * - dropbox:///path/to/folder
 */
class UriParser {
    /**
     * Parse a provider URI into components
     * @param {string} uri - URI to parse
     * @returns {{scheme: string, path: string, originalUri: string}}
     */
    static parse(uri) {
        if (!uri || typeof uri !== 'string') {
            throw new Error('URI must be a non-empty string');
        }

        // Check for scheme separator
        if (!uri.includes('://')) {
            throw new Error(`Invalid URI format: ${uri}. Expected format: provider://path`);
        }

        const [scheme, ...pathParts] = uri.split('://');
        const pathSection = pathParts.join('://'); // Rejoin in case of nested ://

        // Validate scheme
        const validSchemes = ['gdrive', 'onedrive', 'dropbox'];
        if (!validSchemes.includes(scheme.toLowerCase())) {
            throw new Error(`Unknown provider: ${scheme}. Supported: ${validSchemes.join(', ')}`);
        }

        // Parse path based on scheme
        let path;
        switch (scheme.toLowerCase()) {
            case 'gdrive':
                path = this.parseGoogleDrivePath(pathSection);
                break;
            case 'onedrive':
                path = this.parseOneDrivePath(pathSection);
                break;
            case 'dropbox':
                path = this.parseDropboxPath(pathSection);
                break;
            default:
                path = pathSection;
        }

        return {
            scheme: scheme.toLowerCase(),
            path: path,
            originalUri: uri,
        };
    }

    /**
     * Parse Google Drive path/ID
     * Handles both folder IDs and full URLs
     */
    static parseGoogleDrivePath(pathSection) {
        // Check if it's a full Google Drive URL
        if (pathSection.startsWith('https://drive.google.com/')) {
            const match = pathSection.match(/\/folders\/([^/?#]+)/);
            if (match) {
                return match[1]; // Return folder ID
            }
            throw new Error('Could not extract folder ID from Google Drive URL');
        }

        // Remove any query parameters or fragments
        const cleanPath = pathSection.split(/[?#]/)[0];

        if (!cleanPath) {
            throw new Error('Google Drive folder ID cannot be empty');
        }

        return cleanPath;
    }

    /**
     * Parse OneDrive path
     * Supports: ///path/to/folder or //root
     */
    static parseOneDrivePath(pathSection) {
        // OneDrive uses paths, not IDs
        if (pathSection === 'root' || pathSection === '/root') {
            return 'root';
        }

        // Remove leading slashes to normalize path
        const normalizedPath = pathSection.replace(/^\/+/, '');

        if (!normalizedPath) {
            return 'root'; // Empty path defaults to root
        }

        return '/' + normalizedPath; // Ensure leading slash
    }

    /**
     * Parse Dropbox path
     * Format: ///path/to/folder (triple slash, then path)
     */
    static parseDropboxPath(pathSection) {
        // Remove leading slashes to normalize path
        const normalizedPath = pathSection.replace(/^\/+/, '');

        if (!normalizedPath) {
            return ''; // Empty path is root in Dropbox
        }

        return '/' + normalizedPath; // Ensure leading slash
    }

    /**
     * Validate URI format
     * @param {string} uri - URI to validate
     * @returns {boolean}
     */
    static isValid(uri) {
        try {
            this.parse(uri);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get provider from URI without full parsing
     * @param {string} uri - URI to extract provider from
     * @returns {string}
     */
    static getProvider(uri) {
        if (!uri || !uri.includes('://')) {
            throw new Error('Invalid URI format');
        }
        return uri.split('://')[0].toLowerCase();
    }
}

module.exports = UriParser;
