const UriParser = require('../utils/uri-parser');
const GoogleDriveProvider = require('./google-drive-provider');

/**
 * Factory for creating provider instances
 */
class ProviderFactory {
    /**
     * Registry of available providers
     */
    static providers = {
        'gdrive': GoogleDriveProvider,
        // 'onedrive': OneDriveProvider,  // TODO: Phase 2
        // 'dropbox': DropboxProvider,    // TODO: Phase 3
    };

    /**
     * Create a provider instance from a URI
     * @param {string} uri - Provider URI (e.g., 'gdrive://folder-id')
     * @param {Object} options - Provider-specific options
     * @returns {Promise<{provider: BaseProvider, itemId: string}>}
     */
    static async fromUri(uri, options = {}) {
        const { scheme, path } = UriParser.parse(uri);

        const ProviderClass = this.providers[scheme];
        if (!ProviderClass) {
            throw new Error(
                `Provider not available: ${scheme}\n` +
                `Available providers: ${Object.keys(this.providers).join(', ')}`
            );
        }

        const provider = new ProviderClass(options);
        await provider.authenticate();

        return {
            provider,
            itemId: path,
        };
    }

    /**
     * Register a new provider
     * @param {string} scheme - Provider scheme (e.g., 'gdrive')
     * @param {Class} ProviderClass - Provider class
     */
    static registerProvider(scheme, ProviderClass) {
        this.providers[scheme] = ProviderClass;
    }

    /**
     * Get list of available providers
     * @returns {string[]}
     */
    static getAvailableProviders() {
        return Object.keys(this.providers);
    }
}

module.exports = ProviderFactory;
