// CredentialsManager - Handles credential and authentication management

class CredentialsManager {
  constructor(services) {
    this.narrationService = services.narrationService;
    this.uiController = services.uiController;

    this.authPollInterval = null;
    this.currentVerificationUri = '';
  }

  async initialize() {
    const services = await window.electronAPI.getConfiguredServices();
    this.uiController.updateCredentialStatus(services);

    const gitUser = await window.electronAPI.getGitUser();
    if (gitUser.name) {
      document.getElementById('git-name').value = gitUser.name;
    }
    if (gitUser.email) {
      document.getElementById('git-email').value = gitUser.email;
    }

    if (services.length > 0) {
      const defaultService = services.find(s => s.service === 'github') || services[0];
      if (defaultService.username) {
        this.uiController.elements.gitUsername.value = defaultService.username;
      }
    }

    const sshKeys = await window.electronAPI.checkSSHKeys();
    this.uiController.displaySSHKeys(sshKeys);
  }

  async saveCredential() {
    const service = document.getElementById('git-service').value;
    const authType = this.uiController.elements.authType.value;
    const statusEl = document.getElementById('credential-status');

    const payload = { service, authType };

    if (authType === 'token') {
      const token = document.getElementById('git-token').value;
      if (!token) {
        statusEl.innerHTML = '<span class="error">Please enter a token</span>';
        return;
      }
      payload.token = token;
    } else {
      const username = this.uiController.elements.gitUsername.value.trim();
      const password = this.uiController.elements.gitPassword.value.trim();

      if (!username || !password) {
        statusEl.innerHTML = '<span class="error">Please enter both username and password</span>';
        return;
      }
      payload.username = username;
      payload.password = password;
    }

    statusEl.innerHTML = '<span class="loading">Validating credentials...</span>';

    try {
      const result = await window.electronAPI.saveCredential(payload);

      if (result.success) {
        statusEl.innerHTML = `<span class="success">Credentials saved! Connected as ${result.username}</span>`;

        if (authType === 'token') {
          document.getElementById('git-token').value = '';
        } else {
          this.uiController.elements.gitPassword.value = '';
        }

        const services = await window.electronAPI.getConfiguredServices();
        this.uiController.updateCredentialStatus(services);
      } else {
        statusEl.innerHTML = `<span class="error">Error: ${result.error}</span>`;
      }
    } catch (error) {
      statusEl.innerHTML = `<span class="error">Error: ${error.message}</span>`;
    }
  }

  async testCredential() {
    const statusEl = document.getElementById('credential-status');
    statusEl.innerHTML = '<span class="loading">Testing connection...</span>';

    try {
      let testUrl = null;
      const remoteResult = await window.electronAPI.getRemoteUrl();

      if (remoteResult.success && remoteResult.url) {
        testUrl = remoteResult.url;
      } else {
        testUrl = 'https://github.com/git/git.git';
        console.log('[Test] No repository selected, testing with default GitHub URL');
      }

      const testResult = await window.electronAPI.testConnection(testUrl);
      if (testResult.success) {
        statusEl.innerHTML = '<span class="success">Connection successful!</span>';
      } else {
        statusEl.innerHTML = `<span class="error">Connection failed: ${testResult.error}</span>`;
      }
    } catch (error) {
      statusEl.innerHTML = `<span class="error">Error: ${error.message}</span>`;
    }
  }

  async saveGitUser() {
    const name = document.getElementById('git-name').value;
    const email = document.getElementById('git-email').value;

    if (!name || !email) {
      alert('Please enter both name and email');
      return;
    }

    const result = await window.electronAPI.setGitUser({ name, email });
    if (result.success) {
      this.narrationService.speak('Git user configuration saved.');
    } else {
      alert('Error saving git user: ' + result.error);
    }
  }

  handleAuthTypeChange() {
    const type = this.uiController.elements.authType.value;
    if (type === 'token') {
      this.uiController.elements.tokenAuthFields.style.display = 'block';
      this.uiController.elements.passwordAuthFields.style.display = 'none';
    } else {
      this.uiController.elements.tokenAuthFields.style.display = 'none';
      this.uiController.elements.passwordAuthFields.style.display = 'block';
    }
  }

