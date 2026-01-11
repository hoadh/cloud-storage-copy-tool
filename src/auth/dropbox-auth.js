const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

/**
 * Dropbox OAuth 2.0 authentication handler
 */
class DropboxAuth {
    constructor(options = {}) {
        this.credentialsPath = options.credentialsPath ||
            path.join(process.cwd(), 'config/credentials/dropbox-credentials.json');
        this.tokenPath = options.tokenPath ||
            path.join(process.cwd(), 'config/tokens/dropbox-token.json');

        this.credentials = null;
        this.dbx = null;
    }

    /**
     * Authenticate and return Dropbox client
     * @returns {Promise<Dropbox>}
     */
    async authenticate() {
        // Load credentials
        if (!fs.existsSync(this.credentialsPath)) {
            throw new Error(
                `Credentials file not found at: ${this.credentialsPath}\n` +
                'Please register an app in Dropbox Developer Console and download credentials.\n' +
                'See DROPBOX-SETUP.md for instructions.'
            );
        }

        this.credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));

        // Check for existing token
        if (fs.existsSync(this.tokenPath)) {
            const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));

            // Dropbox tokens don't expire (unless revoked)
            // But they can have refresh tokens for short-lived tokens
            if (tokenData.accessToken) {
                this.dbx = new Dropbox({
                    accessToken: tokenData.accessToken,
                    fetch: fetch,
                });

                // Verify token is still valid
                try {
                    await this.dbx.usersGetCurrentAccount();
                    return this.dbx;
                } catch (error) {
                    console.log('Token invalid, starting new auth flow...');
                }
            }

            // Try to refresh if we have a refresh token
            if (tokenData.refreshToken) {
                try {
                    const newToken = await this.refreshToken(tokenData.refreshToken);
                    return this.dbx;
                } catch (error) {
                    console.log('Token refresh failed, starting new auth flow...');
                }
            }
        }

        // Perform new OAuth flow
        return await this.performOAuthFlow();
    }

    /**
     * Perform OAuth 2.0 authorization flow
     */
    async performOAuthFlow() {
        console.log('Opening browser for Dropbox authorization...');

        const dbxAuth = new Dropbox({
            clientId: this.credentials.clientId,
            clientSecret: this.credentials.clientSecret,
            fetch: fetch,
        });

        const authUrl = await dbxAuth.auth.getAuthenticationUrl(
            'http://localhost:3001/callback/dropbox',
            null,
            'code',
            'offline', // Request offline access for refresh token
            null,
            'none',
            false
        );

        console.log('If browser does not open, visit this URL manually:\n');
        console.log(authUrl + '\n');

        // Open browser
        const open = (await import('open')).default;
        open(authUrl);

        // Start local server to receive callback
        const code = await this.waitForAuthCode();

        // Exchange code for tokens
        dbxAuth.auth.setCodeVerifier(null);
        const response = await dbxAuth.auth.getAccessTokenFromCode(
            'http://localhost:3001/callback/dropbox',
            code
        );

        const accessToken = response.result.access_token;
        const refreshToken = response.result.refresh_token;

        // Create authenticated client
        this.dbx = new Dropbox({
            accessToken: accessToken,
            refreshToken: refreshToken,
            clientId: this.credentials.clientId,
            clientSecret: this.credentials.clientSecret,
            fetch: fetch,
        });

        // Save token for future use
        this.saveToken({
            accessToken: accessToken,
            refreshToken: refreshToken,
        });

        console.log('Dropbox authorization successful!\n');
        return this.dbx;
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        const dbxAuth = new Dropbox({
            clientId: this.credentials.clientId,
            clientSecret: this.credentials.clientSecret,
            refreshToken: refreshToken,
            fetch: fetch,
        });

        await dbxAuth.auth.refreshAccessToken();

        const newAccessToken = dbxAuth.auth.getAccessToken();

        this.dbx = new Dropbox({
            accessToken: newAccessToken,
            refreshToken: refreshToken,
            clientId: this.credentials.clientId,
            clientSecret: this.credentials.clientSecret,
            fetch: fetch,
        });

        this.saveToken({
            accessToken: newAccessToken,
            refreshToken: refreshToken,
        });

        return this.dbx;
    }

    /**
     * Start local server and wait for OAuth callback
     * @returns {Promise<string>} Authorization code
     */
    waitForAuthCode() {
        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const parsedUrl = new url.URL(req.url, 'http://localhost:3001');

                // Check if this is the Dropbox callback
                if (parsedUrl.pathname === '/callback/dropbox') {
                    const code = parsedUrl.searchParams.get('code');

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>');
                        server.close();
                        resolve(code);
                    } else {
                        const error = parsedUrl.searchParams.get('error_description') || 'Authorization failed';
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end(`<html><body><h1>Authorization failed</h1><p>${error}</p></body></html>`);
                        reject(new Error(error));
                    }
                }
            });

            server.listen(3001, () => {
                console.log('Waiting for authorization...\n');
            });

            server.on('error', reject);
        });
    }

    /**
     * Save token to file
     */
    saveToken(tokenData) {
        // Ensure directory exists
        const tokenDir = path.dirname(this.tokenPath);
        if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
        }

        fs.writeFileSync(this.tokenPath, JSON.stringify(tokenData, null, 2));
    }

    /**
     * Get Dropbox client
     */
    getClient() {
        return this.dbx;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.dbx !== null;
    }
}

module.exports = DropboxAuth;
