// SettingsManager - Handles settings save/load, hotkey, microphone, and model management

class SettingsManager {
  constructor(services) {
    this.ttsService = services.ttsService;
    this.sttService = services.sttService;
    this.audioService = services.audioService;
    this.narrationService = services.narrationService;
    this.modelDownloader = services.modelDownloader;
    this.uiController = services.uiController;
  }

  async saveSettings() {
    const verbosity = document.getElementById('verbosity')?.value || 'normal';
    const showTips = document.getElementById('show-tips')?.checked ?? true;
    const autoModal = document.getElementById('auto-modal')?.checked ?? true;
    const voiceMode = document.getElementById('voice-mode')?.value || 'offline';

    // Apply settings immediately
    this.narrationService.setVerbosity(verbosity);
    this.sttService.setUseLocalModel(voiceMode === 'offline');

    // Store settings in memory for quick access
    window.appSettings = {
      verbosity,
      showTips,
      autoModal,
      voiceMode,
      voiceSpeed: this.ttsService.rate,
      vadSensitivity: this.audioService.vadThreshold
    };

    // Save to secure IPC storage
    try {
      await window.electronAPI.saveSettings(window.appSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }

    this.uiController.closeSettings();
    this.narrationService.speak('Settings saved.');
  }

  async loadSettings() {
    try {
      const result = await window.electronAPI.loadSettings();
      const settings = result.success ? result.settings : {};

      // Store in memory for quick access
      window.appSettings = settings;

      if (settings.voiceSpeed) {
        this.ttsService.setRate(settings.voiceSpeed);
        const speedInput = document.getElementById('voice-speed');
        if (speedInput) {
          speedInput.value = settings.voiceSpeed;
          document.getElementById('voice-speed-value').textContent = `${settings.voiceSpeed}x`;
        }
      }

      if (settings.vadSensitivity) {
        this.audioService.setVADThreshold(settings.vadSensitivity);
        const vadInput = document.getElementById('vad-sensitivity');
        if (vadInput) {
          vadInput.value = settings.vadSensitivity;
          document.getElementById('vad-sensitivity-value').textContent = settings.vadSensitivity;
        }
      }

      if (settings.verbosity) {
        this.narrationService.setVerbosity(settings.verbosity);
        const verbositySelect = document.getElementById('verbosity');
        if (verbositySelect) {
          verbositySelect.value = settings.verbosity;
        }
      }

      if (settings.voiceMode) {
        const voiceModeSelect = document.getElementById('voice-mode');
        if (voiceModeSelect) {
          voiceModeSelect.value = settings.voiceMode;
        }
        this.sttService.setUseLocalModel(settings.voiceMode === 'offline');
      }

      if (settings.showTips !== undefined) {
        const showTipsCheckbox = document.getElementById('show-tips');
        if (showTipsCheckbox) {
          showTipsCheckbox.checked = settings.showTips;
        }
      }

      if (settings.autoModal !== undefined) {
        const autoModalCheckbox = document.getElementById('auto-modal');
        if (autoModalCheckbox) {
          autoModalCheckbox.checked = settings.autoModal;
        }
      }

      // Always check network status on load
      this.updateVoiceModeBasedOnNetwork();

    } catch (error) {
      console.warn('Could not load settings:', error);
    }
  }

  updateVoiceModeBasedOnNetwork() {
    const isOnline = navigator.onLine;
    const statuses = this.modelDownloader.getModelStatus();
    const sttDownloaded = statuses.stt.downloaded;

    if (!isOnline && sttDownloaded) {
      console.log('[Network] Internet restricted. Switching to Offline Mode.');
      this.sttService.setUseLocalModel(true);
      this.uiController.updateVoiceModeUI('offline', true);
    } else if (isOnline) {
      console.log('[Network] Internet available. Preferred Online Mode.');
      const settings = window.appSettings || {};
      const preferredMode = settings.voiceMode || 'online';
      this.sttService.setUseLocalModel(preferredMode === 'offline');
      this.uiController.updateVoiceModeUI(preferredMode, false);
    }
  }

  async initializeHotkey() {
    const hotkeyInput = document.getElementById('hotkey-input');
    const resetBtn = document.getElementById('reset-hotkey');
    const currentHotkeyEl = document.getElementById('current-hotkey');

    const currentHotkey = await window.electronAPI.getHotkey();
    if (currentHotkeyEl) {
      currentHotkeyEl.textContent = this.uiController.formatHotkey(currentHotkey);
    }

    if (hotkeyInput) {
      hotkeyInput.addEventListener('click', () => {
        hotkeyInput.value = 'Press new hotkey...';
        hotkeyInput.classList.add('recording');
      });

      hotkeyInput.addEventListener('keydown', async (e) => {
        if (!hotkeyInput.classList.contains('recording')) return;

        e.preventDefault();

        const parts = [];
        if (e.metaKey) parts.push('CommandOrControl');
        else if (e.ctrlKey) parts.push('Control');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
          parts.push(e.key.toUpperCase());
        }

        if (parts.length >= 2) {
          const newHotkey = parts.join('+');
          const result = await window.electronAPI.setHotkey(newHotkey);

          if (result.success) {
            hotkeyInput.value = this.uiController.formatHotkey(newHotkey);
            currentHotkeyEl.textContent = this.uiController.formatHotkey(newHotkey);
            this.narrationService.speak('Hotkey updated.');
          } else {
            hotkeyInput.value = 'Failed: ' + result.error;
          }

          hotkeyInput.classList.remove('recording');
        }
      });

      hotkeyInput.addEventListener('blur', () => {
        hotkeyInput.classList.remove('recording');
        hotkeyInput.value = '';
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.setHotkey('CommandOrControl+Shift+V');
        if (result.success) {
          currentHotkeyEl.textContent = 'Cmd+Shift+V';
          this.narrationService.speak('Hotkey reset to default.');
        }
      });
    }
  }

