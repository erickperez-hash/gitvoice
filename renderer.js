// GitVoice - Main Renderer Process

// Initialize services
let gitService;
let audioService;
let sttService;
let ttsService;
let intentService;
let narrationService;
let commandModal;
let progressIndicator;
let explainer;
let practiceMode;
let learningOverlay;
let modelDownloader;

// State
let isLearningMode = true;
let isPracticeMode = false;
let isProcessing = false;
let currentRepo = null;

// DOM Elements
const elements = {};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  injectAdditionalStyles();
  initializeElements();
  initializeServices();
  bindEvents();

  // Initialize sub-systems
  initializePracticeMode();
  initializeLearningOverlay();

  await initializePermissions();
  await checkInitialState();
  await initializeCredentials();
  await initializeHotkey();
  await initializeMicrophone();
  await initializeModels();
});

function initializeElements() {
  elements.repoPath = document.getElementById('repo-path');
  elements.browseRepo = document.getElementById('browse-repo');
  elements.repoStatus = document.getElementById('repo-status');
  elements.gitStatus = document.getElementById('git-status');
  elements.transcript = document.getElementById('transcript');
  elements.voiceText = document.getElementById('voice-text');
  elements.voiceFeedback = document.getElementById('voice-feedback');
  elements.commandPreview = document.getElementById('command-preview');
  elements.previewAction = document.getElementById('preview-action');
  elements.previewCommand = document.getElementById('preview-command');
  elements.voiceBtn = document.getElementById('voice-btn');
  elements.executeBtn = document.getElementById('execute-btn');
  elements.cancelBtn = document.getElementById('cancel-btn');
  elements.explainBtn = document.getElementById('explain-btn');
  elements.learnModeToggle = document.getElementById('learn-mode-toggle');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.settingsModal = document.getElementById('settings-modal');
  elements.errorModal = document.getElementById('error-modal');

  // New elements for cloning
  elements.cloneUrl = document.getElementById('clone-url');
  elements.cloneRepoBtn = document.getElementById('clone-repo');
  elements.authType = document.getElementById('auth-type');
  elements.tokenAuthFields = document.getElementById('token-auth-fields');
  elements.passwordAuthFields = document.getElementById('password-auth-fields');
  elements.gitUsername = document.getElementById('git-username');
  elements.gitPassword = document.getElementById('git-password');
}

function initializeServices() {
  // Initialize in correct order
  explainer = new CommandExplainer();
  ttsService = new TTSService();
  narrationService = new NarrationService(ttsService);
  gitService = new GitService();
  audioService = new AudioService();
  sttService = new STTService();
  intentService = new IntentService();
  commandModal = new CommandModal();
  progressIndicator = new ProgressIndicator();
  practiceMode = new PracticeMode();
  learningOverlay = new LearningOverlay();
  modelDownloader = new ModelDownloader();
}

function bindEvents() {
  // Repository browsing
  elements.browseRepo?.addEventListener('click', browseRepository);

  // Voice control
  elements.voiceBtn?.addEventListener('click', startVoiceCommand);
  elements.cancelBtn?.addEventListener('click', cancelCommand);
  elements.executeBtn?.addEventListener('click', executeCurrentCommand);
  elements.explainBtn?.addEventListener('click', explainCurrentCommand);

  // Learning mode toggle
  elements.learnModeToggle?.addEventListener('click', toggleLearningMode);

  // Settings
  elements.settingsBtn?.addEventListener('click', openSettings);
  document.getElementById('close-settings')?.addEventListener('click', closeSettings);
  document.getElementById('settings-save')?.addEventListener('click', saveSettings);

  // Error modal
  document.getElementById('close-error')?.addEventListener('click', closeErrorModal);
  document.getElementById('error-close')?.addEventListener('click', closeErrorModal);

  // Global hotkey listener from main process
  window.electronAPI.onVoiceActivate(() => {
    if (!isProcessing && currentRepo) {
      startVoiceCommand();
    }
  });

  // Settings range inputs
  const voiceSpeed = document.getElementById('voice-speed');
  if (voiceSpeed) {
    voiceSpeed.addEventListener('input', (e) => {
      document.getElementById('voice-speed-value').textContent = `${e.target.value}x`;
      ttsService.setRate(parseFloat(e.target.value));
    });
  }

  const vadSensitivity = document.getElementById('vad-sensitivity');
  if (vadSensitivity) {
    vadSensitivity.addEventListener('input', (e) => {
      document.getElementById('vad-sensitivity-value').textContent = e.target.value;
      audioService.setVADThreshold(parseFloat(e.target.value));
    });
  }

  // Cloning
  elements.cloneRepoBtn?.addEventListener('click', cloneRepository);

  // Auth type toggle
  elements.authType?.addEventListener('change', handleAuthTypeChange);

  // Settings
  elements.settingsBtn?.addEventListener('click', openSettings);
  document.getElementById('close-settings')?.addEventListener('click', closeSettings);
  document.getElementById('settings-save')?.addEventListener('click', saveSettings);

  // Network awareness for Offline Mode
  window.addEventListener('online', updateVoiceModeBasedOnNetwork);
  window.addEventListener('offline', updateVoiceModeBasedOnNetwork);
}

