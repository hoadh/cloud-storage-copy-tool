/**
 * @typedef {Object} ItemMetadata
 * @property {string} id - Provider-specific item ID
 * @property {string} name - Item name
 * @property {string} type - 'file' or 'folder'
 * @property {number} [size] - File size in bytes (files only)
 * @property {string} [mimeType] - MIME type (files only)
 * @property {Date} [modifiedTime] - Last modified timestamp
 */

/**
 * Abstract base class for cloud storage providers
 * All providers must implement this interface
 */
class BaseProvider {
  /**
   * Provider identifier
   * @type {string}
   */
  static PROVIDER_ID = 'base';

  /**
   * Initialize the provider with configuration
   * @param {Object} config - Provider-specific configuration
   */
  constructor(config = {}) {
    this.config = config;
    this.client = null;
    this.authenticated = false;
  }

  // ==================== Authentication ====================

  /**
   * Authenticate with the provider
   * @returns {Promise<void>}
   */
  async authenticate() {
    throw new Error('authenticate() must be implemented by subclass');
  }

  /**
   * Check if currently authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.authenticated;
  }

  // ==================== Read Operations ====================

  /**
   * Get metadata for a single item
   * @param {string} itemId - Item identifier
   * @returns {Promise<ItemMetadata>}
   */
  async getItemMetadata(itemId) {
    throw new Error('getItemMetadata() must be implemented by subclass');
  }

  /**
   * List contents of a folder
   * @param {string} folderId - Folder identifier
   * @returns {Promise<ItemMetadata[]>}
   */
  async listFolderContents(folderId) {
    throw new Error('listFolderContents() must be implemented by subclass');
  }

  /**
   * Download a file as a readable stream
   * @param {string} fileId - File identifier
   * @returns {Promise<ReadableStream>}
   */
  async downloadFileStream(fileId) {
    throw new Error('downloadFileStream() must be implemented by subclass');
  }

  // ==================== Write Operations ====================

  /**
   * Create a new folder
   * @param {string} name - Folder name
   * @param {string} parentId - Parent folder identifier
   * @returns {Promise<ItemMetadata>}
   */
  async createFolder(name, parentId) {
    throw new Error('createFolder() must be implemented by subclass');
  }

  /**
   * Upload a file from a readable stream
   * @param {string} name - File name
   * @param {string} parentId - Parent folder identifier
   * @param {ReadableStream} stream - File content stream
   * @param {number} size - File size in bytes
   * @returns {Promise<ItemMetadata>}
   */
  async uploadFileStream(name, parentId, stream, size) {
    throw new Error('uploadFileStream() must be implemented by subclass');
  }

  // ==================== Check Operations ====================

  /**
   * Check if an item exists in a folder
   * @param {string} name - Item name to check
   * @param {string} parentId - Parent folder identifier
   * @param {'file'|'folder'|null} [type] - Optional type filter
   * @returns {Promise<ItemMetadata|null>}
   */
  async itemExists(name, parentId, type = null) {
    throw new Error('itemExists() must be implemented by subclass');
  }

  // ==================== Optimized Operations ====================

  /**
   * Copy a file within the same provider using native API
   * Default implementation: download + re-upload
   * @param {string} fileId - Source file identifier
   * @param {string} name - Name for the copy
   * @param {string} destinationFolderId - Destination folder identifier
   * @returns {Promise<ItemMetadata>}
   */
  async copyFileNative(fileId, name, destinationFolderId) {
    // Default: stream-based copy (can be overridden for native copy)
    const stream = await this.downloadFileStream(fileId);
    const metadata = await this.getItemMetadata(fileId);
    return this.uploadFileStream(name, destinationFolderId, stream, metadata.size);
  }

  /**
   * Check if this provider supports native copy
   * @returns {boolean}
   */
  supportsNativeCopy() {
    return false;
  }

  /**
   * Get provider display name
   * @returns {string}
   */
  getProviderName() {
    return this.constructor.PROVIDER_ID;
  }
}

module.exports = BaseProvider;
