// VoiceController - Handles voice command flow and execution

class VoiceController {
  constructor(services) {
    this.audioService = services.audioService;
    this.sttService = services.sttService;
    this.intentService = services.intentService;
    this.gitService = services.gitService;
    this.narrationService = services.narrationService;
    this.commandModal = services.commandModal;
    this.progressIndicator = services.progressIndicator;
    this.explainer = services.explainer;
    this.practiceMode = services.practiceMode;
    this.uiController = services.uiController;

    this.isProcessing = false;
    this.isLearningMode = true;
    this.isPracticeMode = false;
    this.currentCommand = null;
  }

  async startVoiceCommand() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const elements = this.uiController.elements;

    // Reset UI
    this.progressIndicator.reset();
    this.uiController.hideCommandPreview();
    elements.cancelBtn.disabled = false;
    this.uiController.setVoiceButtonListening(true);

    try {
      let transcript = '';

      if (this.sttService.useLocalModel) {
        console.log('[Voice] Using Local Model (Offline Mode)');
        this.progressIndicator.setListening();
        await this.narrationService.announceStep('listening');
        elements.transcript.innerHTML = '<span class="placeholder">Listening...</span>';

        console.log('[Voice] Waiting for VAD recording...');
        const audioBlob = await this.audioService.recordWithVAD();
        console.log('[Voice] Audio recording captured, size:', audioBlob.size);

        this.progressIndicator.setUnderstanding();
        this.narrationService.announceStep('processing', {}, false);
        elements.transcript.innerHTML = '<span class="placeholder">Transcribing...</span>';

        console.log('[Voice] Calling local transcription service...');
        let result;
        try {
          result = await this.sttService.transcribe(audioBlob);
          console.log('[Voice] Transcription result:', result.text);
          transcript = result.text;
        } catch (transcribeError) {
          console.error('[Voice] Transcription failed:', transcribeError);
          this.handleError(new Error(`Offline transcription failed: ${transcribeError.message}. The Whisper model may have crashed. Try Online mode instead.`));
          return;
        }
      } else {
        console.log('[Voice] Using Web Speech API (Online Mode)');
        this.progressIndicator.setListening();
        await this.narrationService.announceStep('listening');
        elements.transcript.innerHTML = '<span class="placeholder">Listening...</span>';

        transcript = await new Promise((resolve, reject) => {
          let finalTranscript = '';

          this.sttService.onResult = (result) => {
            elements.transcript.textContent = result.interim || result.final;
            if (result.isFinal && result.final) {
              finalTranscript = result.final;
            }
          };

          this.sttService.onEnd = () => {
            if (finalTranscript) {
              resolve(finalTranscript);
            } else {
              reject(new Error('No speech detected'));
            }
          };

          this.sttService.onError = (error) => {
            reject(new Error(`Speech recognition error: ${error}`));
          };

          this.sttService.start();

          setTimeout(() => {
            this.sttService.stop();
          }, 15000);
        });
      }

      this.progressIndicator.setUnderstanding();
      this.narrationService.announceStep('transcribed', transcript, false);

      elements.transcript.textContent = transcript;

      this.narrationService.announceStep('parsing', {}, false);

      console.log('[Voice] Getting Git context...');
      const context = await this.gitService.getContext();
      console.log('[Voice] Context retreived, parsing intent...');

      const intent = this.intentService.parse(transcript, context);
      console.log('[Voice] Intent parsed:', intent);

      if (intent.action === 'unknown') {
        await this.narrationService.speak(`I didn't understand that. ${this.intentService.getHelpText().split('\n')[0]}`);
        this._resetVoiceUI();
        return;
      }

      if (intent.action === 'help') {
        await this.narrationService.speak(this.intentService.getHelpText());
        this._resetVoiceUI();
        return;
      }

      await this.narrationService.announceStep('commandIdentified', intent.description);

      this.currentCommand = intent;
      this.uiController.showCommandPreview(intent);

      if (intent.safe) {
        await this.executeCommand(intent);
      } else {
        await this.narrationService.speak('This command will modify the remote repository. Say "execute" or click the button to proceed.');
        this._resetVoiceUI();
      }

      this._resetVoiceUI();
    } catch (error) {
      // Use centralized error handler
      const errorInfo = window.errorHandler.handle('VoiceController.startVoiceCommand', error);
      await this.narrationService.announceStep('error', error.message);
      this.uiController.showError(errorInfo);
      this._resetVoiceUI();
    }
  }

  async executeCommand(intent) {
    if (this.isPracticeMode) {
      await this._executePracticeCommand(intent);
      return;
    }

    this.progressIndicator.setExecuting();

    // Show learning modal if learning mode is on and auto-modal setting is enabled
    const settings = window.appSettings || {};
    const shouldShowModal = this.isLearningMode && (settings.autoModal !== false);

    if (shouldShowModal) {
      const commandData = this.explainer.explainCommand(intent.command);
      const showTips = settings.showTips !== false;
      this.commandModal.show({
        ...commandData,
        description: `Executing: ${intent.description}`,
        tip: showTips ? this.explainer.getTipOfTheDay() : null
      });
    }

    const narrator = await this.narrationService.narrateGitOperation(intent.action, intent.args || {});

    try {
      let result;

      switch (intent.action) {
        case 'status':
          result = await this.gitService.getStatus();
          if (result.success) {
            this.uiController.displayGitStatus(result);
          }
          break;

        case 'commit':
          await this.gitService.add('.');
          result = await this.gitService.commit(intent.args?.message || 'Update');
          break;

        case 'push':
          result = await this.gitService.push(intent.args?.remote, intent.args?.branch);
          break;

        case 'pull':
          result = await this.gitService.pull(intent.args?.remote, intent.args?.branch);
          break;

        case 'add':
          result = await this.gitService.add(intent.args?.files);
          break;

        case 'branch':
          result = await this.gitService.createBranch(intent.args?.name);
          break;

        case 'checkout':
          result = await this.gitService.checkout(intent.args?.branch);
          break;

        case 'log':
          result = await this.gitService.getLog();
          break;

        case 'diff':
          result = await this.gitService.getDiff();
          break;

        case 'merge':
          result = await this.gitService.merge(intent.args?.branch);
          break;

        case 'stash':
          result = await this.gitService.stash(intent.args?.action, intent.args?.name);
          break;

        default:
          result = { success: false, error: 'Unknown action' };
      }

      if (shouldShowModal && result) {
        this.commandModal.updateOutput(result.output || 'Command completed');
      }

      this.progressIndicator.setComplete();

      if (result?.success) {
        if (narrator?.success) {
          await narrator.success(result.data || {});
        }

        if (['commit', 'add', 'checkout', 'pull', 'push'].includes(intent.action)) {
          await this._refreshGitStatus();
        }

        if (this.isLearningMode && settings.showTips !== false) {
          await this.narrationService.announceStep('learningPrompt');
        }
      } else {
        await this.narrationService.announceStep('error', result?.error || 'Unknown error');

        if (shouldShowModal) {
          const errorInfo = this.explainer.getEducationalError(this._detectErrorType(result?.error || ''));
          if (errorInfo) {
            this.commandModal.showError({
              title: errorInfo.title,
              message: result?.error,
              explanation: errorInfo.explanation,
              tip: errorInfo.tip,
              command: intent.command
            });
          }
        }
      }

    } catch (error) {
      // Use centralized error handler
      const errorInfo = window.errorHandler.handle('VoiceController.executeCommand', error);
      await this.narrationService.announceStep('error', error.message);

      if (this.isLearningMode) {
        this.commandModal.showError({
          ...errorInfo,
          tip: errorInfo.solution,
          command: intent.command
        });
      }
    }

    this._resetVoiceUI();
  }

  async _executePracticeCommand(intent) {
    this.progressIndicator.setExecuting();

    const context = await this.gitService.getContext();
    const simulation = await this.practiceMode.simulateCommand(intent.command, context);

    this.commandModal.showPracticeSimulation(simulation);

    await this.narrationService.speak(
      `In practice mode. This command would ${simulation.wouldDo}. ${simulation.warning || ''}`
    );

    this.progressIndicator.setComplete();
    this._resetVoiceUI();
  }

  async _refreshGitStatus() {
    try {
      const result = await this.gitService.getStatus();
      if (result.success) {
        this.uiController.displayGitStatus(result);
      }
    } catch (error) {
      console.error('Error getting status:', error);
    }
  }

  _detectErrorType(errorMessage) {
    const message = errorMessage.toLowerCase();

    if (message.includes('nothing to commit') || message.includes('no changes')) {
      return 'noChangesToCommit';
    }
    if (message.includes('authentication') || message.includes('permission denied')) {
      return 'authenticationFailed';
    }
    if (message.includes('conflict') || message.includes('merge')) {
      return 'mergeConflict';
    }
    if (message.includes('not a git repository')) {
      return 'notARepository';
    }
    if (message.includes('detached head')) {
      return 'detachedHead';
    }

    return null;
  }

  executeCurrentCommand() {
    if (this.currentCommand) {
      this.executeCommand(this.currentCommand);
    }
  }

  explainCurrentCommand() {
    if (this.currentCommand && this.isLearningMode) {
      const commandData = this.explainer.explainCommand(this.currentCommand.command);
      const settings = window.appSettings || {};
      const showTips = settings.showTips !== false;
      this.commandModal.show({
        ...commandData,
        description: `About: ${this.currentCommand.description}`,
        tip: showTips ? this.explainer.getTipOfTheDay() : null
      });
    }
  }

  cancelCommand() {
    this.sttService.abort();
    this.currentCommand = null;
    this.narrationService.announceStep('cancelled');
    this._resetVoiceUI();
  }

  _resetVoiceUI() {
    this.isProcessing = false;

    this.sttService.stop();
    this.audioService.stopListening();
    this.audioService.cleanup();

    this.uiController.setVoiceButtonListening(false);
    this.uiController.elements.cancelBtn.disabled = true;
  }

  toggleLearningMode() {
    this.isLearningMode = !this.isLearningMode;
    this.commandModal.setLearningMode(this.isLearningMode);
    this.uiController.updateLearningModeToggle(this.isLearningMode);

    if (this.isLearningMode) {
      this.narrationService.speak('Learning mode enabled. I will show you the commands I execute.');
    } else {
      this.narrationService.speak('Learning mode disabled.');
    }
  }

  togglePracticeMode() {
    this.isPracticeMode = this.practiceMode.toggle();
    const btn = document.getElementById('practice-mode-toggle');

    if (btn) {
      if (this.isPracticeMode) {
        btn.classList.add('active');
        btn.innerHTML = '<span class="icon">&#127919;</span> Practice Mode: ON';
        this.narrationService.speak('Practice mode enabled. Commands will be simulated without executing.');
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<span class="icon">&#127919;</span> Practice Mode';
        this.narrationService.speak('Practice mode disabled. Commands will be executed normally.');
      }
    }
  }

  setCurrentRepo(repo) {
    // Used by repository controller to inform voice controller of repo changes
  }

  isReady() {
    return !this.isProcessing;
  }

  showPracticeHistory() {
    const modal = document.getElementById('practice-history-modal');
    const listEl = document.getElementById('practice-history-list');

    if (!modal || !listEl) return;

    const history = this.practiceMode.getHistory();

    if (history.length === 0) {
      listEl.innerHTML = '<p class="placeholder">No practice commands yet. Enable Practice Mode and try some commands!</p>';
    } else {
      listEl.innerHTML = history.map((item, index) => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleTimeString();
        const sim = item.simulation;

        return `
          <div class="practice-history-item">
            <div class="history-header">
              <code class="history-command">${this._escapeHtml(item.command)}</code>
              <span class="history-time">${timeStr}</span>
            </div>
            <div class="history-details">
              <p><strong>Would do:</strong> ${this._escapeHtml(sim.wouldDo)}</p>
              ${sim.warning ? `<p class="history-warning"><strong>Warning:</strong> ${this._escapeHtml(sim.warning)}</p>` : ''}
              <span class="history-safe ${sim.safe ? 'safe' : 'unsafe'}">${sim.safe ? 'Safe Command' : 'Modifying Command'}</span>
            </div>
          </div>
        `;
      }).reverse().join('');
    }

    modal.classList.remove('hidden');
  }

  closePracticeHistory() {
    const modal = document.getElementById('practice-history-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  clearPracticeHistory() {
    this.practiceMode.clearHistory();
    const listEl = document.getElementById('practice-history-list');
    if (listEl) {
      listEl.innerHTML = '<p class="placeholder">History cleared. Enable Practice Mode and try some commands!</p>';
    }
    this.narrationService.speak('Practice history cleared.');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  bindVoiceEvents(elements) {
    elements.voiceBtn?.addEventListener('click', () => this.startVoiceCommand());
    elements.cancelBtn?.addEventListener('click', () => this.cancelCommand());
    elements.executeBtn?.addEventListener('click', () => this.executeCurrentCommand());
    elements.explainBtn?.addEventListener('click', () => this.explainCurrentCommand());
    elements.learnModeToggle?.addEventListener('click', () => this.toggleLearningMode());

    // Practice mode toggle
    const practiceModeToggle = document.getElementById('practice-mode-toggle');
    practiceModeToggle?.addEventListener('click', () => this.togglePracticeMode());

    // Practice history viewer
    const practiceHistoryBtn = document.getElementById('practice-history-btn');
    practiceHistoryBtn?.addEventListener('click', () => this.showPracticeHistory());

    document.getElementById('close-practice-history')?.addEventListener('click', () => this.closePracticeHistory());
    document.getElementById('close-practice-history-footer')?.addEventListener('click', () => this.closePracticeHistory());
    document.getElementById('clear-practice-history')?.addEventListener('click', () => this.clearPracticeHistory());

    // Global hotkey
    window.electronAPI.onVoiceActivate(() => {
      if (this.isReady()) {
        this.startVoiceCommand();
      }
    });

    // Make executeVoiceCommand available globally for learning overlay
    window.executeVoiceCommand = async (commandText) => {
      const context = await this.gitService.getContext();
      const intent = this.intentService.parse(commandText, context);
      if (intent.action !== 'unknown') {
        this.currentCommand = intent;
        await this.executeCommand(intent);
      }
    };
  }
}

// Make available globally
window.VoiceController = VoiceController;