function updateVoiceModeBasedOnNetwork() {
  const isOnline = navigator.onLine;
  const statuses = modelDownloader.getModelStatus();
  const sttDownloaded = statuses.stt.downloaded;

  if (!isOnline && sttDownloaded) {
    console.log('[Network] Internet restricted. Switching to Offline Mode.');
    sttService.setUseLocalModel(true);
    updateVoiceModeUI('offline', true);
  } else if (isOnline) {
    console.log('[Network] Internet available. Preferred Online Mode.');
    // Keep user's manual preference if it exists, otherwise default to online
    const saved = localStorage.getItem('gitvoice-settings');
    const settings = saved ? JSON.parse(saved) : {};
    const preferredMode = settings.voiceMode || 'online';

    sttService.setUseLocalModel(preferredMode === 'offline');
    updateVoiceModeUI(preferredMode, false);
  }
}

function updateVoiceModeUI(mode, isAuto) {
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

async function checkInitialState() {
  // Check for existing repo
  const repoPath = await window.electronAPI.getRepoPath();
  if (repoPath) {
    currentRepo = repoPath;
    elements.repoPath.value = repoPath;
    elements.repoStatus.textContent = 'Repository loaded';
    elements.repoStatus.classList.add('valid');
    elements.voiceBtn.disabled = false;
    await refreshGitStatus();
  }

  // Check STT availability
  if (!sttService.isAvailable()) {
    showError({
      title: 'Speech Recognition Not Available',
      message: 'Your browser does not support speech recognition.',
      explanation: 'GitVoice requires speech recognition to convert your voice to text.',
      solution: 'Please use Chrome or Edge browser for full functionality.'
    });
  }
}

async function cloneRepository() {
  const url = elements.cloneUrl.value.trim();
  if (!url) {
    showError({
      title: 'Missing URL',
      message: 'Please enter a repository URL to clone.',
      explanation: 'To clone a repository, you need to provide its HTTPS or SSH URL.',
      solution: 'Copy the URL from GitHub/GitLab and paste it here.'
    });
    return;
  }

  try {
    isProcessing = true;
    elements.cloneRepoBtn.disabled = true;
    elements.cloneRepoBtn.textContent = 'Cloning...';

    // Show cloning progress
    document.getElementById('step-cloning').style.display = 'flex';
    document.getElementById('cloning-connector').style.display = 'block';
    progressIndicator.reset();

    // Use a special internal state for progress indicator during clone
    // For now we'll just use setExecuting
    progressIndicator.setExecuting();

    const targetPath = await window.electronAPI.showSaveDialog({
      title: 'Select Destination Directory',
      buttonLabel: 'Clone Here',
      defaultPath: '~'
    });

    if (!targetPath) {
      resetCloneUI();
      return;
    }

    await narrationService.speak(`Starting to clone from ${url}. This may take a moment depending on the repository size.`);

    const result = await gitService.clone(url, targetPath);

    if (result.success) {
      currentRepo = result.path;
      elements.repoPath.value = result.path;
      elements.repoStatus.textContent = 'Repository cloned and loaded';
      elements.repoStatus.classList.add('valid');
      elements.voiceBtn.disabled = false;
      elements.cloneUrl.value = '';

      progressIndicator.setComplete();
      await refreshGitStatus();
      await narrationService.speak('Cloning complete. The repository is now ready for use.');
    } else {
      showError({
        title: 'Cloning Failed',
        message: result.error,
        explanation: 'Git encountered an error while trying to clone the repository.',
        solution: result.error.includes('authentication') ? 'Check your credentials in Settings' : 'Check the URL and your internet connection'
      });
      progressIndicator.reset();
    }
  } catch (error) {
    console.error('Error cloning repository:', error);
    showError({
      title: 'Cloning Error',
      message: error.message
    });
  } finally {
    resetCloneUI();
  }
}

function resetCloneUI() {
  isProcessing = false;
  elements.cloneRepoBtn.disabled = false;
  elements.cloneRepoBtn.textContent = 'Clone';
  document.getElementById('step-cloning').style.display = 'none';
  document.getElementById('cloning-connector').style.display = 'none';
}

function handleAuthTypeChange() {
  const type = elements.authType.value;
  if (type === 'token') {
    elements.tokenAuthFields.style.display = 'block';
    elements.passwordAuthFields.style.display = 'none';
  } else {
    elements.tokenAuthFields.style.display = 'none';
    elements.passwordAuthFields.style.display = 'block';
  }
}
async function browseRepository() {
  try {
    const result = await window.electronAPI.browseRepository();

    if (result.success) {
      currentRepo = result.path;
      elements.repoPath.value = result.path;
      elements.repoStatus.textContent = 'Valid Git repository';
      elements.repoStatus.classList.add('valid');
      elements.repoStatus.classList.remove('invalid');
      elements.voiceBtn.disabled = false;

      await refreshGitStatus();
      await narrationService.speak('Repository loaded successfully. Ready for your commands.');
    } else {
      elements.repoStatus.textContent = result.error;
      elements.repoStatus.classList.add('invalid');
      elements.repoStatus.classList.remove('valid');
      elements.voiceBtn.disabled = true;
    }
  } catch (error) {
    console.error('Error browsing repository:', error);
    elements.repoStatus.textContent = 'Error selecting repository';
    elements.repoStatus.classList.add('invalid');
  }
}

async function refreshGitStatus() {
  if (!currentRepo) return;

  try {
    const result = await gitService.getStatus();

    if (result.success) {
      displayGitStatus(result);
    } else {
      elements.gitStatus.innerHTML = `<span class="placeholder">Error: ${result.error}</span>`;
    }
  } catch (error) {
    console.error('Error getting status:', error);
  }
}

function displayGitStatus(result) {
  const { data, output } = result;

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

  elements.gitStatus.innerHTML = html || '<span class="placeholder">No status available</span>';
}

// Current command state
let currentCommand = null;

async function startVoiceCommand() {
  if (isProcessing) return;
  isProcessing = true;

  // Reset UI
  progressIndicator.reset();
  elements.commandPreview.style.display = 'none';
  elements.executeBtn.disabled = true;
  elements.cancelBtn.disabled = false;
  elements.explainBtn.disabled = true;
  elements.voiceBtn.classList.add('listening');
  elements.voiceBtn.innerHTML = '<span class="mic-icon">&#127908;</span> Listening...';

  try {
    let transcript = '';

    if (sttService.useLocalModel) {
      console.log('[Voice] Using Local Model (Offline Mode)');
      // Step 1: Listening (handled by VAD)
      progressIndicator.setListening();
      await narrationService.announceStep('listening');
      elements.transcript.innerHTML = '<span class="placeholder">Listening...</span>';

      console.log('[Voice] Waiting for VAD recording...');
      const audioBlob = await audioService.recordWithVAD();
      console.log('[Voice] Audio recording captured, size:', audioBlob.size);

      // Step 2: Understanding (Local Transcription)
      progressIndicator.setUnderstanding();
      // Use non-blocking speech so transcription can start immediately
      narrationService.announceStep('processing', {}, false);
      elements.transcript.innerHTML = '<span class="placeholder">Transcribing...</span>';

      console.log('[Voice] Calling local transcription service...');
      const result = await sttService.transcribe(audioBlob);
      console.log('[Voice] Transcription result:', result.text);
      transcript = result.text;
    } else {
      console.log('[Voice] Using Web Speech API (Online Mode)');
      // Step 1: Listening (Web Speech API)
      progressIndicator.setListening();
      await narrationService.announceStep('listening');
      elements.transcript.innerHTML = '<span class="placeholder">Listening...</span>';

      // Start speech recognition
      transcript = await new Promise((resolve, reject) => {
        let finalTranscript = '';

        sttService.onResult = (result) => {
          elements.transcript.textContent = result.interim || result.final;
          if (result.isFinal && result.final) {
            finalTranscript = result.final;
          }
        };

        sttService.onEnd = () => {
          if (finalTranscript) {
            resolve(finalTranscript);
          } else {
            reject(new Error('No speech detected'));
          }
        };

        sttService.onError = (error) => {
          reject(new Error(`Speech recognition error: ${error}`));
        };

        sttService.start();

        // Timeout after 15 seconds
        setTimeout(() => {
          sttService.stop();
        }, 15000);
      });
    }

    // Step 2: Understanding (Continued for both modes)
    progressIndicator.setUnderstanding();
    // Non-blocking announcement of what was heard
    narrationService.announceStep('transcribed', transcript, false);

    elements.transcript.textContent = transcript;

    // Parse intent
    // Parse intent
    // Non-blocking announcement of parsing
    narrationService.announceStep('parsing', {}, false);

    console.log('[Voice] Getting Git context...');
    const context = await gitService.getContext();
    console.log('[Voice] Context retreived, parsing intent...');

    const intent = intentService.parse(transcript, context);
    console.log('[Voice] Intent parsed:', intent);

    if (intent.action === 'unknown') {
      await narrationService.speak(`I didn't understand that. ${intentService.getHelpText().split('\n')[0]}`);
      resetVoiceUI();
      return;
    }

    if (intent.action === 'help') {
      await narrationService.speak(intentService.getHelpText());
      resetVoiceUI();
      return;
    }

    await narrationService.announceStep('commandIdentified', intent.description);

    // Show command preview
    currentCommand = intent;
    elements.commandPreview.style.display = 'block';
    elements.previewAction.textContent = intent.action.toUpperCase();
    elements.previewCommand.textContent = intent.command;
    elements.executeBtn.disabled = false;
    elements.explainBtn.disabled = false;

    // Auto-execute safe commands or wait for confirmation
    if (intent.safe) {
      await executeCommand(intent);
    } else {
      await narrationService.speak('This command will modify the remote repository. Say "execute" or click the button to proceed.');
      resetVoiceUI();
    }

    resetVoiceUI();
  } catch (error) {
    console.error('[Voice] Command flow failed:', error);
    await narrationService.announceStep('error', error.message);

    const isNetworkError = error.message.toLowerCase().includes('network');
    const isNoAudio = error.message.includes('No audio recorded') || error.message.includes('No speech detected');

    showError({
      title: 'Voice Command Issue',
      message: error.message,
      explanation: isNetworkError
        ? 'Speech recognition requires an active internet connection to communicate with the browser\'s transcription service.'
        : isNoAudio
          ? 'I didn\'t hear anything. This could be because the microphone sensitivity is too low or your microphone is muted.'
          : 'There was a technical problem processing your voice command.',
      solution: isNoAudio
        ? 'Try moving the <strong>Sensitivity slider</strong> in Settings to the left (closer to 0.01), or check your microphone settings.'
        : isNetworkError
          ? 'Please check your internet connection, or <strong>download local models in Settings</strong> for offline voice commands.'
          : 'Please try again. If this persists, try restarting the application.'
    });
    resetVoiceUI();
  }
}

async function executeCommand(intent) {
  // Step 3: Executing
  progressIndicator.setExecuting();

  // Show learning modal
  if (isLearningMode) {
    const commandData = explainer.explainCommand(intent.command);
    commandModal.show({
      ...commandData,
      description: `Executing: ${intent.description}`,
      tip: explainer.getTipOfTheDay()
    });
  }

  // Narrate the operation
  const narrator = await narrationService.narrateGitOperation(intent.action, intent.args || {});

  try {
    let result;

    // Execute based on action type
    switch (intent.action) {
      case 'status':
        result = await gitService.getStatus();
        if (result.success) {
          displayGitStatus(result);
        }
        break;

      case 'commit':
        // First add, then commit
        await gitService.add('.');
        result = await gitService.commit(intent.args?.message || 'Update');
        break;

      case 'push':
        result = await gitService.push(intent.args?.remote, intent.args?.branch);
        break;

      case 'pull':
        result = await gitService.pull(intent.args?.remote, intent.args?.branch);
        break;

      case 'add':
        result = await gitService.add(intent.args?.files);
        break;

      case 'branch':
        result = await gitService.createBranch(intent.args?.name);
        break;

      case 'checkout':
        result = await gitService.checkout(intent.args?.branch);
        break;

      case 'log':
        result = await gitService.getLog();
        break;

      case 'diff':
        result = await gitService.getDiff();
        break;

      case 'merge':
        result = await gitService.merge(intent.args?.branch);
        break;

      case 'stash':
        result = await gitService.stash(intent.args?.action, intent.args?.name);
        break;

      default:
        result = { success: false, error: 'Unknown action' };
    }

    // Update modal with output
    if (isLearningMode && result) {
      commandModal.updateOutput(result.output || 'Command completed');
    }

    // Step 4: Complete
    progressIndicator.setComplete();

    if (result?.success) {
      if (narrator?.success) {
        await narrator.success(result.data || {});
      }

      // Refresh status after mutations
      if (['commit', 'add', 'checkout', 'pull', 'push'].includes(intent.action)) {
        await refreshGitStatus();
      }

      if (isLearningMode) {
        await narrationService.announceStep('learningPrompt');
      }
    } else {
      await narrationService.announceStep('error', result?.error || 'Unknown error');

      if (isLearningMode) {
        const errorInfo = explainer.getEducationalError(detectErrorType(result?.error || ''));
        if (errorInfo) {
          commandModal.showError({
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
    console.error('Execution error:', error);
    await narrationService.announceStep('error', error.message);

    if (isLearningMode) {
      commandModal.showError({
        title: 'Execution Error',
        message: error.message,
        explanation: 'An error occurred while running the Git command.',
        tip: 'Check the repository state and try again.',
        command: intent.command
      });
    }
  }

  resetVoiceUI();
}

function detectErrorType(errorMessage) {
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

async function executeCurrentCommand() {
  if (currentCommand) {
    await executeCommand(currentCommand);
  }
}

function explainCurrentCommand() {
  if (currentCommand && isLearningMode) {
    const commandData = explainer.explainCommand(currentCommand.command);
    commandModal.show({
      ...commandData,
      description: `About: ${currentCommand.description}`,
      tip: explainer.getTipOfTheDay()
    });
  }
}

function cancelCommand() {
  sttService.abort();
  currentCommand = null;
  narrationService.announceStep('cancelled');
  resetVoiceUI();
}

function resetVoiceUI() {
  isProcessing = false;

  // Stop services and release resources
  sttService.stop();
  audioService.stopListening();
  audioService.cleanup();

  elements.voiceBtn.classList.remove('listening');
  elements.voiceBtn.innerHTML = '<span class="mic-icon">&#127908;</span> Start Voice Command';
  elements.cancelBtn.disabled = true;
}

function toggleLearningMode() {
  isLearningMode = !isLearningMode;
  commandModal.setLearningMode(isLearningMode);

  elements.learnModeToggle.innerHTML = `
    <span class="icon">&#128218;</span>
    Learning Mode: ${isLearningMode ? 'ON' : 'OFF'}
  `;

  if (isLearningMode) {
    narrationService.speak('Learning mode enabled. I will show you the commands I execute.');
  } else {
    narrationService.speak('Learning mode disabled.');
  }
}

function openSettings() {
  elements.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  elements.settingsModal.classList.add('hidden');
}

function saveSettings() {
  // Get settings values
  const verbosity = document.getElementById('verbosity')?.value || 'normal';
  const showTips = document.getElementById('show-tips')?.checked ?? true;
  const autoModal = document.getElementById('auto-modal')?.checked ?? true;
  const voiceMode = document.getElementById('voice-mode')?.value || 'online';

  // Apply settings
  narrationService.setVerbosity(verbosity);
  sttService.setUseLocalModel(voiceMode === 'offline');

  // Save to localStorage
  localStorage.setItem('gitvoice-settings', JSON.stringify({
    verbosity,
    showTips,
    autoModal,
    voiceMode,
    voiceSpeed: ttsService.rate,
    vadSensitivity: audioService.vadThreshold
  }));

  closeSettings();
  narrationService.speak('Settings saved.');
}

function showError(errorData) {
  document.getElementById('error-title').textContent = errorData.title || 'Error';
  document.getElementById('error-description').textContent = errorData.message || 'An error occurred';
  document.getElementById('error-explanation').textContent = errorData.explanation || '';
  document.getElementById('error-solution').textContent = errorData.solution || '';

  elements.errorModal.classList.remove('hidden');
}

function closeErrorModal() {
  elements.errorModal.classList.add('hidden');
}

// Load saved settings on startup
function loadSettings() {
  try {
    const saved = localStorage.getItem('gitvoice-settings');
    if (saved) {
      const settings = JSON.parse(saved);

      if (settings.voiceSpeed) {
        ttsService.setRate(settings.voiceSpeed);
        const speedInput = document.getElementById('voice-speed');
        if (speedInput) {
          speedInput.value = settings.voiceSpeed;
          document.getElementById('voice-speed-value').textContent = `${settings.voiceSpeed}x`;
        }
      }

      if (settings.vadSensitivity) {
        audioService.setVADThreshold(settings.vadSensitivity);
        const vadInput = document.getElementById('vad-sensitivity');
        if (vadInput) {
          vadInput.value = settings.vadSensitivity;
          document.getElementById('vad-sensitivity-value').textContent = settings.vadSensitivity;
        }
      }

      if (settings.verbosity) {
        narrationService.setVerbosity(settings.verbosity);
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
      }
    }

    // Always check network status on load to ensure correct initial mode
    updateVoiceModeBasedOnNetwork();

  } catch (error) {
    console.warn('Could not load settings:', error);
  }
}

// Load settings after services are initialized
setTimeout(loadSettings, 100);

// ============================================
// Practice Mode
// ============================================

function initializePracticeMode() {
  const practiceModeToggle = document.getElementById('practice-mode-toggle');
  if (practiceModeToggle) {
    practiceModeToggle.addEventListener('click', togglePracticeMode);
  }
}

function togglePracticeMode() {
  isPracticeMode = practiceMode.toggle();
  const btn = document.getElementById('practice-mode-toggle');

  if (btn) {
    if (isPracticeMode) {
      btn.classList.add('active');
      btn.innerHTML = '<span class="icon">&#127919;</span> Practice Mode: ON';
      narrationService.speak('Practice mode enabled. Commands will be simulated without executing.');
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span class="icon">&#127919;</span> Practice Mode';
      narrationService.speak('Practice mode disabled. Commands will be executed normally.');
    }
  }
}

// Override executeCommand to support practice mode
const originalExecuteCommand = executeCommand;
executeCommand = async function (intent) {
  if (isPracticeMode) {
    await executePracticeCommand(intent);
  } else {
    await originalExecuteCommand(intent);
  }
};

async function executePracticeCommand(intent) {
  progressIndicator.setExecuting();

  // Get simulation
  const context = await gitService.getContext();
  const simulation = await practiceMode.simulateCommand(intent.command, context);

  // Show in modal
  commandModal.showPracticeSimulation(simulation);

  // Narrate
  await narrationService.speak(
    `In practice mode. This command would ${simulation.wouldDo}. ${simulation.warning || ''}`
  );

  progressIndicator.setComplete();
  resetVoiceUI();
}

// ============================================
// Learning Overlay
// ============================================

function initializeLearningOverlay() {
  const learnGitBtn = document.getElementById('learn-git-btn');
  if (learnGitBtn) {
    learnGitBtn.addEventListener('click', () => {
      learningOverlay.show('basics');
    });
  }

  // Make executeVoiceCommand available globally for learning overlay
  window.executeVoiceCommand = async (commandText) => {
    // Parse and execute the command
    const context = await gitService.getContext();
    const intent = intentService.parse(commandText, context);
    if (intent.action !== 'unknown') {
      currentCommand = intent;
      await executeCommand(intent);
    }
  };
}

// ============================================
// Credential Management
// ============================================

async function initializeCredentials() {
  // Load configured services
  const services = await window.electronAPI.getConfiguredServices();
  updateCredentialStatus(services);

  // Load git user
  const gitUser = await window.electronAPI.getGitUser();
  if (gitUser.name) {
    document.getElementById('git-name').value = gitUser.name;
  }
  if (gitUser.email) {
    document.getElementById('git-email').value = gitUser.email;
  }

  // Pre-fill username if we have a service configured
  if (services.length > 0) {
    const defaultService = services.find(s => s.service === 'github') || services[0];
    if (defaultService.username) {
      elements.gitUsername.value = defaultService.username;
    }
  }

  // Check SSH keys
  const sshKeys = await window.electronAPI.checkSSHKeys();
  displaySSHKeys(sshKeys);

  // Bind credential events
  document.getElementById('save-token')?.addEventListener('click', saveCredential);
  document.getElementById('test-token')?.addEventListener('click', testCredential);
  document.getElementById('save-git-user')?.addEventListener('click', saveGitUser);
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
}

async function saveCredential() {
  const service = document.getElementById('git-service').value;
  const authType = elements.authType.value;
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
    const username = elements.gitUsername.value.trim();
    const password = elements.gitPassword.value.trim();

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

      // Clear sensitive fields
      if (authType === 'token') {
        document.getElementById('git-token').value = '';
      } else {
        elements.gitPassword.value = '';
      }

      // Update services list
      const services = await window.electronAPI.getConfiguredServices();
      updateCredentialStatus(services);
    } else {
      statusEl.innerHTML = `<span class="error">Error: ${result.error}</span>`;
    }
  } catch (error) {
    statusEl.innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
}

async function testCredential() {
  const statusEl = document.getElementById('credential-status');
  statusEl.innerHTML = '<span class="loading">Testing connection...</span>';

  try {
    const remoteResult = await window.electronAPI.getRemoteUrl();
    if (!remoteResult.success) {
      statusEl.innerHTML = '<span class="error">No remote URL configured</span>';
      return;
    }

    const testResult = await window.electronAPI.testConnection(remoteResult.url);
    if (testResult.success) {
      statusEl.innerHTML = '<span class="success">Connection successful!</span>';
    } else {
      statusEl.innerHTML = `<span class="error">Connection failed: ${testResult.error}</span>`;
    }
  } catch (error) {
    statusEl.innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
}

async function saveGitUser() {
  const name = document.getElementById('git-name').value;
  const email = document.getElementById('git-email').value;

  if (!name || !email) {
    alert('Please enter both name and email');
    return;
  }

  const result = await window.electronAPI.setGitUser({ name, email });
  if (result.success) {
    narrationService.speak('Git user configuration saved.');
  } else {
    alert('Error saving git user: ' + result.error);
  }
}

function updateCredentialStatus(services) {
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

function displaySSHKeys(keys) {
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

// ============================================
// Hotkey Management
// ============================================

async function initializeHotkey() {
  const hotkeyInput = document.getElementById('hotkey-input');
  const resetBtn = document.getElementById('reset-hotkey');
  const currentHotkeyEl = document.getElementById('current-hotkey');

  // Load current hotkey
  const currentHotkey = await window.electronAPI.getHotkey();
  if (currentHotkeyEl) {
    currentHotkeyEl.textContent = formatHotkey(currentHotkey);
  }

  if (hotkeyInput) {
    hotkeyInput.addEventListener('click', () => {
      hotkeyInput.value = 'Press new hotkey...';
      hotkeyInput.classList.add('recording');
    });

    hotkeyInput.addEventListener('keydown', async (e) => {
      if (!hotkeyInput.classList.contains('recording')) return;

      e.preventDefault();

      // Build hotkey string
      const parts = [];
      if (e.metaKey) parts.push('CommandOrControl');
      else if (e.ctrlKey) parts.push('Control');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      // Add the key
      if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        parts.push(e.key.toUpperCase());
      }

      if (parts.length >= 2) {
        const newHotkey = parts.join('+');
        const result = await window.electronAPI.setHotkey(newHotkey);

        if (result.success) {
          hotkeyInput.value = formatHotkey(newHotkey);
          currentHotkeyEl.textContent = formatHotkey(newHotkey);
          narrationService.speak('Hotkey updated.');
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
        narrationService.speak('Hotkey reset to default.');
      }
    });
  }
}

function formatHotkey(hotkey) {
  return hotkey
    .replace('CommandOrControl', 'Cmd/Ctrl')
    .replace('Control', 'Ctrl')
    .replace('+', '+');
}

// ============================================
// Microphone Management
// ============================================

async function initializeMicrophone() {
  const micSelect = document.getElementById('microphone-select');
  const testBtn = document.getElementById('test-mic');
  const levelEl = document.getElementById('mic-level');

  // Get available devices
  try {
    const devices = await audioService.getDevices();
    if (micSelect) {
      devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${micSelect.options.length}`;
        micSelect.appendChild(option);
      });

      micSelect.addEventListener('change', async (e) => {
        if (e.target.value) {
          await audioService.setDevice(e.target.value);
          narrationService.speak('Microphone changed.');
        }
      });
    }
  } catch (error) {
    console.error('Error getting audio devices:', error);
  }

  // Test microphone
  if (testBtn && levelEl) {
    testBtn.addEventListener('click', async () => {
      testBtn.textContent = 'Testing...';
      testBtn.disabled = true;

      // Monitor volume for 3 seconds
      const initialized = await audioService.initialize();
      if (initialized) {
        audioService.onVolumeChange = (volume) => {
          levelEl.style.width = `${volume * 100}%`;
        };

        await audioService.startListening();

        setTimeout(() => {
          audioService.stopListening();
          testBtn.textContent = 'Test';
          testBtn.disabled = false;
          audioService.onVolumeChange = null;
        }, 3000);
      } else {
        testBtn.textContent = 'Test';
        testBtn.disabled = false;
        alert('Could not access microphone');
      }
    });
  }
}

// ============================================
// Model Management (Offline Mode)
// ============================================

async function initializeModels() {
  const sttStatus = document.getElementById('stt-model-status');
  const ttsStatus = document.getElementById('tts-model-status');
  const downloadSttBtn = document.getElementById('download-stt');
  const downloadTtsBtn = document.getElementById('download-tts');

  // Check initial status
  await modelDownloader.checkDownloadedModels();
  updateModelUI();

  // Bind download events
  downloadSttBtn?.addEventListener('click', () => startModelDownload('stt'));
  downloadTtsBtn?.addEventListener('click', () => startModelDownload('tts'));

  // Set up progress callbacks for modelDownloader
  modelDownloader.onProgress = (modelType, progress, downloadedBytes) => {
    const container = document.getElementById(`${modelType}-progress-container`);
    const progressBar = document.getElementById(`${modelType}-progress-bar`);
    const percentage = document.getElementById(`${modelType}-percentage`);

    if (container) container.style.display = 'block';

    if (progress !== undefined && !isNaN(progress)) {
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (percentage) percentage.textContent = `${progress}%`;
    } else if (downloadedBytes !== undefined) {
      if (progressBar) progressBar.style.width = '100%'; // Indeterminate style
      if (progressBar) progressBar.classList.add('indeterminate');
      if (percentage) percentage.textContent = modelDownloader.formatBytes(downloadedBytes);
    }
  };

  modelDownloader.onComplete = (modelType) => {
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

    // Auto-hide progress after 3 seconds
    setTimeout(() => {
      if (container) container.style.display = 'none';
      updateModelUI();
    }, 3000);

    narrationService.speak(`${modelType.toUpperCase()} model is now ready for offline use.`);
  };

  modelDownloader.onError = (modelType, error) => {
    const statusText = document.getElementById(`${modelType}-download-text`);
    if (statusText) {
      statusText.textContent = `Error: ${error}`;
      statusText.style.color = 'var(--error-color)';
    }
  };

  function updateModelUI() {
    const statuses = modelDownloader.getModelStatus();

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
          ttsService.setUseLocalModel(true);
        }
        if (downloadTtsBtn) {
          downloadTtsBtn.disabled = statuses.tts.downloaded;
          downloadTtsBtn.textContent = statuses.tts.downloaded ? 'Downloaded' : 'Download';
        }
      }
    }
  }
}

async function startModelDownload(modelType) {
  const btn = document.getElementById(`download-${modelType}`);
  if (btn) btn.disabled = true;

  const container = document.getElementById(`${modelType}-progress-container`);
  if (container) container.style.display = 'block';

  try {
    await modelDownloader.downloadModel(modelType);
  } catch (error) {
    console.error(`Error downloading ${modelType} model:`, error);
    if (btn) btn.disabled = false;
  }
}

// ============================================
// Additional CSS for new features
// ============================================

function injectAdditionalStyles() {
  const styles = `
    /* Practice Mode */
    #practice-mode-toggle.active {
      background: var(--warning-color);
      color: white;
      border-color: var(--warning-color);
    }

    .side-effects ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    .side-effects li {
      margin: 5px 0;
      color: var(--text-color);
    }

    .practice-warning {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      padding: 10px 15px;
      border-radius: 4px;
      margin-top: 15px;
      color: #92400e;
    }

    /* Credential Status */
    .credential-status .loading {
      color: var(--info-color);
    }

    .credential-status .success {
      color: var(--success-color);
    }

    .credential-status .error {
      color: var(--error-color);
    }

    .credential-status .hint {
      color: var(--text-muted);
    }

    .credential-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      margin: 5px 0;
    }

    .service-name {
      font-weight: 600;
      text-transform: capitalize;
    }

    /* SSH Keys */
    .ssh-key-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      margin: 5px 0;
    }

    .key-type {
      background: var(--primary-color);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .key-fingerprint {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Hotkey Input */
    .hotkey-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    .hotkey-input.recording {
      border-color: var(--primary-color);
      background: #f0f4ff;
    }

    .setting-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 5px;
    }

    .setting-hint a {
      color: var(--primary-color);
    }

    /* Microphone Level */
    .mic-level-container {
      flex: 1;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .mic-level {
      height: 100%;
      background: var(--success-color);
      width: 0%;
      transition: width 0.1s ease;
    }

    /* Learning Overlay Styles */
    .learning-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2000;
    }

    .learning-overlay.hidden {
      display: none;
    }

    .learning-overlay .overlay-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
    }

    .learning-overlay .overlay-content {
      position: relative;
      background: white;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      margin: 5vh auto;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .learning-overlay .overlay-header {
      background: var(--gradient-primary);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .learning-overlay .overlay-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .learning-overlay .overlay-footer {
      padding: 15px 20px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      background: #f8f9fa;
    }

    .topic-nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .topic-btn {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .topic-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .concept-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }

    .concept-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid var(--primary-color);
    }

    .concept-card h4 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
    }

    .concept-card p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .workflow-steps {
      list-style: none;
      padding: 0;
    }

    .workflow-steps li {
      padding: 10px 15px;
      margin: 5px 0;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .command-list .command-item {
      display: flex;
      align-items: baseline;
      gap: 15px;
      padding: 10px;
      margin: 5px 0;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .command-list code {
      background: var(--terminal-bg);
      color: var(--terminal-text);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
    }

    .quiz-option {
      display: block;
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: white;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .quiz-option:hover:not(:disabled) {
      background: #f8f9fa;
    }

    .quiz-option.correct {
      background: #d1fae5;
      border-color: var(--success-color);
    }

    .quiz-option.incorrect {
      background: #fee2e2;
      border-color: var(--error-color);
    }

    .quiz-correct {
      color: var(--success-color);
      font-weight: 600;
    }

    .quiz-incorrect {
      color: var(--error-color);
    }

    .contextual-help {
      padding: 10px 0;
    }

    .contextual-help .help-title {
      color: var(--primary-color);
      margin-bottom: 10px;
    }

    .help-examples ul,
    .help-workflow ol,
    .help-errors ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    .help-related .related-commands {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .related-cmd {
      background: #f0f4ff;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// ============================================
// Permissions & Connectivity
// ============================================

async function initializePermissions() {
  console.log('Checking permissions...');
  const micStatusEl = document.getElementById('mic-status');
  const micText = micStatusEl?.querySelector('.status-text');

  // Microphone Permission
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
      showPermissionWarning('Microphone access is required for voice commands.');
    }
  } else {
    if (micStatusEl) {
      micStatusEl.classList.add('denied');
      if (micText) micText.textContent = 'Microphone: Denied';
    }
    showPermissionWarning('Microphone access is denied. Please enable it in System Settings.');
  }

  // Network Check
  await checkNetwork();
}

async function checkNetwork() {
  const netStatusEl = document.getElementById('network-status');
  const netText = netStatusEl?.querySelector('.status-text');

  if (!navigator.onLine) {
    if (netStatusEl) {
      netStatusEl.classList.add('offline');
      if (netText) netText.textContent = 'Network: Offline';
    }
    showConnectivityWarning('You are offline. Some features (cloud-based speech recognition) will be unavailable.');
    return false;
  }

  try {
    // Try to reach a reliable public endpoint to check for firewalls
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
    showConnectivityWarning('Network access appears restricted. Please check your firewall or proxy settings.');
    return false;
  }
}

function showPermissionWarning(message) {
  showError({
    title: 'Permission Required',
    message: message,
    explanation: 'GitVoice requires microphone access to process your voice commands.',
    solution: 'On macOS, go to System Settings > Privacy & Security > Microphone and ensure GitVoice is enabled.'
  });
}

function showConnectivityWarning(message) {
  console.warn('Connectivity Warning:', message);
}

