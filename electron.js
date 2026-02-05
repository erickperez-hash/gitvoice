console.log('[Electron] Startup: Initializing application (Pre-requirements)...');
const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, systemPreferences, safeStorage } = require('electron');
require('dotenv').config();
console.log('[Electron] Startup: Dotenv configured.');
const path = require('path');
const fs = require('fs');
console.log('[Electron] Startup: Core modules loaded.');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
console.log('[Electron] Startup: Azure SDK loaded.');
const dugite = require('dugite');
console.log('[Electron] Startup: Dugite loaded.');
const GitProcess = dugite.GitProcess || dugite;

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
  console.log('[Electron] App ready. Initializing subsystems...');

  // Initialize Trampoline after app is ready to ensure safeStorage is available
  const Trampoline = require('./utils/trampoline');
  trampoline = new Trampoline();
  console.log('[Electron] Trampoline initialized.');

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

// Show save dialog for selecting clone destination
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    ...options,
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Execute Git command
ipcMain.handle('git-execute', async (event, { command, args }) => {
  if (!currentRepoPath) {
    return { success: false, error: 'No repository selected' };
  }

  // SEC-005: Git Command Validation (Whitelisting)
  const allowedCommands = ['status', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'clone', 'log', 'diff', 'merge', 'stash', 'fetch', 'remote', 'init'];

  // Extract base command (e.g., 'status' from 'git status')
  const baseCommand = command.trim().split(' ')[0] === 'git'
    ? command.trim().split(' ')[1]
    : command.trim().split(' ')[0];

  if (!allowedCommands.includes(baseCommand)) {
    console.warn(`[Security] Blocked unauthorized Git command: ${baseCommand}`);
    return { success: false, error: `Unauthorized command: ${baseCommand}` };
  }

  try {
    let remoteUrl = null;
    let modifiedArgs = [...args];

    // Detect remote URL for authentication
    if (args.includes('clone')) {
      remoteUrl = args.find(arg => arg.startsWith('http') || arg.startsWith('git@'));
      if (remoteUrl && remoteUrl.startsWith('http')) {
        const authUrl = trampoline.getAuthenticatedUrl(remoteUrl);
        const index = modifiedArgs.indexOf(remoteUrl);
        if (index !== -1) {
          modifiedArgs[index] = authUrl;
        }
      }
    } else if (currentRepoPath) {
      try {
        // Try getting the remote URL for the current branch first
        const branchRes = await GitProcess.exec(['symbolic-ref', '--short', 'HEAD'], currentRepoPath);
        let remoteName = 'origin';
        if (branchRes.exitCode === 0) {
          const branch = branchRes.stdout.trim();
          const remoteRes = await GitProcess.exec(['config', '--get', `branch.${branch}.remote`], currentRepoPath);
          if (remoteRes.exitCode === 0) {
            remoteName = remoteRes.stdout.trim();
          }
        }

        const remoteResult = await GitProcess.exec(['remote', 'get-url', remoteName], currentRepoPath);
        if (remoteResult.exitCode === 0) {
          remoteUrl = remoteResult.stdout.trim();
        } else if (remoteName !== 'origin') {
          // Fallback to origin
          const originResult = await GitProcess.exec(['remote', 'get-url', 'origin'], currentRepoPath);
          if (originResult.exitCode === 0) {
            remoteUrl = originResult.stdout.trim();
          }
        }
      } catch (e) {
        console.error('[Electron] Failed to detect remote URL:', e);
      }
    }

    const env = trampoline.getGitEnv(remoteUrl);
    env.GIT_TERMINAL_PROMPT = '0'; // Don't hang on auth prompts

    const result = await GitProcess.exec(modifiedArgs, currentRepoPath || process.cwd(), { env });

    // SEC-004: Cleanup askpass script after execution
    trampoline.cleanupAskPassScript();

    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      exitCode: result.exitCode
    };
  } catch (error) {
    trampoline.cleanupAskPassScript();
    return { success: false, error: error.message };
  }
});

// SafeStorage Handlers
ipcMain.handle('encrypt-string', async (event, plainText) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }
  return safeStorage.encryptString(plainText).toString('base64');
});

