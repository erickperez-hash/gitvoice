// PracticeMode Tests

// Mock the window object for Node.js environment
global.window = {};

// Load the PracticeMode
const fs = require('fs');
const path = require('path');
const serviceCode = fs.readFileSync(
  path.join(__dirname, '../services/practice-mode.js'),
  'utf8'
);
eval(serviceCode);

describe('PracticeMode', () => {
  let practiceMode;

  beforeEach(() => {
    practiceMode = new PracticeMode();
  });

  describe('Toggle Functionality', () => {
    test('starts disabled', () => {
      expect(practiceMode.isEnabled()).toBe(false);
    });

    test('can be enabled', () => {
      practiceMode.enable();
      expect(practiceMode.isEnabled()).toBe(true);
    });

    test('can be disabled', () => {
      practiceMode.enable();
      practiceMode.disable();
      expect(practiceMode.isEnabled()).toBe(false);
    });

    test('toggle switches state', () => {
      expect(practiceMode.toggle()).toBe(true);
      expect(practiceMode.toggle()).toBe(false);
    });
  });

  describe('Status Simulation', () => {
    test('simulates git status', async () => {
      const result = await practiceMode.simulateCommand('git status', {
        branch: 'main',
        modified: 2,
        staged: 1
      });

      expect(result.command).toBe('git status');
      expect(result.safe).toBe(true);
      expect(result.sideEffects).toEqual([]);
      expect(result.output).toContain('On branch main');
    });
  });

  describe('Commit Simulation', () => {
    test('simulates git commit with message', async () => {
      const result = await practiceMode.simulateCommand(
        'git commit -m "test message"',
        { branch: 'main' }
      );

      expect(result.command).toContain('git commit');
      expect(result.safe).toBe(true);
      expect(result.sideEffects.length).toBeGreaterThan(0);
      expect(result.wouldDo).toContain('test message');
    });
  });

  describe('Push Simulation', () => {
    test('simulates git push', async () => {
      const result = await practiceMode.simulateCommand('git push origin main', {
        branch: 'main'
      });

      expect(result.command).toBe('git push origin main');
      expect(result.safe).toBe(false);
      expect(result.warning).toBeTruthy();
      expect(result.sideEffects.length).toBeGreaterThan(0);
    });

    test('push is marked as unsafe', async () => {
      const result = await practiceMode.simulateCommand('git push');
      expect(result.safe).toBe(false);
    });
  });

  describe('Pull Simulation', () => {
    test('simulates git pull', async () => {
      const result = await practiceMode.simulateCommand('git pull origin main');

      expect(result.command).toBe('git pull origin main');
      expect(result.safe).toBe(true);
      expect(result.sideEffects.length).toBeGreaterThan(0);
    });
  });

  describe('Branch Simulation', () => {
    test('simulates creating a branch', async () => {
      const result = await practiceMode.simulateCommand('git branch feature-x');

      expect(result.command).toBe('git branch feature-x');
      expect(result.safe).toBe(true);
      expect(result.wouldDo).toContain('feature-x');
    });

    test('simulates listing branches', async () => {
      const result = await practiceMode.simulateCommand('git branch', {
        branch: 'main'
      });

      expect(result.command).toBe('git branch');
      expect(result.output).toContain('main');
    });

    test('branch deletion is unsafe', async () => {
      const result = await practiceMode.simulateCommand('git branch -d feature');
      expect(result.safe).toBe(false);
    });
  });

  describe('Checkout Simulation', () => {
    test('simulates checkout to branch', async () => {
      const result = await practiceMode.simulateCommand('git checkout develop');

      expect(result.command).toBe('git checkout develop');
      expect(result.safe).toBe(true);
      expect(result.output).toContain('develop');
    });

    test('simulates checkout with -b flag', async () => {
      const result = await practiceMode.simulateCommand('git checkout -b new-branch');

      expect(result.command).toContain('-b');
      expect(result.wouldDo).toContain('new-branch');
    });
  });

  describe('Merge Simulation', () => {
    test('simulates merge', async () => {
      const result = await practiceMode.simulateCommand('git merge feature', {
        branch: 'main'
      });

      expect(result.command).toBe('git merge feature');
      expect(result.safe).toBe(false);
      expect(result.warning).toBeTruthy();
    });
  });

  describe('Stash Simulation', () => {
    test('simulates stash', async () => {
      const result = await practiceMode.simulateCommand('git stash');

      expect(result.command).toBe('git stash');
      expect(result.safe).toBe(true);
    });

    test('simulates stash pop', async () => {
      const result = await practiceMode.simulateCommand('git stash pop');

      expect(result.command).toBe('git stash pop');
      expect(result.safe).toBe(true);
    });

    test('simulates stash list', async () => {
      const result = await practiceMode.simulateCommand('git stash list');

      expect(result.command).toBe('git stash list');
      expect(result.output).toContain('stash@');
    });
  });

  describe('Log Simulation', () => {
    test('simulates log', async () => {
      const result = await practiceMode.simulateCommand('git log');

      expect(result.safe).toBe(true);
      expect(result.sideEffects).toEqual([]);
    });
  });

  describe('Diff Simulation', () => {
    test('simulates diff', async () => {
      const result = await practiceMode.simulateCommand('git diff');

      expect(result.command).toBe('git diff');
      expect(result.safe).toBe(true);
      expect(result.output).toContain('diff --git');
    });
  });

  describe('Unknown Command Simulation', () => {
    test('handles unknown commands', async () => {
      const result = await practiceMode.simulateCommand('git unknown-cmd');

      expect(result.safe).toBe(true);
      expect(result.warning).toBeTruthy();
    });
  });

  describe('History Management', () => {
    test('starts with empty history', () => {
      expect(practiceMode.getHistory()).toEqual([]);
    });

    test('adds commands to history', async () => {
      await practiceMode.simulateCommand('git status');
      await practiceMode.simulateCommand('git log');

      const history = practiceMode.getHistory();
      expect(history.length).toBe(2);
    });

    test('history entries have timestamps', async () => {
      await practiceMode.simulateCommand('git status');

      const history = practiceMode.getHistory();
      expect(history[0].timestamp).toBeTruthy();
    });

    test('history entries contain simulation data', async () => {
      await practiceMode.simulateCommand('git status');

      const history = practiceMode.getHistory();
      expect(history[0].simulation).toBeTruthy();
      expect(history[0].command).toBe('git status');
    });

    test('can clear history', async () => {
      await practiceMode.simulateCommand('git status');
      practiceMode.clearHistory();

      expect(practiceMode.getHistory()).toEqual([]);
    });
  });

  describe('Fake Hash Generation', () => {
    test('generates 7-character hashes', () => {
      const hash = practiceMode.generateFakeHash();
      expect(hash.length).toBe(7);
    });

    test('generates hex characters only', () => {
      const hash = practiceMode.generateFakeHash();
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });
});
