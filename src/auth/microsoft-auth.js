const msal = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

/**
 * Microsoft OAuth 2.0 authentication handler for OneDrive
 * Uses MSAL (Microsoft Authentication Library)
 */
class MicrosoftAuth {
    constructor(options = {}) {
        this.credentialsPath = options.credentialsPath ||
            path.join(process.cwd(), 'config/credentials/microsoft-credentials.json');
        this.tokenPath = options.tokenPath ||
            path.join(process.cwd(), 'config/tokens/microsoft-token.json');

        this.scopes = options.scopes || [
            'Files.ReadWrite.All',
            'offline_access',
        ];

        this.msalClient = null;
        this.tokenCache = null;
    }

    /**
     * Authenticate and return access token
     * @returns {Promise<string>}
     */
    async authenticate() {
        // Load credentials
        if (!fs.existsSync(this.credentialsPath)) {
            throw new Error(
                `Credentials file not found at: ${this.credentialsPath}\n` +
                'Please register an app in Azure Portal and download credentials.\n' +
                'See ONEDRIVE-SETUP.md for instructions.'
            );
        }

        const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));

        // Initialize MSAL client
        const msalConfig = {
            auth: {
                clientId: credentials.clientId,
                authority: `https://login.microsoftonline.com/${credentials.tenantId || 'common'}`,
                clientSecret: credentials.clientSecret,
            },
            system: {
                loggerOptions: {
                    loggerCallback: (level, message, containsPii) => {
                        if (!containsPii) {
                            // console.log(message);
                        }
                    },
                    piiLoggingEnabled: false,
                    logLevel: msal.LogLevel.Warning,
                },
            },
        };

        this.msalClient = new msal.ConfidentialClientApplication(msalConfig);

        // Check for existing token
        if (fs.existsSync(this.tokenPath)) {
            const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));

            // Check if token is still valid
            if (tokenData.expiresOn && new Date(tokenData.expiresOn) > new Date()) {
                return tokenData.accessToken;
            }

            // Try to refresh using refresh token
            if (tokenData.refreshToken) {
                try {
                    const refreshedToken = await this.refreshToken(tokenData.refreshToken);
                    return refreshedToken;
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
        console.log('Opening browser for Microsoft OneDrive authorization...');

        const authCodeUrlParameters = {
            scopes: this.scopes,
            redirectUri: 'http://localhost:3001/callback/microsoft',
        };

        const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);

        console.log('If browser does not open, visit this URL manually:\n');
        console.log(authUrl + '\n');

        // Open browser
        const open = (await import('open')).default;
        open(authUrl);

        // Start local server to receive callback
        const code = await this.waitForAuthCode();

        // Exchange code for tokens
        const tokenRequest = {
            code: code,
            scopes: this.scopes,
            redirectUri: 'http://localhost:3001/callback/microsoft',
        };

        const response = await this.msalClient.acquireTokenByCode(tokenRequest);

        // Save token for future use
        this.saveToken(response);
        console.log('Microsoft OneDrive authorization successful!\n');

        return response.accessToken;
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        const refreshTokenRequest = {
            refreshToken: refreshToken,
            scopes: this.scopes,
        };

        const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest);
        this.saveToken(response);

        return response.accessToken;
    }

    /**
     * Start local server and wait for OAuth callback
     * @returns {Promise<string>} Authorization code
     */
    waitForAuthCode() {
        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const parsedUrl = new url.URL(req.url, 'http://localhost:3001');

                // Check if this is the Microsoft callback
                if (parsedUrl.pathname === '/callback/microsoft') {
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
    saveToken(tokenResponse) {
        // Ensure directory exists
        const tokenDir = path.dirname(this.tokenPath);
        if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
        }

        const tokenData = {
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresOn: tokenResponse.expiresOn,
            account: tokenResponse.account,
            scopes: tokenResponse.scopes,
        };

        fs.writeFileSync(this.tokenPath, JSON.stringify(tokenData, null, 2));
    }

    /**
     * Get current access token
     */
    async getAccessToken() {
        return await this.authenticate();
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return fs.existsSync(this.tokenPath);
    }
}

module.exports = MicrosoftAuth;
