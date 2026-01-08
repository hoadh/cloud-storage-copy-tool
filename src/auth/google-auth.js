const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

/**
 * Google OAuth 2.0 authentication handler
 */
class GoogleAuth {
    constructor(options = {}) {
        this.credentialsPath = options.credentialsPath ||
            path.join(process.cwd(), 'config/credentials/google-credentials.json');
        this.tokenPath = options.tokenPath ||
            path.join(process.cwd(), 'config/tokens/google-token.json');
        this.scopes = options.scopes || ['https://www.googleapis.com/auth/drive'];
        this.oauth2Client = null;

        // Fallback to legacy paths if new paths don't exist
        if (!fs.existsSync(this.credentialsPath)) {
            const legacyPath = path.join(process.cwd(), 'credentials.json');
            if (fs.existsSync(legacyPath)) {
                this.credentialsPath = legacyPath;
            }
        }

        if (!fs.existsSync(this.tokenPath)) {
            const legacyPath = path.join(process.cwd(), 'token.json');
            if (fs.existsSync(legacyPath)) {
                this.tokenPath = legacyPath;
            }
        }
    }

    /**
     * Authenticate and return OAuth2 client
     * @returns {Promise<OAuth2Client>}
     */
    async authenticate() {
        if (this.oauth2Client && this.oauth2Client.credentials) {
            return this.oauth2Client;
        }

        // Read credentials
        if (!fs.existsSync(this.credentialsPath)) {
            throw new Error(
                `Credentials file not found at: ${this.credentialsPath}\n` +
                'Please download OAuth 2.0 credentials from Google Cloud Console.'
            );
        }

        const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
        const { client_id, client_secret } = credentials.installed || credentials.web;

        this.oauth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            'http://localhost:3001/callback'
        );

        // Check for existing token
        if (fs.existsSync(this.tokenPath)) {
            const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
            this.oauth2Client.setCredentials(token);

            // Check if token is expired and refresh if needed
            if (token.expiry_date && token.expiry_date < Date.now()) {
                console.log('Token expired, refreshing...');
                const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
                this.oauth2Client.setCredentials(newCredentials);
                this.saveToken(newCredentials);
            }

            return this.oauth2Client;
        }

        // Perform new OAuth flow
        await this.performOAuthFlow();
        return this.oauth2Client;
    }

    /**
     * Perform OAuth 2.0 authorization flow
     */
    async performOAuthFlow() {
        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes,
        });

        console.log('Opening browser for Google Drive authorization...');
        console.log('If browser does not open, visit this URL manually:\n');
        console.log(authUrl + '\n');

        // Open browser
        const open = (await import('open')).default;
        open(authUrl);

        // Start local server to receive callback
        const code = await this.waitForAuthCode();

        // Exchange code for tokens
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);

        // Save token for future use
        this.saveToken(tokens);
        console.log('Google Drive authorization successful!\n');
    }

    /**
     * Start local server and wait for OAuth callback
     * @returns {Promise<string>} Authorization code
     */
    waitForAuthCode() {
        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const queryParams = new url.URL(req.url, 'http://localhost:3001').searchParams;
                const code = queryParams.get('code');

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>');
                    server.close();
                    resolve(code);
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h1>Authorization failed</h1></body></html>');
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
    saveToken(token) {
        // Ensure directory exists
        const tokenDir = path.dirname(this.tokenPath);
        if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
        }

        fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2));
    }

    /**
     * Get OAuth2 client
     */
    getClient() {
        return this.oauth2Client;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return this.oauth2Client && this.oauth2Client.credentials;
    }
}

module.exports = GoogleAuth;