  async handleGitHubSignIn() {
    const customClientId = document.getElementById('github-client-id').value.trim();
    const effectiveClientId = customClientId || '178c6fc778ccc68e1d6a';

    const modal = document.getElementById('device-auth-modal');
    const userCodeEl = document.getElementById('device-user-code');
    const pollStatusEl = document.getElementById('auth-poll-status');

    modal.classList.remove('hidden');
    userCodeEl.textContent = 'Loading...';
    pollStatusEl.textContent = 'Requesting code from GitHub...';

    try {
      const result = await window.electronAPI.githubAuthStart(effectiveClientId);

      if (result.error) {
        alert('Error initializing GitHub Login: ' + result.error);
        modal.classList.add('hidden');
        return;
      }

      userCodeEl.textContent = result.userCode;
      this.currentVerificationUri = result.verificationUri;
      pollStatusEl.textContent = 'Waiting for you to authorize...';

      this._pollForGitHubToken(result.deviceCode, result.interval);

    } catch (error) {
      console.error('Auth Error:', error);
      alert('Failed to start authentication');
      modal.classList.add('hidden');
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('device-auth-modal');
    modal.classList.add('hidden');
    if (this.authPollInterval) {
      clearInterval(this.authPollInterval);
      this.authPollInterval = null;
    }
  }

  copyUserCode() {
    const code = document.getElementById('device-user-code').textContent;
    navigator.clipboard.writeText(code);
    const btn = document.getElementById('auth-copy-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="icon">&#10004;</span> Copied!';
    setTimeout(() => btn.innerHTML = originalText, 2000);
  }

  openGitHubLogin() {
    if (this.currentVerificationUri) {
      window.electronAPI.openExternal(this.currentVerificationUri);
    }
  }

  async _pollForGitHubToken(deviceCode, interval) {
    if (this.authPollInterval) clearInterval(this.authPollInterval);

    const pollStatusEl = document.getElementById('auth-poll-status');
    const credentialStatusEl = document.getElementById('credential-status');

    pollStatusEl.textContent = 'Waiting for authorization in browser...';

    try {
      const result = await window.electronAPI.githubAuthPoll({ deviceCode, interval });

      if (result.success) {
        pollStatusEl.textContent = 'Success! Saving credentials...';

        const service = document.getElementById('git-service').value;
        const saveResult = await window.electronAPI.saveCredential({
          service,
          authType: 'token',
          token: result.token
        });

        if (saveResult.success) {
          pollStatusEl.textContent = 'Credentials saved!';
          credentialStatusEl.innerHTML = `<span class="success">Connected as ${saveResult.username || 'GitHub User'}</span>`;

          const services = await window.electronAPI.getConfiguredServices();
          this.uiController.updateCredentialStatus(services);

          setTimeout(() => {
            this.closeAuthModal();
          }, 1000);
        } else {
          pollStatusEl.textContent = 'Failed to save credentials: ' + saveResult.error;
        }

      } else {
        pollStatusEl.textContent = 'Authentication failed: ' + result.error;
      }
    } catch (e) {
      pollStatusEl.textContent = 'Error: ' + e.message;
    }
  }

  bindCredentialEvents(elements) {
    document.getElementById('save-token')?.addEventListener('click', () => this.saveCredential());
    document.getElementById('test-token')?.addEventListener('click', () => this.testCredential());
    document.getElementById('save-git-user')?.addEventListener('click', () => this.saveGitUser());

    document.getElementById('token-help-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      const service = document.getElementById('git-service').value;
      const urls = {
        github: 'https://github.com/settings/tokens/new',
        gitlab: 'https://gitlab.com/-/profile/personal_access_tokens',
        bitbucket: 'https://bitbucket.org/account/settings/app-passwords/'
      };
      window.electronAPI.openExternal(urls[service] || urls.github);
    });

    elements.authType?.addEventListener('change', () => this.handleAuthTypeChange());

    document.getElementById('github-signin-btn')?.addEventListener('click', () => this.handleGitHubSignIn());
    document.getElementById('close-auth-modal')?.addEventListener('click', () => this.closeAuthModal());
    document.getElementById('auth-copy-btn')?.addEventListener('click', () => this.copyUserCode());
    document.getElementById('auth-open-browser-btn')?.addEventListener('click', () => this.openGitHubLogin());
  }
}

// Make available globally
window.CredentialsManager = CredentialsManager;
