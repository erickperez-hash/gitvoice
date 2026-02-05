const axios = require('axios');

class GitHubAuthService {
    constructor() {
        this.clientId = ''; // Will be set from UI
        this.deviceCodeUrl = 'https://github.com/login/device/code';
        this.tokenUrl = 'https://github.com/login/oauth/access_token';
    }

    setClientId(clientId) {
        this.clientId = clientId;
    }

    async initiateDeviceFlow() {
        if (!this.clientId) {
            throw new Error('Client ID is required');
        }

        try {
            const response = await axios.post(this.deviceCodeUrl, {
                client_id: this.clientId,
                scope: 'repo read:org gist user'
            }, {
                headers: { 'Accept': 'application/json' }
            });

            if (response.data.error) {
                throw new Error(response.data.error_description || response.data.error);
            }

            return {
                deviceCode: response.data.device_code,
                userCode: response.data.user_code,
                verificationUri: response.data.verification_uri,
                expiresIn: response.data.expires_in,
                interval: response.data.interval
            };
        } catch (error) {
            console.error('GitHub Device Flow Init Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async pollForToken(deviceCode, interval) {
        if (!this.clientId) throw new Error('Client ID is required');

        const pollInterval = (interval || 5) * 1000;

        // We'll wrap this in a promise that resolves when token is found or rejects on timeout/error
        // In a real app, we might want a way to cancel this via a flag

        return new Promise((resolve, reject) => {
            const checkToken = async () => {
                try {
                    const response = await axios.post(this.tokenUrl, {
                        client_id: this.clientId,
                        device_code: deviceCode,
                        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                    }, {
                        headers: { 'Accept': 'application/json' }
                    });

                    const data = response.data;

                    if (data.access_token) {
                        resolve(data.access_token);
                        return;
                    }

                    if (data.error) {
                        if (data.error === 'authorization_pending') {
                            // Continue polling
                            setTimeout(checkToken, pollInterval + 500); // Add 500ms jitter
                        } else if (data.error === 'slow_down') {
                            // Add extra delay
                            setTimeout(checkToken, pollInterval + 5000);
                        } else if (data.error === 'expired_token') {
                            reject(new Error('Device code expired'));
                        } else {
                            reject(new Error(data.error_description || data.error));
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            };

            // Start polling
            setTimeout(checkToken, pollInterval);
        });
    }
}

module.exports = new GitHubAuthService();
