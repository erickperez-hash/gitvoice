console.log('Test: Loading...');
console.log('process.versions.electron:', process.versions.electron);

const electronMod = require('electron');
console.log('require("electron") returned type:', typeof electronMod);

if (typeof electronMod === 'string') {
  console.error('ERROR: Got path string instead of Electron API:', electronMod);
  process.exit(1);
}

const { app } = electronMod;
console.log('app type:', typeof app);

if (app && app.whenReady) {
  console.log('SUCCESS: Electron API loaded correctly!');
  app.whenReady().then(() => {
    console.log('App is ready!');
    app.quit();
  });
} else {
  console.error('ERROR: app is not valid');
  process.exit(1);
}
