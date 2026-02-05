// Constants - Centralized configuration and magic strings

const CONSTANTS = {
  // Timeouts (in milliseconds)
  TIMEOUTS: {
    GIT_STATUS: 3000,
    SPEECH_RECOGNITION: 15000,
    VAD_RECORDING: 30000,
    SILENCE_TIMEOUT: 1500,
    MIN_RECORDING_TIME: 500,
    NETWORK_CHECK: 3000,
    HOTKEY_DEBOUNCE: 100,
    SETTINGS_LOAD_DELAY: 100,
    MIC_TEST_DURATION: 3000,
    DOWNLOAD_COMPLETE_HIDE: 3000,
    AUTH_MODAL_CLOSE: 1000,
    COPY_FEEDBACK: 2000
  },

  // VAD Settings
  VAD: {
    DEFAULT_THRESHOLD: 0.02,
    FFT_SIZE: 2048,
    CHECK_INTERVAL: 40
  },

  // API URLs
  URLS: {
    GITHUB: {
      DEVICE_CODE: 'https://github.com/login/device/code',
      ACCESS_TOKEN: 'https://github.com/login/oauth/access_token',
      API_USER: 'https://api.github.com/user',
      TOKEN_SETTINGS: 'https://github.com/settings/tokens/new'
    },
    GITLAB: {
      API_USER: 'https://gitlab.com/api/v4/user',
      TOKEN_SETTINGS: 'https://gitlab.com/-/profile/personal_access_tokens'
    },
    BITBUCKET: {
      API_USER: 'https://api.bitbucket.org/2.0/user',
      TOKEN_SETTINGS: 'https://bitbucket.org/account/settings/app-passwords/'
    },
    NETWORK_CHECK: 'https://raw.githubusercontent.com/robots.txt',
    TEST_REPO: 'https://github.com/git/git.git'
  },

  // Default OAuth Client ID (GitHub CLI public ID)
  OAUTH: {
    DEFAULT_GITHUB_CLIENT_ID: '178c6fc778ccc68e1d6a'
  },

  // Default Settings
  DEFAULTS: {
    VERBOSITY: 'normal',
    VOICE_MODE: 'online',
    VOICE_SPEED: 1.0,
    SHOW_TIPS: true,
    AUTO_MODAL: true,
    HOTKEY: 'CommandOrControl+Shift+V'
  },

  // DOM Element IDs
  ELEMENTS: {
    // Main UI
    REPO_PATH: 'repo-path',
    BROWSE_REPO: 'browse-repo',
    REPO_STATUS: 'repo-status',
    GIT_STATUS: 'git-status',
    TRANSCRIPT: 'transcript',
    VOICE_TEXT: 'voice-text',
    VOICE_FEEDBACK: 'voice-feedback',
    COMMAND_PREVIEW: 'command-preview',
    PREVIEW_ACTION: 'preview-action',
    PREVIEW_COMMAND: 'preview-command',
    VOICE_BTN: 'voice-btn',
    EXECUTE_BTN: 'execute-btn',
    CANCEL_BTN: 'cancel-btn',
    EXPLAIN_BTN: 'explain-btn',
    LEARN_MODE_TOGGLE: 'learn-mode-toggle',
    PRACTICE_MODE_TOGGLE: 'practice-mode-toggle',
    SETTINGS_BTN: 'settings-btn',
    SETTINGS_MODAL: 'settings-modal',
    ERROR_MODAL: 'error-modal',

    // Clone
    CLONE_URL: 'clone-url',
    CLONE_REPO: 'clone-repo',
    STEP_CLONING: 'step-cloning',
    CLONING_CONNECTOR: 'cloning-connector',

    // Auth
    AUTH_TYPE: 'auth-type',
    TOKEN_AUTH_FIELDS: 'token-auth-fields',
    PASSWORD_AUTH_FIELDS: 'password-auth-fields',
    GIT_USERNAME: 'git-username',
    GIT_PASSWORD: 'git-password',
    GIT_TOKEN: 'git-token',
    GIT_SERVICE: 'git-service',
    CREDENTIAL_STATUS: 'credential-status',
    DEVICE_AUTH_MODAL: 'device-auth-modal',
    DEVICE_USER_CODE: 'device-user-code',
    AUTH_POLL_STATUS: 'auth-poll-status',
    GITHUB_CLIENT_ID: 'github-client-id',
    GITHUB_SIGNIN_BTN: 'github-signin-btn',

    // Settings
    VOICE_SPEED: 'voice-speed',
    VOICE_SPEED_VALUE: 'voice-speed-value',
    VAD_SENSITIVITY: 'vad-sensitivity',
    VAD_SENSITIVITY_VALUE: 'vad-sensitivity-value',
    VERBOSITY: 'verbosity',
    VOICE_MODE: 'voice-mode',
    SHOW_TIPS: 'show-tips',
    AUTO_MODAL: 'auto-modal',
    HOTKEY_INPUT: 'hotkey-input',
    CURRENT_HOTKEY: 'current-hotkey',
    RESET_HOTKEY: 'reset-hotkey',
    MICROPHONE_SELECT: 'microphone-select',
    TEST_MIC: 'test-mic',
    MIC_LEVEL: 'mic-level',

    // Models
    STT_MODEL_STATUS: 'stt-model-status',
    TTS_MODEL_STATUS: 'tts-model-status',
    DOWNLOAD_STT: 'download-stt',
    DOWNLOAD_TTS: 'download-tts',

    // Status
    MIC_STATUS: 'mic-status',
    NETWORK_STATUS: 'network-status',

    // Git User
    GIT_NAME: 'git-name',
    GIT_EMAIL: 'git-email',
    SAVE_GIT_USER: 'save-git-user',
    SSH_KEYS_LIST: 'ssh-keys-list',

    // Learning
    LEARN_GIT_BTN: 'learn-git-btn',

    // Errors
    ERROR_TITLE: 'error-title',
    ERROR_DESCRIPTION: 'error-description',
    ERROR_EXPLANATION: 'error-explanation',
    ERROR_SOLUTION: 'error-solution',
    CLOSE_ERROR: 'close-error',
    ERROR_CLOSE: 'error-close',
    CLOSE_SETTINGS: 'close-settings',
    SETTINGS_SAVE: 'settings-save'
  },

  // CSS Classes
  CLASSES: {
    HIDDEN: 'hidden',
    VALID: 'valid',
    INVALID: 'invalid',
    LISTENING: 'listening',
    ACTIVE: 'active',
    DOWNLOADED: 'downloaded',
    WARNING: 'warning',
    GRANTED: 'granted',
    DENIED: 'denied',
    ONLINE: 'online',
    OFFLINE: 'offline',
    RECORDING: 'recording',
    INDETERMINATE: 'indeterminate'
  },

  // Git Commands that trigger status refresh
  STATUS_REFRESH_COMMANDS: ['commit', 'add', 'checkout', 'pull', 'push'],

  // Supported Services
  SERVICES: ['github', 'gitlab', 'bitbucket', 'custom'],

  // Supported SSH Key Types
  SSH_KEY_TYPES: ['id_rsa', 'id_ed25519', 'id_ecdsa'],

  // Audio Settings
  AUDIO: {
    MIME_TYPE: 'audio/webm;codecs=opus',
    CHUNK_INTERVAL: 100
  },

  // Model Info
  MODELS: {
    STT: {
      NAME: 'Whisper Tiny (ONNX)',
      FOLDER: 'whisper-tiny.en',
      SIZE: '45MB'
    },
    TTS: {
      NAME: 'Kokoro TTS (ONNX)',
      FILENAME: 'kokoro.onnx',
      SIZE: '92MB'
    }
  }
};

// Freeze to prevent modifications
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.TIMEOUTS);
Object.freeze(CONSTANTS.VAD);
Object.freeze(CONSTANTS.URLS);
Object.freeze(CONSTANTS.URLS.GITHUB);
Object.freeze(CONSTANTS.URLS.GITLAB);
Object.freeze(CONSTANTS.URLS.BITBUCKET);
Object.freeze(CONSTANTS.OAUTH);
Object.freeze(CONSTANTS.DEFAULTS);
Object.freeze(CONSTANTS.ELEMENTS);
Object.freeze(CONSTANTS.CLASSES);
Object.freeze(CONSTANTS.AUDIO);
Object.freeze(CONSTANTS.MODELS);
Object.freeze(CONSTANTS.MODELS.STT);
Object.freeze(CONSTANTS.MODELS.TTS);

// Make available globally
window.CONSTANTS = CONSTANTS;
