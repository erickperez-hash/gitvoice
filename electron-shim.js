// Electron Shim - Workaround for module resolution issue
// This file attempts to access the Electron API by various means

// Method 1: Try to access Electron via process internals
if (process.versions && process.versions.electron) {
  // We're definitely inside Electron

  // Try method 1: Check if there's a way to access the binding
  if (typeof process.atomBinding === 'function') {
    try {
      const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, systemPreferences } = process.atomBinding('electron');
      module.exports = { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, systemPreferences };
      return;
    } catch (e) {
      // Continue to next method
    }
  }

  // Try method 2: Access via process._linkedBinding
  if (typeof process._linkedBinding === 'function') {
    try {
      const electron = process._linkedBinding('electron');
      if (electron && electron.app) {
        module.exports = electron;
        return;
      }
    } catch (e) {
      // Continue to next method
    }
  }

  // Try method 3: See if it's available on the global object
  if (global.electronAPI || global.electron) {
    module.exports = global.electronAPI || global.electron;
    return;
  }

  // Try method 4: Use native require from a non-node_modules context
  const Module = require('module');
  const oldNodeModulePaths = Module._nodeModulePaths;
  try {
    // Temporarily disable node_modules lookup
    Module._nodeModulePaths = function() { return []; };
    const electron = Module._load('electron', module, false);
    Module._nodeModulePaths = oldNodeModulePaths;

    if (electron && typeof electron === 'object' && electron.app) {
      module.exports = electron;
      return;
    }
  } catch (e) {
    Module._nodeModulePaths = oldNodeModulePaths;
  }
}

// If all methods failed, throw a helpful error
throw new Error(`
Could not load Electron API.
- process.versions.electron: ${process.versions?.electron || 'undefined'}
- process.type: ${process.type || 'undefined'}
- process.atomBinding: ${typeof process.atomBinding}
- process._linkedBinding: ${typeof process._linkedBinding}

This usually means there's a module resolution conflict with node_modules/electron.
`);
