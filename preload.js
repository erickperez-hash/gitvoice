const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Repository management
  browseRepository: () => ipcRenderer.invoke('browse-repository'),
  getRepoPath: () => ipcRenderer.invoke('get-repo-path'),
  setRepoPath: (path) => ipcRenderer.invoke('set-repo-path', path),

  // Git operations
  gitStatus: () => ipcRenderer.invoke('git-status'),
  gitAdd: (files) => ipcRenderer.invoke('git-add', files),
  gitCommit: (message) => ipcRenderer.invoke('git-commit', message),
  gitPush: (options) => ipcRenderer.invoke('git-push', options),
  gitPull: (options) => ipcRenderer.invoke('git-pull', options),
  gitLog: (limit) => ipcRenderer.invoke('git-log', limit),
  gitCurrentBranch: () => ipcRenderer.invoke('git-current-branch'),
  gitBranch: (options) => ipcRenderer.invoke('git-branch', options),
  gitCheckout: (branch) => ipcRenderer.invoke('git-checkout', branch),
  gitClone: (options) => ipcRenderer.invoke('git-clone', options),
  gitMerge: (branch) => ipcRenderer.invoke('git-merge', branch),
  gitStash: (options) => ipcRenderer.invoke('git-stash', options),
  gitDiff: (options) => ipcRenderer.invoke('git-diff', options),
  gitExecute: (command, args) => ipcRenderer.invoke('git-execute', { command, args }),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Voice activation listener
  onVoiceActivate: (callback) => {
    ipcRenderer.on('voice-activate', () => callback());
  },

  // Voice feedback
  onVoiceFeedback: (callback) => {
    ipcRenderer.on('voice-feedback', (event, text) => callback(text));
  },

  // Credential management
  saveCredential: (data) => ipcRenderer.invoke('save-credential', data),
  getCredential: (service) => ipcRenderer.invoke('get-credential', service),
  removeCredential: (service) => ipcRenderer.invoke('remove-credential', service),
  getConfiguredServices: () => ipcRenderer.invoke('get-configured-services'),
  testConnection: (url) => ipcRenderer.invoke('test-connection', url),

  // Git user config
  getGitUser: () => ipcRenderer.invoke('get-git-user'),
  setGitUser: (data) => ipcRenderer.invoke('set-git-user', data),
  checkSSHKeys: () => ipcRenderer.invoke('check-ssh-keys'),
  getRemoteUrl: () => ipcRenderer.invoke('get-remote-url'),

  // Hotkey management
  getHotkey: () => ipcRenderer.invoke('get-hotkey'),
  setHotkey: (hotkey) => ipcRenderer.invoke('set-hotkey', hotkey),

  // Settings persistence
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // Model management (Offline Mode)
  checkModelStatus: (modelType) => ipcRenderer.invoke('check-model-status', modelType),
  downloadModel: (data) => ipcRenderer.invoke('download-model', data),
  transcribeLocal: (data) => ipcRenderer.invoke('transcribe-local', data),
  onModelDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('model-download-progress', subscription);
    return () => ipcRenderer.removeListener('model-download-progress', subscription);
  },

  // Permissions
  checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission')
});

// Expose clipboard API
contextBridge.exposeInMainWorld('clipboardAPI', {
  writeText: (text) => navigator.clipboard.writeText(text)
});