ipcMain.handle('decrypt-string', async (event, encryptedBase64) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }
  const buffer = Buffer.from(encryptedBase64, 'base64');
  return safeStorage.decryptString(buffer);
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
    console.log('[Electron] executing git-status...');

    // Create a timeout promise (10s for responsiveness)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('git status timed out')), 10000)
    );

    // Execute git status
    const gitPromise = GitProcess.exec(['status', '--short', '--branch'], currentRepoPath);

    // Race them
    const result = await Promise.race([gitPromise, timeoutPromise]);
    console.log('[Electron] git-status complete. Exit code:', result.exitCode);

    if (result.exitCode === 0) {
      // Parse output
      const output = result.stdout;

      const lines = output.split('\n');
      const branchLine = lines.find(l => l.startsWith('##'));
      const branch = branchLine ? branchLine.substring(3).split('...')[0] : 'HEAD';

      // Count states
      let modified = 0, staged = 0, untracked = 0;
      lines.forEach(line => {
        if (line.startsWith('##')) return;
        const status = line.substring(0, 2);
        // Git status format is XY. X is index, Y is working tree.
        if (status[0] !== ' ' && status[0] !== '?') staged++;
        if (status[1] !== ' ' && status[1] !== '?') modified++;
        if (status === '??') untracked++;
      });

      return {
        success: true,
        data: {
          branch,
          modified,
          staged,
          untracked,
          clean: lines.length <= 1
        }
      };
    } else {
      console.error('[Electron] git-status failed:', result.stderr);
      return { success: false, error: result.stderr };
    }
  } catch (error) {
    console.error('[Electron] git-status error:', error);
    return { success: false, error: error.message };
  }
});

// Fast branch check (fallback)
ipcMain.handle('git-current-branch', async (event) => {
  if (!currentRepoPath) return { success: false, error: 'No repository selected' };
  try {
    console.log('[Electron] executing fallback git-current-branch...');

    // Timeout for fallback (now 5s)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('git branch check timed out')), 5000)
    );

    const execPromise = GitProcess.exec(['symbolic-ref', '--short', 'HEAD'], currentRepoPath);

    const result = await Promise.race([execPromise, timeoutPromise]);

    if (result.exitCode === 0) {
      const branch = result.stdout.trim();
      console.log('[Electron] Fallback branch detected:', branch);
      return { success: true, branch };
    } else {
      // Try getting hash if detached head
      const hash = await GitProcess.exec(['rev-parse', '--short', 'HEAD'], currentRepoPath);
      return { success: hash.exitCode === 0, branch: hash.stdout.trim() };
    }
  } catch (error) {
    console.error('[Electron] git-current-branch error:', error);
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
  if (url.startsWith('https://') || url.startsWith('http://')) {
    await shell.openExternal(url);
  } else {
    console.warn('[Security] Blocked attempt to open non-http/https URL:', url);
  }
});

// Get current repository path
ipcMain.handle('get-repo-path', () => {
  return currentRepoPath;
});

// Set repository path
ipcMain.handle('set-repo-path', (event, repoPath) => {
  if (!repoPath || typeof repoPath !== 'string' || repoPath.includes('..') || repoPath.includes('~')) {
    console.warn('[Security] Invalid or suspicious repository path rejected:', repoPath);
    return { success: false, error: 'Invalid repository path' };
  }

  currentRepoPath = repoPath;
  return { success: true };
});

// ============================================
// Credential Management
// ============================================

// Trampoline is now initialized in app.whenReady()

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
      // Username/password authentication (For GitHub, password = PAT)
      if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
      }

      // Validate username/password by testing with a simple Git command
      // We pass 'password' as the token/password for validation
      const validation = await trampoline.validateUsernamePassword(service, username, password);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid credentials' };
      }

      // Save username/password credential
      // IMPORTANT: For GitHub, we treat the "password" (PAT) as a token 
      // so trampoline will actually use it for authentication.
      trampoline.setCredential(service, {
        authType: 'password', // Keep track it was entered as password
        token: password,      // But save as token so it works with git
        username,
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
  let downloaded = false;
  let modelPath = '';
  let needsUpdate = false;

  const exists = async (p) => {
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  };

  if (modelType === 'stt') {
    // Check for the core config files in the whisper-tiny.en folder
    const requiredFiles = [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'preprocessor_config.json',
      'generation_config.json',
      'onnx/encoder_model_quantized.onnx',
      'onnx/decoder_model_merged_quantized.onnx'
    ];

    const checks = await Promise.all(
      requiredFiles.map(file => exists(path.join(modelsDir, 'whisper-tiny.en', file)))
    );
    downloaded = checks.every(result => result);

    modelPath = path.join(modelsDir, 'whisper-tiny.en', 'config.json');

    // Check if user still has the old single-file model
    const oldPath = path.join(modelsDir, 'whisper-tiny.onnx');
    if (await exists(oldPath)) {
      needsUpdate = true;
    }
  } else if (modelType === 'tts') {
    modelPath = path.join(modelsDir, 'kokoro.onnx');
    downloaded = await exists(modelPath);
  }

  return {
    downloaded,
    needsUpdate,
    path: modelPath
  };
});

