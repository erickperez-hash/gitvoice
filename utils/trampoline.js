// Trampoline - Git credential helper and authentication management
// Handles Git authentication via environment variables and credential storage

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

class Trampoline {
  constructor() {
    this.credentials = {
      github: null,
      gitlab: null,
      bitbucket: null
    };
    this.credentialFile = path.join(process.env.HOME || process.env.USERPROFILE, '.gitvoice', 'credentials.json');
    this.loadCredentials();
  }

  // Load saved credentials from disk
  loadCredentials() {
    try {
      const dir = path.dirname(this.credentialFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.credentialFile)) {
        const data = fs.readFileSync(this.credentialFile, 'utf8');
        const saved = JSON.parse(data);
        this.credentials = { ...this.credentials, ...saved };
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  }

  // Save credentials to disk (encrypted in production)
  saveCredentials() {
    try {
      const dir = path.dirname(this.credentialFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // In production, this should use OS keychain
      fs.writeFileSync(this.credentialFile, JSON.stringify(this.credentials, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
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
      delete this.credentials[service];
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
  getGitEnv(remoteUrl) {
    const env = { ...process.env };

    // Detect service from URL
    const service = this.detectService(remoteUrl);
    const cred = this.credentials[service];

    if (cred?.token) {
      // Use credential helper approach
      env.GIT_ASKPASS = this.createAskPassScript(cred.token);

      // For GitHub, can also use token directly in URL
      if (service === 'github') {
        env.GITHUB_TOKEN = cred.token;
      }
    }

    return env;
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

  // Create a temporary askpass script for Git
  createAskPassScript(token) {
    const os = require('os');
    const scriptPath = path.join(os.tmpdir(), 'gitvoice-askpass');

    // Create script that echoes the token
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const script = `@echo off\necho ${token}`;
      fs.writeFileSync(scriptPath + '.bat', script, { mode: 0o700 });
      return scriptPath + '.bat';
    } else {
      const script = `#!/bin/sh\necho "${token}"`;
      fs.writeFileSync(scriptPath, script, { mode: 0o700 });
      return scriptPath;
    }
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
      // Create a temporary environment with GIT_ASKPASS to test credentials
      const askPassPath = this.createAskPassScript(password);
      const env = {
        ...process.env,
        GIT_ASKPASS: askPassPath,
        GIT_TERMINAL_PROMPT: '0'
      };

      // Test with ls-remote on a common public repo that we can use to verify auth
      // For service specific validation, we'd need a URL
      let testUrl;
      switch (service) {
        case 'github': testUrl = `https://github.com/${username}/non-existent-repo-for-auth-test.git`; break;
        case 'gitlab': testUrl = `https://gitlab.com/${username}/non-existent-repo-for-auth-test.git`; break;
        case 'bitbucket': testUrl = `https://bitbucket.org/${username}/non-existent-repo-for-auth-test.git`; break;
        default: testUrl = 'https://github.com/github/test-repo.git';
      }

      // We expect a 404 or success if credentials are good, but a 401/403 if bad
      // Note: ls-remote on a non-existent repo with GOOD credentials will give "repository not found"
      // ls-remote on a repo with BAD credentials will give "Authentication failed"

      const result = await GitProcess.exec(['ls-remote', testUrl], tempDir, { env });

      const output = (result.stdout + result.stderr).toLowerCase();

      if (output.includes('authentication failed')) {
        return { valid: false, error: 'Authentication failed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    } finally {
      // Clean up temp scripts and directory
      const askPassPath = path.join(os.tmpdir(), 'gitvoice-askpass');
      try {
        if (fs.existsSync(askPassPath)) fs.unlinkSync(askPassPath);
        if (fs.existsSync(askPassPath + '.bat')) fs.unlinkSync(askPassPath + '.bat');
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Cleanup failed:', e);
      }
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
    const crypto = require('crypto');
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
