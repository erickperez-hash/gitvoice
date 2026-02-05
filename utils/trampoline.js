// Trampoline - Git credential helper and authentication management
// Handles Git authentication via environment variables and credential storage
// Uses Electron's safeStorage for encrypted credential storage

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Lazy-load electron to avoid initialization issues
let _safeStorage = null;
function getSafeStorage() {
  if (!_safeStorage) {
    const { safeStorage } = require('electron');
    _safeStorage = safeStorage;
  }
  return _safeStorage;
}

class Trampoline {
  constructor() {
    this.credentials = {
      github: null,
      gitlab: null,
      bitbucket: null
    };
    this.credentialFile = path.join(process.env.HOME || process.env.USERPROFILE, '.gitvoice', 'credentials.enc');
    this.metadataFile = path.join(process.env.HOME || process.env.USERPROFILE, '.gitvoice', 'credentials.meta.json');
    this.loadCredentials();
  }

  // Check if encryption is available
  isEncryptionAvailable() {
    return getSafeStorage().isEncryptionAvailable();
  }

  // Encrypt sensitive data
  encryptToken(token) {
    if (this.isEncryptionAvailable()) {
      return getSafeStorage().encryptString(token);
    }
    // Fallback: use base64 encoding (less secure but better than plaintext)
    console.warn('[Security] safeStorage not available, using fallback encoding');
    return Buffer.from(token, 'utf8');
  }

  // Decrypt sensitive data
  decryptToken(encryptedBuffer) {
    if (this.isEncryptionAvailable()) {
      return getSafeStorage().decryptString(encryptedBuffer);
    }
    // Fallback: decode base64
    return encryptedBuffer.toString('utf8');
  }

