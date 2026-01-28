import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Kakao OAuth Configuration
 */
const KAKAO_REST_API_KEY = '954f8caae336cb83506cad28e1de2e19';
const KAKAO_REDIRECT_URI = 'toiletsharekakao://oauth';

/**
 * Kakao OAuth Service using Safari View Controller
 * Complies with App Store Guideline 4.0 - keeps login within the app
 */
export class KakaoOAuthService {
    private static urlListener: any = null;
    private static loginPromise: { resolve: Function; reject: Function } | null = null;

    /**
     * Start Kakao OAuth login flow
     * Opens Safari View Controller (in-app browser) for authentication
     */
    static async login(): Promise<{ email: string; gender?: 'MALE' | 'FEMALE' }> {
        return new Promise(async (resolve, reject) => {
            try {
                // Store promise resolvers
                this.loginPromise = { resolve, reject };

                // Set up URL listener for OAuth callback
                this.setupURLListener();

                // Build OAuth authorization URL
                const authUrl = `https://kauth.kakao.com/oauth/authorize?` +
                    `client_id=${KAKAO_REST_API_KEY}` +
                    `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
                    `&response_type=code` +
                    `&scope=account_email,gender`;

                console.log('[KakaoOAuth] Opening Safari View Controller:', authUrl);

                // Open Safari View Controller (in-app browser)
                await Browser.open({
                    url: authUrl,
                    presentationStyle: 'popover',  // iOS: in-app browser
                    toolbarColor: '#FEE500',  // Kakao brand color
                });

            } catch (error) {
                console.error('[KakaoOAuth] Login error:', error);
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
            console.log('[KakaoOAuth] Received URL:', event.url);

            if (event.url.startsWith(KAKAO_REDIRECT_URI)) {
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
            const error = urlObj.searchParams.get('error');

            if (error) {
                throw new Error(`Kakao OAuth error: ${error}`);
            }

            if (!code) {
                throw new Error('No authorization code received');
            }

            console.log('[KakaoOAuth] Authorization code received');

            // Exchange code for access token
            const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=authorization_code` +
                    `&client_id=${KAKAO_REST_API_KEY}` +
                    `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
                    `&code=${code}`
            });

            if (!tokenResponse.ok) {
                throw new Error('Token exchange failed');
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            console.log('[KakaoOAuth] Access token received');

            // Get user information
            const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to get user info');
            }

            const userData = await userResponse.json();
            console.log('[KakaoOAuth] User data received:', userData);

            const email = userData.kakao_account?.email;
            const genderRaw = userData.kakao_account?.gender; // 'female' | 'male'

            if (!email) {
                throw new Error('Email not provided. Please agree to share email.');
            }

            let gender: 'MALE' | 'FEMALE' | undefined;
            if (genderRaw === 'female') {
                gender = 'FEMALE';
            } else if (genderRaw === 'male') {
                gender = 'MALE';
            }

            // Resolve original promise
            if (this.loginPromise) {
                this.loginPromise.resolve({ email, gender });
                this.cleanup();
            }

        } catch (error) {
            console.error('[KakaoOAuth] Callback error:', error);
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
