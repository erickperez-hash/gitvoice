// UIController - Manages DOM elements and display updates

class UIController {
  constructor() {
    this.elements = {};
  }

  initializeElements() {
    this.elements.repoPath = document.getElementById('repo-path');
    this.elements.browseRepo = document.getElementById('browse-repo');
    this.elements.repoStatus = document.getElementById('repo-status');
    this.elements.gitStatus = document.getElementById('git-status');
    this.elements.transcript = document.getElementById('transcript');
    this.elements.voiceText = document.getElementById('voice-text');
    this.elements.voiceFeedback = document.getElementById('voice-feedback');
    this.elements.commandPreview = document.getElementById('command-preview');
    this.elements.previewAction = document.getElementById('preview-action');
    this.elements.previewCommand = document.getElementById('preview-command');
    this.elements.voiceBtn = document.getElementById('voice-btn');
    this.elements.executeBtn = document.getElementById('execute-btn');
    this.elements.cancelBtn = document.getElementById('cancel-btn');
    this.elements.explainBtn = document.getElementById('explain-btn');
    this.elements.learnModeToggle = document.getElementById('learn-mode-toggle');
    this.elements.settingsBtn = document.getElementById('settings-btn');
    this.elements.settingsModal = document.getElementById('settings-modal');
    this.elements.errorModal = document.getElementById('error-modal');

    // Cloning elements
    this.elements.cloneUrl = document.getElementById('clone-url');
    this.elements.cloneRepoBtn = document.getElementById('clone-repo');
    this.elements.authType = document.getElementById('auth-type');
    this.elements.tokenAuthFields = document.getElementById('token-auth-fields');
    this.elements.passwordAuthFields = document.getElementById('password-auth-fields');
    this.elements.gitUsername = document.getElementById('git-username');
    this.elements.gitPassword = document.getElementById('git-password');

    console.log('Initialized UI elements:', this.elements);
    return this.elements;
  }

  displayGitStatus(result) {
    const { data } = result;
    let html = '';

    if (data?.branch) {
      html += `<div class="status-item"><span class="branch-name">${data.branch}</span></div>`;
    }

    if (data?.clean) {
      html += '<div class="status-item"><span style="color: var(--success-color);">Working directory clean</span></div>';
    } else {
      if (data?.modified > 0) {
        html += `<div class="status-item"><span class="status-badge modified">Modified</span> ${data.modified} file(s)</div>`;
      }
      if (data?.staged > 0) {
        html += `<div class="status-item"><span class="status-badge staged">Staged</span> ${data.staged} file(s)</div>`;
      }
      if (data?.untracked > 0) {
        html += `<div class="status-item"><span class="status-badge untracked">Untracked</span> ${data.untracked} file(s)</div>`;
      }
    }

    this.elements.gitStatus.innerHTML = html || '<span class="placeholder">No status available</span>';
  }

  updateVoiceModeUI(mode, isAuto) {
    const voiceModeSelect = document.getElementById('voice-mode');
    if (voiceModeSelect) {
      voiceModeSelect.value = mode;
    }

    const sttStatus = document.getElementById('stt-model-status');
    if (sttStatus) {
      if (mode === 'offline') {
        sttStatus.textContent = isAuto ? 'Offline Mode (Automatic)' : 'Offline Mode (Active)';
        sttStatus.classList.add('downloaded');
      } else {
        sttStatus.textContent = navigator.onLine ? 'Online (High Accuracy)' : 'Internet required for Online mode';
        if (!navigator.onLine) sttStatus.classList.remove('downloaded');
      }
    }
  }

  updateCredentialStatus(services) {
    const statusEl = document.getElementById('credential-status');
    if (!statusEl) return;

    if (services.length === 0) {
      statusEl.innerHTML = '<span class="hint">No credentials configured</span>';
    } else {
      const list = services.map(s =>
        `<div class="credential-item">
          <span class="service-name">${s.service}</span>
          <span class="service-user">${s.username}</span>
        </div>`
      ).join('');
      statusEl.innerHTML = list;
    }
  }

  displaySSHKeys(keys) {
    const container = document.getElementById('ssh-keys-list');
    if (!container) return;

    if (keys.length === 0) {
      container.innerHTML = '<p class="placeholder">No SSH keys found</p>';
    } else {
      container.innerHTML = keys.map(key =>
        `<div class="ssh-key-item">
          <span class="key-type">${key.type}</span>
          <code class="key-fingerprint">${key.fingerprint}</code>
        </div>`
      ).join('');
    }
  }

  showError(errorData) {
    document.getElementById('error-title').textContent = errorData.title || 'Error';
    document.getElementById('error-description').textContent = errorData.message || 'An error occurred';
    document.getElementById('error-explanation').textContent = errorData.explanation || '';
    document.getElementById('error-solution').innerHTML = errorData.solution || '';

    this.elements.errorModal.classList.remove('hidden');
  }

  closeErrorModal() {
    this.elements.errorModal.classList.add('hidden');
  }

  openSettings() {
    this.elements.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.elements.settingsModal.classList.add('hidden');
  }

  formatHotkey(hotkey) {
    return hotkey
      .replace('CommandOrControl', 'Cmd/Ctrl')
      .replace('Control', 'Ctrl')
      .replace('+', '+');
  }

  setVoiceButtonListening(isListening) {
    if (isListening) {
      this.elements.voiceBtn.classList.add('listening');
      this.elements.voiceBtn.innerHTML = '<span class="mic-icon">&#127908;</span> Listening...';
    } else {
      this.elements.voiceBtn.classList.remove('listening');
      this.elements.voiceBtn.innerHTML = '<span class="mic-icon">&#127908;</span> Start Voice Command';
    }
  }

  setRepositoryLoaded(path, message) {
    this.elements.repoPath.value = path;
    this.elements.repoStatus.textContent = message;
    this.elements.repoStatus.classList.add('valid');
    this.elements.repoStatus.classList.remove('invalid');
    this.elements.voiceBtn.disabled = false;
  }

  setRepositoryError(error) {
    this.elements.repoStatus.textContent = error;
    this.elements.repoStatus.classList.add('invalid');
    this.elements.repoStatus.classList.remove('valid');
    this.elements.voiceBtn.disabled = true;
  }

  showCommandPreview(intent) {
    this.elements.commandPreview.style.display = 'block';
    this.elements.previewAction.textContent = intent.action.toUpperCase();
    this.elements.previewCommand.textContent = intent.command;
    this.elements.executeBtn.disabled = false;
    this.elements.explainBtn.disabled = false;
  }

  hideCommandPreview() {
    this.elements.commandPreview.style.display = 'none';
    this.elements.executeBtn.disabled = true;
    this.elements.explainBtn.disabled = true;
  }

  updateLearningModeToggle(isEnabled) {
    this.elements.learnModeToggle.innerHTML = `
      <span class="icon">&#128218;</span>
      Learning Mode: ${isEnabled ? 'ON' : 'OFF'}
    `;
  }

  resetCloneUI() {
    this.elements.cloneRepoBtn.disabled = false;
    this.elements.cloneRepoBtn.textContent = 'Clone';
    document.getElementById('step-cloning').style.display = 'none';
    document.getElementById('cloning-connector').style.display = 'none';
  }

  setCloneInProgress() {
    this.elements.cloneRepoBtn.disabled = true;
    this.elements.cloneRepoBtn.textContent = 'Cloning...';
    document.getElementById('step-cloning').style.display = 'flex';
    document.getElementById('cloning-connector').style.display = 'block';
  }
}

// Make available globally
window.UIController = UIController;