ipcMain.handle('download-model', async (event, { modelType, url, filename, totalFiles = 1, fileIndex = 0 }) => {
  const axios = require('axios').default || require('axios');
  const { pipeline } = require('stream');
  const { promisify } = require('util');
  const streamPipeline = promisify(pipeline);

  try {
    const targetPath = path.join(modelsDir, filename);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`[Download] ${modelType} (${fileIndex + 1}/${totalFiles}): ${url} -> ${targetPath}`);

    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 60000
    });

    const totalLength = parseInt(response.headers['content-length'], 10);
    let downloadedLength = 0;

    const writer = fs.createWriteStream(targetPath);

    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length;
      if (totalLength && totalLength > 0) {
        // Calculate combined progress if multi-file
        const fileProgress = (downloadedLength / totalLength) * 100;
        const overallProgress = Math.round((fileIndex / totalFiles * 100) + (fileProgress / totalFiles));

        if (downloadedLength % (1024 * 1024) < chunk.length || overallProgress === 100) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('model-download-progress', { modelType, progress: overallProgress });
          }
        }
      }
    });

    await streamPipeline(response.data, writer);
    return { success: true, path: targetPath };

  } catch (error) {
    console.error(`[Download] Failed for ${modelType}:`, error.message);
    return { success: false, error: error.message };
  }
});

let transcriptionPipeline = null;

ipcMain.handle('transcribe-local', async (event, { audioData, modelPath }) => {
  try {
    console.log(`[Whisper] Local transcription requested (Audio length: ${audioData.length} samples)`);

    // Use dynamic import for transformers.js (ESM)
    console.log('[Whisper] Loading transformers.js...');
    const transformers = await import('@huggingface/transformers');
    const pipeline = transformers.pipeline || (transformers.default && transformers.default.pipeline);
    const env = transformers.env || (transformers.default && transformers.default.env);

    if (!env) {
      throw new Error('Transformers environment (env) is undefined. Initializing failed.');
    }

    // Configure for STRICT OFFLINE mode
    env.allowRemoteModels = false;
    env.localModelPath = modelsDir;

    // Disable node-specific backends that might trigger sharp loading
    env.backends.onnx.wasm.numThreads = 1;
    console.log('[Whisper] transformers.js loaded.');

    // Verify audio data
    let maxAmp = 0;
    for (let i = 0; i < audioData.length; i += 100) { // Check every 100th sample for speed
      const val = Math.abs(audioData[i]);
      if (val > maxAmp) maxAmp = val;
    }
    console.log(`[Whisper] Received Audio: Max Amp=${maxAmp.toFixed(4)}, Length=${audioData.length}`);

    // Initialize pipeline if not already done
    if (!transcriptionPipeline) {
      console.log(`[Whisper] Initializing Whisper Tiny engine from: ${modelsDir}`);

      try {
        // We look for 'whisper-tiny.en' in the modelsDir
        transcriptionPipeline = await pipeline('automatic-speech-recognition', 'whisper-tiny.en', {
          dtype: 'q8', // v3 use dtype for quantization
        });
        console.log('[Whisper] Engine ready.');
      } catch (loadError) {
        console.error('[Whisper] Initialization failed:', loadError);
        return {
          success: false,
          error: `Offline model files are incomplete or missing. Please re-download models in settings. (Internal: ${loadError.message})`
        };
      }
    }

    // Run transcription with timeout
    console.log('[Whisper] Inference starting...');

    // Ensure data is Float32Array for transformers.js
    // Ensure data is Float32Array for transformers.js
    console.log(`[Whisper] audioData type: ${typeof audioData}, constructor: ${audioData?.constructor?.name}, length: ${audioData?.length}`);

    let inputTensor;
    if (audioData instanceof Float32Array) {
      inputTensor = audioData;
    } else if (Array.isArray(audioData) || (audioData && typeof audioData === 'object' && 'length' in audioData)) {
      console.log('[Whisper] Converting audioData to Float32Array...');
      inputTensor = Float32Array.from(audioData);
    } else {
      inputTensor = new Float32Array(audioData);
    }

    console.log(`[Whisper] inputTensor length: ${inputTensor.length}`);

    // Run transcription with minimal options (defaults are best for .en models)
    const transcriptionPromise = transcriptionPipeline(inputTensor);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transcription timed out after 30s')), 30000)
    );

    // Race against timeout
    const result = await Promise.race([transcriptionPromise, timeoutPromise]);

    console.log(`[Whisper] Transcription complete: "${result.text}"`);

    return {
      success: true,
      text: result.text ? result.text.trim() : '',
      confidence: 1.0
    };
  } catch (error) {
    console.error('[Whisper] General error:', error);
    return { success: false, error: `Local Transcription Error: ${error.message}` };
  }
});

let ttsPipeline = null;

