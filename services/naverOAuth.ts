import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Naver OAuth Configuration
 */
const NAVER_CLIENT_ID = '44PTd3BMDQvsMLU_oLVy';
const NAVER_CLIENT_SECRET = '4mMuTwBFw1';
const NAVER_REDIRECT_URI = 'toiletsharenaver://oauth';

/**
 * Naver OAuth Service using Safari View Controller
 * Complies with App Store Guideline 4.0 - keeps login within the app
 */
export class NaverOAuthService {
    private static urlListener: any = null;
    private static loginPromise: { resolve: Function; reject: Function } | null = null;

    /**
     * Start Naver OAuth login flow
     * Opens Safari View Controller (in-app browser) for authentication
     */
    static async login(): Promise<{ email: string; gender?: 'MALE' | 'FEMALE'; name?: string }> {
        return new Promise(async (resolve, reject) => {
            try {
                // Store promise resolvers
                this.loginPromise = { resolve, reject };

                // Set up URL listener for OAuth callback
                this.setupURLListener();

                // Generate random state for CSRF protection
                const state = Math.random().toString(36).substring(7);

                // Build OAuth authorization URL
                const authUrl = `https://nid.naver.com/oauth2.0/authorize?` +
                    `response_type=code` +
                    `&client_id=${NAVER_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}` +
                    `&state=${state}`;

                console.log('[NaverOAuth] Opening Safari View Controller:', authUrl);

                // Open Safari View Controller (in-app browser)
                await Browser.open({
                    url: authUrl,
                    presentationStyle: 'popover',  // iOS: in-app browser
                    toolbarColor: '#03C75A',  // Naver brand color
                });

            } catch (error) {
                console.error('[NaverOAuth] Login error:', error);
                this.cleanup();
                reject(error);
            }
        });
    }

    /**
     * Set up listener for OAuth callback URL
     */
    private static setupURLListener() {
        if (this.urlListener) {
            this.urlListener.remove();
        }

        this.urlListener = App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
            console.log('[NaverOAuth] Received URL:', event.url);

            if (event.url.startsWith(NAVER_REDIRECT_URI)) {
                await this.handleCallback(event.url);
            }
        });
    }

    /**
     * Handle OAuth callback URL
     */
    private static async handleCallback(url: string) {
        try {
            // Close Safari View Controller
            await Browser.close();

            // Extract authorization code from URL
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            const error = urlObj.searchParams.get('error');

            if (error) {
                throw new Error(`Naver OAuth error: ${error}`);
            }

            if (!code) {
                throw new Error('No authorization code received');
            }

            console.log('[NaverOAuth] Authorization code received');

            // Exchange code for access token
            const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=authorization_code` +
                    `&client_id=${NAVER_CLIENT_ID}` +
                    `&client_secret=${NAVER_CLIENT_SECRET}` +
                    `&code=${code}` +
                    `&state=${state}`
            });

            if (!tokenResponse.ok) {
                throw new Error('Token exchange failed');
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            console.log('[NaverOAuth] Access token received');

            // Get user information
            const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to get user info');
            }

            const userData = await userResponse.json();
            console.log('[NaverOAuth] User data received:', userData);

            if (userData.resultcode !== '00') {
                throw new Error('Failed to get user info: ' + userData.message);
            }

            const email = userData.response?.email;
            const name = userData.response?.name;
            const genderRaw = userData.response?.gender; // 'M' | 'F'

            if (!email) {
                throw new Error('Email not provided. Please agree to share email.');
            }

            let gender: 'MALE' | 'FEMALE' | undefined;
            if (genderRaw === 'F') {
                gender = 'FEMALE';
            } else if (genderRaw === 'M') {
                gender = 'MALE';
            }

            // Resolve original promise
            if (this.loginPromise) {
                this.loginPromise.resolve({ email, gender, name });
                this.cleanup();
            }

        } catch (error) {
            console.error('[NaverOAuth] Callback error:', error);
            if (this.loginPromise) {
                this.loginPromise.reject(error);
                this.cleanup();
            }
        }
    }

    /**
     * Clean up listeners and promises
     */
    private static cleanup() {
        if (this.urlListener) {
            this.urlListener.remove();
            this.urlListener = null;
        }
        this.loginPromise = null;
    }

    /**
     * Cancel ongoing login
     */
    static async cancel() {
        await Browser.close();
        if (this.loginPromise) {
            this.loginPromise.reject(new Error('Login cancelled by user'));
            this.cleanup();
        }
    }
}