  // Load saved credentials from disk
  loadCredentials() {
    try {
      const dir = path.dirname(this.credentialFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }

      // Load metadata (non-sensitive info like username, savedAt)
      if (fs.existsSync(this.metadataFile)) {
        const metaData = fs.readFileSync(this.metadataFile, 'utf8');
        const metadata = JSON.parse(metaData);

        // Load encrypted tokens
        if (fs.existsSync(this.credentialFile)) {
          const encryptedData = fs.readFileSync(this.credentialFile);

          // Parse the encrypted data structure
          try {
            const tokenData = JSON.parse(encryptedData.toString('utf8'));

            for (const [service, meta] of Object.entries(metadata)) {
              if (tokenData[service]) {
                const encryptedToken = Buffer.from(tokenData[service], 'base64');
                const decryptedToken = this.decryptToken(encryptedToken);

                this.credentials[service] = {
                  token: decryptedToken,
                  username: meta.username || '',
                  email: meta.email || '',
                  savedAt: meta.savedAt
                };
              }
            }
          } catch (e) {
            console.error('Failed to decrypt credentials:', e.message);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  }

  // Save credentials to disk (encrypted)
  saveCredentials() {
    try {
      const dir = path.dirname(this.credentialFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }

      // Separate sensitive (tokens) from non-sensitive (metadata)
      const metadata = {};
      const encryptedTokens = {};

      for (const [service, cred] of Object.entries(this.credentials)) {
        if (cred && cred.token) {
          // Encrypt the token
          const encrypted = this.encryptToken(cred.token);
          encryptedTokens[service] = encrypted.toString('base64');

          // Store metadata separately (not encrypted)
          metadata[service] = {
            username: cred.username || '',
            email: cred.email || '',
            savedAt: cred.savedAt
          };
        }
      }

      // Write encrypted tokens
      fs.writeFileSync(
        this.credentialFile,
        JSON.stringify(encryptedTokens),
        { mode: 0o600 }
      );

      // Write metadata
      fs.writeFileSync(
        this.metadataFile,
        JSON.stringify(metadata, null, 2),
        { mode: 0o600 }
      );

    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  // Set credential for a service
  setCredential(service, credential) {
    if (!['github', 'gitlab', 'bitbucket', 'custom'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    this.credentials[service] = {
      token: credential.token,
      username: credential.username || '',
      email: credential.email || '',
      savedAt: new Date().toISOString()
    };

    this.saveCredentials();
    return true;
  }

  // Get credential for a service
  getCredential(service) {
    return this.credentials[service] || null;
  }

  // Remove credential
  removeCredential(service) {
    if (this.credentials[service]) {
      this.credentials[service] = null;
      this.saveCredentials();
      return true;
    }
    return false;
  }

  // Check if credentials are configured
  hasCredentials(service) {
    return !!(this.credentials[service]?.token);
  }

  // Get all configured services
  getConfiguredServices() {
    return Object.entries(this.credentials)
      .filter(([_, cred]) => cred?.token)
      .map(([service, cred]) => ({
        service,
        username: cred.username,
        savedAt: cred.savedAt
      }));
  }

  // Create environment variables for Git authentication
  // Uses GIT_ASKPASS with environment variable instead of temp file
  getGitEnv(remoteUrl) {
    const env = { ...process.env };

    // Detect service from URL
    const service = this.detectService(remoteUrl);
    const cred = this.credentials[service];

    if (cred?.token) {
      // Use credential helper via environment variable approach
      // This avoids writing tokens to temp files
      env.GIT_ASKPASS = this.getAskPassHelper();
      env.GITVOICE_TOKEN = cred.token;
      env.GIT_TERMINAL_PROMPT = '0';

      // For GitHub, also set the token env var
      if (service === 'github') {
        env.GITHUB_TOKEN = cred.token;
        env.GH_TOKEN = cred.token;
      }
    }

    return env;
  }

  // Get path to the askpass helper script (created once, reads from env)
  getAskPassHelper() {
    const os = require('os');
    const scriptDir = path.join(os.tmpdir(), 'gitvoice');
    const isWindows = process.platform === 'win32';
    const scriptPath = path.join(scriptDir, isWindows ? 'askpass.bat' : 'askpass');

    // Create helper script if it doesn't exist
    if (!fs.existsSync(scriptPath)) {
      if (!fs.existsSync(scriptDir)) {
        fs.mkdirSync(scriptDir, { recursive: true, mode: 0o700 });
      }

      if (isWindows) {
        // Windows batch script - reads token from environment
        const script = `@echo off
echo %GITVOICE_TOKEN%`;
        fs.writeFileSync(scriptPath, script, { mode: 0o700 });
      } else {
        // Unix shell script - reads token from environment
        const script = `#!/bin/sh
echo "$GITVOICE_TOKEN"`;
        fs.writeFileSync(scriptPath, script, { mode: 0o700 });
      }
    }

    return scriptPath;
  }

  // Detect which service a remote URL belongs to
  detectService(url) {
    if (!url) return 'custom';

    const lowercaseUrl = url.toLowerCase();
    if (lowercaseUrl.includes('github.com')) return 'github';
    if (lowercaseUrl.includes('gitlab.com')) return 'gitlab';
    if (lowercaseUrl.includes('bitbucket.org')) return 'bitbucket';
    return 'custom';
  }

  // Modify URL to include credentials (for HTTPS)
  getAuthenticatedUrl(url) {
    if (!url || url.startsWith('git@')) {
      // SSH URL, don't modify
      return url;
    }

    const service = this.detectService(url);
    const cred = this.credentials[service];

    if (!cred?.token) {
      return url;
    }

    try {
      const parsed = new URL(url);
      const username = cred.username || 'oauth2';
      parsed.username = username;
      parsed.password = cred.token;
      return parsed.toString();
    } catch (error) {
      return url;
    }
  }

  // Validate a token by making a test API call
  async validateToken(service, token) {
    const axios = require('axios').default || require('axios');

    try {
      switch (service) {
        case 'github':
          const response = await axios.get('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json'
            }
          });
          return {
            valid: true,
            username: response.data.login,
            email: response.data.email,
            name: response.data.name
          };

        case 'gitlab':
          const glResponse = await axios.get('https://gitlab.com/api/v4/user', {
            headers: { 'PRIVATE-TOKEN': token }
          });
          return {
            valid: true,
            username: glResponse.data.username,
            email: glResponse.data.email,
            name: glResponse.data.name
          };

        case 'bitbucket':
          const bbResponse = await axios.get('https://api.bitbucket.org/2.0/user', {
            headers: { Authorization: `Bearer ${token}` }
          });
          return {
            valid: true,
            username: bbResponse.data.username,
            name: bbResponse.data.display_name
          };

        default:
          return { valid: true, username: 'unknown' };
      }
    } catch (error) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Invalid token' : error.message
      };
    }
  }

  // Validate username/password by testing with a simple Git command
  async validateUsernamePassword(service, username, password) {
    const GitProcess = require('dugite');
    const os = require('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-auth-test-'));

    try {
      // Use environment variable approach for testing
      const env = {
        ...process.env,
        GIT_ASKPASS: this.getAskPassHelper(),
        GITVOICE_TOKEN: password,
        GIT_TERMINAL_PROMPT: '0'
      };

      // Test with ls-remote on a common public repo
      let testUrl;
      switch (service) {
        case 'github': testUrl = `https://github.com/${username}/non-existent-repo-for-auth-test.git`; break;
        case 'gitlab': testUrl = `https://gitlab.com/${username}/non-existent-repo-for-auth-test.git`; break;
        case 'bitbucket': testUrl = `https://bitbucket.org/${username}/non-existent-repo-for-auth-test.git`; break;
        default: testUrl = 'https://github.com/github/test-repo.git';
      }

      const result = await GitProcess.exec(['ls-remote', testUrl], tempDir, { env });

      const output = (result.stdout + result.stderr).toLowerCase();

      if (output.includes('authentication failed')) {
        return { valid: false, error: 'Authentication failed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) { }
    }
  }

  // Configure Git globally with user info
  async configureGitUser(name, email) {
    const GitProcess = require('dugite');

    try {
      await GitProcess.exec(['config', '--global', 'user.name', name], process.cwd());
      await GitProcess.exec(['config', '--global', 'user.email', email], process.cwd());
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get current Git user config
  async getGitUser() {
    const GitProcess = require('dugite');

    try {
      const nameResult = await GitProcess.exec(['config', '--global', 'user.name'], process.cwd());
      const emailResult = await GitProcess.exec(['config', '--global', 'user.email'], process.cwd());

      return {
        name: nameResult.stdout.trim(),
        email: emailResult.stdout.trim()
      };
    } catch (error) {
      return { name: '', email: '' };
    }
  }

  // Check SSH key availability
  async checkSSHKey() {
    const sshDir = path.join(process.env.HOME || process.env.USERPROFILE, '.ssh');
    const keyFiles = ['id_rsa', 'id_ed25519', 'id_ecdsa'];

    const keys = [];
    for (const keyFile of keyFiles) {
      const pubKeyPath = path.join(sshDir, `${keyFile}.pub`);
      if (fs.existsSync(pubKeyPath)) {
        try {
          const pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
          keys.push({
            type: keyFile.replace('id_', '').toUpperCase(),
            file: pubKeyPath,
            fingerprint: this.getKeyFingerprint(pubKey)
          });
        } catch (error) {
          // Skip unreadable keys
        }
      }
    }

    return keys;
  }

  // Get SSH key fingerprint
  getKeyFingerprint(pubKey) {
    const parts = pubKey.split(' ');
    if (parts.length >= 2) {
      const keyData = Buffer.from(parts[1], 'base64');
      const hash = crypto.createHash('sha256').update(keyData).digest('base64');
      return `SHA256:${hash.replace(/=+$/, '')}`;
    }
    return 'unknown';
  }

  // Test Git connection to remote
  async testConnection(remoteUrl) {
    const GitProcess = require('dugite');

    try {
      const env = this.getGitEnv(remoteUrl);
      const result = await GitProcess.exec(
        ['ls-remote', '--heads', remoteUrl],
        process.cwd(),
        { env }
      );

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = Trampoline;