ipcMain.handle('tts-local', async (event, { text, modelPath }) => {
  try {
    console.log(`[Kokoro] Local TTS requested for text: "${text}"`);

    // Use dynamic import for transformers.js (ESM)
    const transformers = await import('@huggingface/transformers');
    const pipeline = transformers.pipeline || (transformers.default && transformers.default.pipeline);
    const env = transformers.env || (transformers.default && transformers.default.env);

    // Configure for STRICT OFFLINE mode
    env.allowRemoteModels = false;
    env.localModelPath = modelsDir;
    env.backends.onnx.wasm.numThreads = 1;

    // Initialize pipeline if not already done
    if (!ttsPipeline) {
      console.log(`[Kokoro] Initializing Kokoro TTS engine from: ${modelsDir}`);
      try {
        // We look for 'kokoro' model in the modelsDir
        // Note: The specific model name should match how it's saved in modelsDir
        ttsPipeline = await pipeline('text-to-speech', 'kokoro', {
          dtype: 'fp32', // Kokoro usually needs fp32 or fp16
        });
        console.log('[Kokoro] Engine ready.');
      } catch (loadError) {
        console.error('[Kokoro] Initialization failed:', loadError);
        return {
          success: false,
          error: `Offline TTS model files are incomplete or missing. (Internal: ${loadError.message})`
        };
      }
    }

    // Run synthesis
    console.log('[Kokoro] Synthesis starting...');
    const result = await ttsPipeline(text, {
      voice: 'af_heart', // Default voice for Kokoro in Transformers.js
    });

    console.log('[Kokoro] Synthesis complete.');

    // Convert result.audio (Float32Array) to Int16 PCM Array for consistency with Azure return
    const floatData = result.audio;
    const int16Data = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const audioDataArray = Array.from(new Uint8Array(int16Data.buffer));

    return {
      success: true,
      audioData: audioDataArray
    };
  } catch (error) {
    console.error('[Kokoro] General error:', error);
    return { success: false, error: `Local TTS Error: ${error.message}` };
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

// GitHub Auth Device Flow
const githubAuthService = require('./services/github-auth-service');

ipcMain.handle('github-auth-start', async (event, clientId) => {
  try {
    githubAuthService.setClientId(clientId);
    return await githubAuthService.initiateDeviceFlow();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('github-auth-poll', async (event, { deviceCode, interval }) => {
  try {
    const token = await githubAuthService.pollForToken(deviceCode, interval);
    return { success: true, token };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// Azure Speech Services
// ============================================

function getAzureConfig() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return null;
  }

  return { key, region };
}

ipcMain.handle('azure-get-config', async () => {
  const config = getAzureConfig();
  return {
    configured: !!config,
    region: config?.region
  };
});

ipcMain.handle('azure-stt-transcribe', async (event, { audioData, sampleRate = 16000 }) => {
  const config = getAzureConfig();
  if (!config) {
    return { success: false, error: 'Azure Speech credentials not configured' };
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
    speechConfig.speechRecognitionLanguage = "en-US";

    // Audio format: Mono, 16-bit PCM, 16000Hz
    const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Convert array of 16-bit integers to a proper Buffer
    const int16Array = Int16Array.from(audioData);
    const buffer = Buffer.from(int16Array.buffer);

    pushStream.write(buffer);
    pushStream.close();

    return new Promise((resolve) => {
      recognizer.recognizeOnceAsync(result => {
        recognizer.close();
        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
          resolve({ success: true, text: result.text });
        } else if (result.reason === sdk.ResultReason.NoMatch) {
          resolve({ success: true, text: '', noMatch: true });
        } else {
          resolve({ success: false, error: `Speech recognition failed: ${result.errorDetails}` });
        }
      }, err => {
        recognizer.close();
        resolve({ success: false, error: err.message });
      });
    });
  } catch (error) {
    console.error('[Azure] STT Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('azure-tts-speak', async (event, { text, voiceName = "en-US-AndrewNeural" }) => {
  const config = getAzureConfig();
  if (!config) {
    return { success: false, error: 'Azure Speech credentials not configured' };
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
    speechConfig.speechSynthesisVoiceName = voiceName;
    // Set output format to 16khz 16bit mono PCM for efficiency
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;

    // Use PullAudioOutputStream to capture the synthesized audio
    const pullStream = sdk.AudioOutputStream.createPullStream();
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    return new Promise((resolve) => {
      synthesizer.speakTextAsync(text, result => {
        synthesizer.close();
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          // Convert audio data to Array for IPC
          const audioBuffer = result.audioData;
          const audioDataArray = Array.from(new Uint8Array(audioBuffer));
          resolve({ success: true, audioData: audioDataArray });
        } else {
          resolve({ success: false, error: `Synthesis failed: ${result.errorDetails}` });
        }
      }, err => {
        synthesizer.close();
        resolve({ success: false, error: err.message });
      });
    });
  } catch (error) {
    console.error('[Azure] TTS Error:', error);
    return { success: false, error: error.message };
  }
});