  async initializeMicrophone() {
    const micSelect = document.getElementById('microphone-select');
    const testBtn = document.getElementById('test-mic');
    const levelEl = document.getElementById('mic-level');

    try {
      const devices = await this.audioService.getDevices();
      if (micSelect) {
        devices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `Microphone ${micSelect.options.length}`;
          micSelect.appendChild(option);
        });

        micSelect.addEventListener('change', async (e) => {
          if (e.target.value) {
            await this.audioService.setDevice(e.target.value);
            this.narrationService.speak('Microphone changed.');
          }
        });
      }
    } catch (error) {
      console.error('Error getting audio devices:', error);
    }

    if (testBtn && levelEl) {
      testBtn.addEventListener('click', async () => {
        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;

        const initialized = await this.audioService.initialize();
        if (initialized) {
          this.audioService.onVolumeChange = (volume) => {
            levelEl.style.width = `${volume * 100}%`;
          };

          await this.audioService.startListening();

          setTimeout(() => {
            this.audioService.stopListening();
            testBtn.textContent = 'Test';
            testBtn.disabled = false;
            this.audioService.onVolumeChange = null;
          }, 3000);
        } else {
          testBtn.textContent = 'Test';
          testBtn.disabled = false;
          alert('Could not access microphone');
        }
      });
    }
  }

  async initializeModels() {
    const sttStatus = document.getElementById('stt-model-status');
    const ttsStatus = document.getElementById('tts-model-status');
    const downloadSttBtn = document.getElementById('download-stt');
    const downloadTtsBtn = document.getElementById('download-tts');

    await this.modelDownloader.checkDownloadedModels();
    this._updateModelUI(sttStatus, ttsStatus, downloadSttBtn, downloadTtsBtn);

    downloadSttBtn?.addEventListener('click', () => this.startModelDownload('stt'));
    downloadTtsBtn?.addEventListener('click', () => this.startModelDownload('tts'));

    this.modelDownloader.onProgress = (modelType, progress, downloadedBytes) => {
      const container = document.getElementById(`${modelType}-progress-container`);
      const progressBar = document.getElementById(`${modelType}-progress-bar`);
      const percentage = document.getElementById(`${modelType}-percentage`);

      if (container) container.style.display = 'block';

      if (progress !== undefined && !isNaN(progress)) {
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (percentage) percentage.textContent = `${progress}%`;
      } else if (downloadedBytes !== undefined) {
        if (progressBar) progressBar.style.width = '100%';
        if (progressBar) progressBar.classList.add('indeterminate');
        if (percentage) percentage.textContent = this.modelDownloader.formatBytes(downloadedBytes);
      }
    };

    this.modelDownloader.onComplete = (modelType) => {
      const container = document.getElementById(`${modelType}-progress-container`);
      const statusText = document.getElementById(`${modelType}-download-text`);
      const status = document.getElementById(`${modelType}-model-status`);
      const btn = document.getElementById(`download-${modelType}`);

      if (statusText) statusText.textContent = 'Download Complete!';
      if (status) {
        status.textContent = 'Downloaded (Offline Mode Available)';
        status.classList.add('downloaded');
      }
      if (btn) btn.disabled = true;

      setTimeout(() => {
        if (container) container.style.display = 'none';
        this._updateModelUI(sttStatus, ttsStatus, downloadSttBtn, downloadTtsBtn);
      }, 3000);

      this.narrationService.speak(`${modelType.toUpperCase()} model is now ready for offline use.`);
    };

    this.modelDownloader.onError = (modelType, error) => {
      const statusText = document.getElementById(`${modelType}-download-text`);
      if (statusText) {
        statusText.textContent = `Error: ${error}`;
        statusText.style.color = 'var(--error-color)';
      }
    };
  }

  _updateModelUI(sttStatus, ttsStatus, downloadSttBtn, downloadTtsBtn) {
    const statuses = this.modelDownloader.getModelStatus();

    if (sttStatus) {
      if (statuses.stt.needsUpdate) {
        sttStatus.textContent = 'Update Required (Incompatible Format)';
        sttStatus.classList.add('warning');
        sttStatus.classList.remove('downloaded');
        if (downloadSttBtn) downloadSttBtn.disabled = false;
        if (downloadSttBtn) downloadSttBtn.textContent = 'Update Now';
      } else {
        sttStatus.textContent = statuses.stt.downloaded ? 'Downloaded (Offline Mode Available)' : 'Web Speech API (Internet Required)';
        if (statuses.stt.downloaded) {
          sttStatus.classList.add('downloaded');
          sttStatus.classList.remove('warning');
        }
        if (downloadSttBtn) {
          downloadSttBtn.disabled = statuses.stt.downloaded;
          downloadSttBtn.textContent = statuses.stt.downloaded ? 'Downloaded' : 'Download';
        }
      }
    }

    if (ttsStatus) {
      if (statuses.tts.needsUpdate) {
        ttsStatus.textContent = 'Update Required';
        ttsStatus.classList.add('warning');
        ttsStatus.classList.remove('downloaded');
        if (downloadTtsBtn) downloadTtsBtn.disabled = false;
        if (downloadTtsBtn) downloadTtsBtn.textContent = 'Update Now';
      } else {
        ttsStatus.textContent = statuses.tts.downloaded ? 'Downloaded (Offline Mode Ready)' : 'Web Speech Synthesis (Cloud-based)';
        if (statuses.tts.downloaded) {
          ttsStatus.classList.add('downloaded');
          ttsStatus.classList.remove('warning');
          this.ttsService.setUseLocalModel(true);
        }
        if (downloadTtsBtn) {
          downloadTtsBtn.disabled = statuses.tts.downloaded;
          downloadTtsBtn.textContent = statuses.tts.downloaded ? 'Downloaded' : 'Download';
        }
      }
    }
  }

  async startModelDownload(modelType) {
    const btn = document.getElementById(`download-${modelType}`);
    if (btn) btn.disabled = true;

    const container = document.getElementById(`${modelType}-progress-container`);
    if (container) container.style.display = 'block';

    try {
      await this.modelDownloader.downloadModel(modelType);
    } catch (error) {
      console.error(`Error downloading ${modelType} model:`, error);
      if (btn) btn.disabled = false;
    }
  }

  async initializePermissions() {
    console.log('Checking permissions...');
    const micStatusEl = document.getElementById('mic-status');
    const micText = micStatusEl?.querySelector('.status-text');

    const micStatus = await window.electronAPI.checkMicrophonePermission();
    console.log('Microphone status:', micStatus);

    if (micStatus === 'granted') {
      if (micStatusEl) {
        micStatusEl.classList.add('granted');
        if (micText) micText.textContent = 'Microphone: Ready';
      }
    } else if (micStatus === 'undetermined' || micStatus === 'not-determined') {
      const granted = await window.electronAPI.requestMicrophonePermission();
      if (granted) {
        if (micStatusEl) {
          micStatusEl.classList.add('granted');
          if (micText) micText.textContent = 'Microphone: Ready';
        }
      } else {
        if (micStatusEl) {
          micStatusEl.classList.add('denied');
          if (micText) micText.textContent = 'Microphone: Permission Required';
        }
        this._showPermissionWarning('Microphone access is required for voice commands.');
      }
    } else {
      if (micStatusEl) {
        micStatusEl.classList.add('denied');
        if (micText) micText.textContent = 'Microphone: Denied';
      }
      this._showPermissionWarning('Microphone access is denied. Please enable it in System Settings.');
    }

    await this._checkNetwork();
  }

  async _checkNetwork() {
    const netStatusEl = document.getElementById('network-status');
    const netText = netStatusEl?.querySelector('.status-text');

    if (!navigator.onLine) {
      if (netStatusEl) {
        netStatusEl.classList.add('offline');
        if (netText) netText.textContent = 'Network: Offline';
      }
      console.warn('Connectivity Warning: You are offline.');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch('https://raw.githubusercontent.com/robots.txt', {
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (netStatusEl) {
        netStatusEl.classList.remove('offline', 'warning');
        netStatusEl.classList.add('online');
        if (netText) netText.textContent = 'Network: Connected';
      }
      return true;
    } catch (error) {
      if (netStatusEl) {
        netStatusEl.classList.remove('online', 'offline');
        netStatusEl.classList.add('warning');
        if (netText) netText.textContent = 'Network: Restricted';
      }
      console.warn('Connectivity Warning: Network access appears restricted.');
      return false;
    }
  }

  _showPermissionWarning(message) {
    this.uiController.showError({
      title: 'Permission Required',
      message: message,
      explanation: 'GitVoice requires microphone access to process your voice commands.',
      solution: 'On macOS, go to System Settings > Privacy & Security > Microphone and ensure GitVoice is enabled.'
    });
  }

  bindSettingsEvents(elements) {
    elements.settingsBtn?.addEventListener('click', () => this.uiController.openSettings());
    document.getElementById('close-settings')?.addEventListener('click', () => this.uiController.closeSettings());
    document.getElementById('settings-save')?.addEventListener('click', () => this.saveSettings());

    const voiceSpeed = document.getElementById('voice-speed');
    if (voiceSpeed) {
      voiceSpeed.addEventListener('input', (e) => {
        document.getElementById('voice-speed-value').textContent = `${e.target.value}x`;
        this.ttsService.setRate(parseFloat(e.target.value));
      });
    }

    const vadSensitivity = document.getElementById('vad-sensitivity');
    if (vadSensitivity) {
      vadSensitivity.addEventListener('input', (e) => {
        document.getElementById('vad-sensitivity-value').textContent = e.target.value;
        this.audioService.setVADThreshold(parseFloat(e.target.value));
      });
    }

    // Network awareness
    window.addEventListener('online', () => this.updateVoiceModeBasedOnNetwork());
    window.addEventListener('offline', () => this.updateVoiceModeBasedOnNetwork());
  }
}

// Make available globally
window.SettingsManager = SettingsManager;
