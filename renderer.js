// GitVoice - Main Renderer Process
// This file orchestrates the application by initializing and connecting modules

// Service instances
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

// Controller instances
let uiController;
let settingsManager;
let voiceController;
let credentialsManager;
let repositoryController;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Inject additional styles
  injectAdditionalStyles();

  // Initialize services first (these are from services/ folder)
  initializeServices();

  // Initialize controllers (these are from controllers/ folder)
  initializeControllers();

  // Bind all events
  bindEvents();

  // Initialize sub-systems
  initializeLearningOverlay();

  // Run async initializations
  await settingsManager.initializePermissions();
  await repositoryController.checkInitialState();
  await credentialsManager.initialize();
  await settingsManager.initializeHotkey();
  await settingsManager.initializeMicrophone();
  await settingsManager.initializeModels();

  // Load settings after everything is ready
  setTimeout(() => settingsManager.loadSettings(), 100);

  // Check STT availability
  checkSTTAvailability();
});

function initializeServices() {
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

function initializeControllers() {
  // Initialize UI controller first as others depend on it
  uiController = new UIController();
  const elements = uiController.initializeElements();

  // Create shared services object for controllers
  const services = {
    gitService,
    audioService,
    sttService,
    ttsService,
    intentService,
    narrationService,
    commandModal,
    progressIndicator,
    explainer,
    practiceMode,
    modelDownloader,
    uiController
  };

  // Initialize other controllers
  settingsManager = new SettingsManager(services);
  voiceController = new VoiceController(services);
  credentialsManager = new CredentialsManager(services);
  repositoryController = new RepositoryController(services);
}

function bindEvents() {
  const elements = uiController.elements;

  // Repository events
  repositoryController.bindRepositoryEvents(elements);

  // Voice events
  voiceController.bindVoiceEvents(elements);

  // Settings events
  settingsManager.bindSettingsEvents(elements);

  // Credential events
  credentialsManager.bindCredentialEvents(elements);

  // Error modal events
  document.getElementById('close-error')?.addEventListener('click', () => uiController.closeErrorModal());
  document.getElementById('error-close')?.addEventListener('click', () => uiController.closeErrorModal());
}

function initializeLearningOverlay() {
  const learnGitBtn = document.getElementById('learn-git-btn');
  if (learnGitBtn) {
    learnGitBtn.addEventListener('click', () => {
      learningOverlay.show('basics');
    });
  }
}

function checkSTTAvailability() {
  if (!sttService.isAvailable()) {
    uiController.showError({
      title: 'Speech Recognition Not Available',
      message: 'Your browser does not support speech recognition.',
      explanation: 'GitVoice requires speech recognition to convert your voice to text.',
      solution: 'Please use Chrome or Edge browser for full functionality.'
    });
  }
}

// Export for compatibility with any external scripts
window.gitService = gitService;
window.audioService = audioService;
window.sttService = sttService;
window.voiceController = voiceController;
window.repositoryController = repositoryController;
