const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const GitProcess = require('dugite');

let mainWindow;
let currentRepoPath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Register global shortcut for voice activation
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    mainWindow.webContents.send('voice-activate');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers

// Browse for repository
ipcMain.handle('browse-repository', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];

    // Verify it's a Git repository
    try {
      const gitResult = await GitProcess.exec(['rev-parse', '--git-dir'], repoPath);
      if (gitResult.exitCode === 0) {
        currentRepoPath = repoPath;
        return { success: true, path: repoPath };
      } else {
        return { success: false, error: 'Not a Git repository' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'No directory selected' };
});

// Execute Git command
ipcMain.handle('git-execute', async (event, { command, args }) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(args, currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      exitCode: result.exitCode
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Permission Management
ipcMain.handle('check-microphone-permission', async () => {
  if (process.platform !== 'darwin') return 'granted';
  try {
    return systemPreferences.getMediaAccessStatus('microphone');
  } catch (e) {
    return 'denied';
  }
});

ipcMain.handle('request-microphone-permission', async () => {
  if (process.platform !== 'darwin') return true;
  try {
    return await systemPreferences.askForMediaAccess('microphone');
  } catch (e) {
    return false;
  }
});

// Get repository status
ipcMain.handle('git-status', async () => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(['status', '--short', '--branch'], currentRepoPath);

    // Parse status output
    const lines = result.stdout.split('\n').filter(l => l.trim());
    const branchLine = lines[0] || '';
    const branch = branchLine.replace('## ', '').split('...')[0];

    const modified = lines.filter(l => l.startsWith(' M') || l.startsWith('M ')).length;
    const staged = lines.filter(l => l.startsWith('A ') || l.startsWith('M ') || l.startsWith('D ')).length;
    const untracked = lines.filter(l => l.startsWith('??')).length;

    return {
      success: result.exitCode === 0,
      output: result.stdout,
      data: {
        branch,
        modified,
        staged,
        untracked,
        clean: lines.length <= 1
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git add
ipcMain.handle('git-add', async (event, files = '.') => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const args = ['add'];
    if (Array.isArray(files)) {
      args.push(...files);
    } else {
      args.push(files);
    }

    const result = await GitProcess.exec(args, currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git ${args.join(' ')}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git commit
ipcMain.handle('git-commit', async (event, message) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(['commit', '-m', message], currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git commit -m "${message}"`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git push
ipcMain.handle('git-push', async (event, { remote = 'origin', branch } = {}) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    // Get current branch if not specified
    if (!branch) {
      const branchResult = await GitProcess.exec(['rev-parse', '--abbrev-ref', 'HEAD'], currentRepoPath);
      branch = branchResult.stdout.trim();
    }

    // Get remote URL and authentication environment
    const remoteResult = await GitProcess.exec(['remote', 'get-url', remote], currentRepoPath);
    const remoteUrl = remoteResult.stdout.trim();
    const env = trampoline.getGitEnv(remoteUrl);

    const result = await GitProcess.exec(['push', remote, branch], currentRepoPath, { env });
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git push ${remote} ${branch}`,
      data: { remote, branch }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git pull
ipcMain.handle('git-pull', async (event, { remote = 'origin', branch } = {}) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    if (!branch) {
      const branchResult = await GitProcess.exec(['rev-parse', '--abbrev-ref', 'HEAD'], currentRepoPath);
      branch = branchResult.stdout.trim();
    }

    // Get remote URL and authentication environment
    const remoteResult = await GitProcess.exec(['remote', 'get-url', remote], currentRepoPath);
    const remoteUrl = remoteResult.stdout.trim();
    const env = trampoline.getGitEnv(remoteUrl);

    const result = await GitProcess.exec(['pull', remote, branch], currentRepoPath, { env });
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git pull ${remote} ${branch}`,
      data: { remote, branch }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git log
ipcMain.handle('git-log', async (event, limit = 10) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(['log', '--oneline', `-n${limit}`], currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      command: `git log --oneline -n${limit}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git branch
ipcMain.handle('git-branch', async (event, { name, delete: del, list } = {}) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    let args = ['branch'];
    let command = 'git branch';

    if (del) {
      args.push('-d', del);
      command = `git branch -d ${del}`;
    } else if (name) {
      args.push(name);
      command = `git branch ${name}`;
    }

    const result = await GitProcess.exec(args, currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git checkout
ipcMain.handle('git-checkout', async (event, branch) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(['checkout', branch], currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git checkout ${branch}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git clone
ipcMain.handle('git-clone', async (event, { url, targetPath }) => {
  try {
    const parentDir = path.dirname(targetPath);
    const repoName = path.basename(targetPath);

    // Use trampoline to get authenticated URL if needed
    const authenticatedUrl = trampoline.getAuthenticatedUrl(url);
    const env = trampoline.getGitEnv(url);

    const result = await GitProcess.exec(['clone', authenticatedUrl, repoName], parentDir, { env });

    if (result.exitCode === 0) {
      currentRepoPath = targetPath;
      return { success: true, path: targetPath };
    } else {
      return { success: false, error: result.stderr || 'Clone failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git merge
ipcMain.handle('git-merge', async (event, branch) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(['merge', branch], currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git merge ${branch}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git stash
ipcMain.handle('git-stash', async (event, { action, name } = {}) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const args = ['stash'];
    if (action === 'pop') args.push('pop');
    if (action === 'list') args.push('list');
    if (action === 'push' && name) args.push('push', '-m', name);

    const result = await GitProcess.exec(args, currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      command: `git ${args.join(' ')}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Git diff
ipcMain.handle('git-diff', async (event, options = {}) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const args = ['diff'];
    if (options.staged) {
      args.push('--staged');
    }
    if (options.file) {
      args.push(options.file);
    }

    const result = await GitProcess.exec(args, currentRepoPath);
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      command: `git ${args.join(' ')}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Get current repository path
ipcMain.handle('get-repo-path', () => {
  return currentRepoPath;
});

// Set repository path
ipcMain.handle('set-repo-path', (event, repoPath) => {
  currentRepoPath = repoPath;
  return { success: true };
});

// ============================================
// Credential Management
// ============================================

const Trampoline = require('./utils/trampoline');
const trampoline = new Trampoline();

// Save credential for a service (supports both token and username/password)
ipcMain.handle('save-credential', async (event, { service, token, username, password, email, authType = 'token' }) => {
  try {
    if (authType === 'token') {
      // Validate token first
      const validation = await trampoline.validateToken(service, token);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid token' };
      }

      // Save token credential
      trampoline.setCredential(service, {
        authType: 'token',
        token,
        username: validation.username || username,
        email: validation.email || email
      });

      return {
        success: true,
        username: validation.username,
        email: validation.email,
        name: validation.name
      };
    } else {
      // Username/password authentication
      if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
      }

      // Validate username/password by testing with a simple Git command
      const validation = await trampoline.validateUsernamePassword(service, username, password);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid credentials' };
      }

      // Save username/password credential
      trampoline.setCredential(service, {
        authType: 'password',
        username,
        password,
        email: email || ''
      });

      return {
        success: true,
        username: username,
        email: email
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get credential for a service
ipcMain.handle('get-credential', (event, service) => {
  const cred = trampoline.getCredential(service);
  if (cred) {
    return {
      success: true,
      username: cred.username,
      email: cred.email,
      hasToken: true,
      savedAt: cred.savedAt
    };
  }
  return { success: false, hasToken: false };
});

// Remove credential
ipcMain.handle('remove-credential', (event, service) => {
  const removed = trampoline.removeCredential(service);
  return { success: removed };
});

// Get all configured services
ipcMain.handle('get-configured-services', () => {
  return trampoline.getConfiguredServices();
});

// Test connection to remote
ipcMain.handle('test-connection', async (event, remoteUrl) => {
  return await trampoline.testConnection(remoteUrl);
});

// Get Git user config
ipcMain.handle('get-git-user', async () => {
  return await trampoline.getGitUser();
});

// Set Git user config
ipcMain.handle('set-git-user', async (event, { name, email }) => {
  return await trampoline.configureGitUser(name, email);
});

// Check SSH keys
ipcMain.handle('check-ssh-keys', async () => {
  return await trampoline.checkSSHKey();
});

// ============================================
// Hotkey Management
// ============================================

let currentHotkey = 'CommandOrControl+Shift+V';

ipcMain.handle('get-hotkey', () => {
  return currentHotkey;
});

ipcMain.handle('set-hotkey', (event, newHotkey) => {
  try {
    // Unregister old hotkey
    globalShortcut.unregister(currentHotkey);

    // Register new hotkey
    const registered = globalShortcut.register(newHotkey, () => {
      mainWindow.webContents.send('voice-activate');
    });

    if (registered) {
      currentHotkey = newHotkey;
      return { success: true, hotkey: currentHotkey };
    } else {
      // Re-register old hotkey if new one fails
      globalShortcut.register(currentHotkey, () => {
        mainWindow.webContents.send('voice-activate');
      });
      return { success: false, error: 'Failed to register hotkey. It may be in use by another application.' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// Audio Device Management
// ============================================

ipcMain.handle('get-audio-devices', async () => {
  // This will be handled in renderer process using navigator.mediaDevices
  // Just return success to indicate the feature is available
  return { success: true };
});

// Settings Persistence
// ============================================

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return { success: true, settings: JSON.parse(data) };
    }
    return { success: true, settings: {} };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// Model Management (Offline Mode)
// ============================================

const modelsDir = path.join(app.getPath('userData'), 'models');

ipcMain.handle('check-model-status', async (event, modelType) => {
  const modelConfig = {
    stt: 'whisper-tiny.onnx',
    tts: 'kokoro.onnx'
  };

  const filename = modelConfig[modelType];
  if (!filename) return { downloaded: false };

  let modelPath = path.join(modelsDir, filename);
  let downloaded = fs.existsSync(modelPath);
  let needsUpdate = false;

  // Check for incompatible .bin format if .onnx is missing
  if (!downloaded && modelType === 'stt') {
    const binPath = path.join(modelsDir, 'whisper-tiny.bin');
    if (fs.existsSync(binPath)) {
      needsUpdate = true;
    }
  }

  return {
    downloaded,
    needsUpdate,
    path: modelPath
  };
});

ipcMain.handle('download-model', async (event, { modelType, url, filename }) => {
  try {
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const targetPath = path.join(modelsDir, filename);
    const axios = require('axios');

    // Check if platform supports downloading
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    const totalLength = response.headers['content-length'];
    let downloadedLength = 0;

    const writer = fs.createWriteStream(targetPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        downloadedLength += chunk.length;
        const progress = Math.round((downloadedLength / totalLength) * 100);
        mainWindow.webContents.send('model-download-progress', { modelType, progress });
      });

      writer.on('finish', () => resolve({ success: true, path: targetPath }));
      writer.on('error', (err) => {
        fs.unlinkSync(targetPath);
        reject(err);
      });
    });
  } catch (error) {
    let errorMessage = error.message;
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.toLowerCase().includes('network')) {
      errorMessage = `Network connectivity issue detected (${error.code || 'Network Error'}). Please check your internet connection or firewall settings. The application needs access to huggingface.co to download AI models.`;
    }
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('transcribe-local', async (event, { audioBuffer, modelPath }) => {
  try {
    console.log(`Local transcription requested with model: ${modelPath}`);

    // Ensure model exists
    if (!fs.existsSync(modelPath)) {
      return { success: false, error: 'Model file not found at expected path.' };
    }

    // Since a full ONNX Whisper implementation is complex and requires multiple files 
    // (encoder, decoder, tokenizer), we are currently providing a bridge to the intent parser.
    // In a future update, we will integrate @xenova/transformers for full offline support.

    // For now, to allow testing the offline flow without network errors:
    return {
      success: true,
      text: "simulation: status", // Placeholder for testing the flow
      confidence: 1.0,
      isSimulation: true
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// Get remote URL from repository
// ============================================

ipcMain.handle('get-remote-url', async () => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  try {
    const result = await GitProcess.exec(['remote', 'get-url', 'origin'], currentRepoPath);
    return {
      success: result.exitCode === 0,
      url: result.stdout.trim()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
