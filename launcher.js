#!/usr/bin/env node

// Custom launcher that bypasses the electron npm wrapper
// and runs the Electron binary directly with proper setup

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the electron binary path
const electronPath = path.join(__dirname, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');

if (!fs.existsSync(electronPath)) {
  console.error('Electron binary not found at:', electronPath);
  process.exit(1);
}

// Set up environment to help with module resolution
const env = {
  ...process.env,
  // Tell Electron to look for built-in modules first
  ELECTRON_RUN_AS_NODE: undefined,
  // Remove any NODE_PATH that might interfere
  NODE_PATH: undefined,
  // Force Electron to use its own module resolution
  ELECTRON_ENABLE_LOGGING: '1'
};

// Launch Electron with our app
const args = [__dirname];

console.log('Launching Electron...');
console.log('Binary:', electronPath);
console.log('App dir:', __dirname);

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env
});

child.on('error', (err) => {
  console.error('Failed to start Electron:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Electron exited with signal ${signal}`);
  }
  process.exit(code || 0);
});
