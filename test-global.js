// Check if Electron API is available via other means
console.log('process.versions:', process.versions);
console.log('process.type:', process.type);
console.log('process.electronBinding:', typeof process.electronBinding);

// Try to access Electron via electronBinding
if (typeof process.electronBinding === 'function') {
  try {
    const app = process.electronBinding('app');
    console.log('Got app via electronBinding!', typeof app);
  } catch (e) {
    console.error('electronBinding error:', e.message);
  }
}

// Check module cache
console.log('\nModule cache keys containing "electron":');
Object.keys(require.cache).filter(k => k.includes('electron')).forEach(k => {
  console.log('  ', k);
  console.log('    exports type:', typeof require.cache[k].exports);
});
