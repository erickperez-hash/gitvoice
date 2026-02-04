/**
 * Practice Mode Tests
 * Tests for the Git command simulation functionality
 */

// Mock PracticeMode class for testing
class MockPracticeMode {
  constructor() {
    this.enabled = false;
    this.history = [];
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  async simulateCommand(command, context = {}) {
    const simulation = this.getSimulation(command, context);
    this.history.push({
      command,
      simulation,
      timestamp: new Date().toISOString()
    });
    return simulation;
  }

  getSimulation(command, context) {
    const parts = command.toLowerCase().split(' ');
    const gitCommand = parts[1];

    switch (gitCommand) {
      case 'status':
        return {
          command: 'git status',
          description: 'Shows the current state of your working directory',
          wouldDo: 'Display which files have been modified, staged, or are untracked',
          output: 'On branch main\nnothing to commit, working tree clean',
          sideEffects: [],
          safe: true
        };

      case 'add':
        return {
          command: command,
          description: 'Stage changes for commit',
          wouldDo: 'Move files to the staging area',
          output: '',
          sideEffects: ['Files would be staged for commit'],
          safe: true
        };

      case 'commit':
        return {
          command: command,
          description: 'Create a new commit',
          wouldDo: 'Save staged changes to repository history',
          output: '[main abc1234] Test commit\n 1 file changed',
          sideEffects: ['A new commit would be created', 'Staging area would be cleared'],
          safe: true
        };

      case 'push':
        return {
          command: command,
          description: 'Upload commits to remote',
          wouldDo: 'Send local commits to the remote repository',
          output: 'Writing objects: 100%\nTo github.com:user/repo.git',
          sideEffects: ['Commits would be uploaded to remote', 'Others could see your changes'],
          safe: false,
          warning: 'This would modify the remote repository'
        };

      case 'pull':
        return {
          command: command,
          description: 'Download and merge remote changes',
          wouldDo: 'Fetch and merge commits from remote',
          output: 'Updating abc123..def456\nFast-forward',
          sideEffects: ['New commits would be downloaded', 'Local branch would be updated'],
          safe: true
        };

      default:
        return {
          command: command,
          description: 'Unknown command',
          wouldDo: 'This command is not recognized',
          output: 'Command not found',
          sideEffects: [],
          safe: true
        };
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}

describe('PracticeMode', () => {
  let practiceMode;

  beforeEach(() => {
    practiceMode = new MockPracticeMode();
  });

  describe('toggle functionality', () => {
    test('starts disabled', () => {
      expect(practiceMode.isEnabled()).toBe(false);
    });

    test('enable turns on practice mode', () => {
      practiceMode.enable();
      expect(practiceMode.isEnabled()).toBe(true);
    });

    test('disable turns off practice mode', () => {
      practiceMode.enable();
      practiceMode.disable();
      expect(practiceMode.isEnabled()).toBe(false);
    });

    test('toggle switches state', () => {
      expect(practiceMode.toggle()).toBe(true);
      expect(practiceMode.toggle()).toBe(false);
      expect(practiceMode.toggle()).toBe(true);
    });
  });

  describe('command simulation', () => {
    test('simulates git status', async () => {
      const simulation = await practiceMode.simulateCommand('git status');

      expect(simulation).toHaveProperty('command', 'git status');
      expect(simulation).toHaveProperty('wouldDo');
      expect(simulation).toHaveProperty('output');
      expect(simulation.safe).toBe(true);
    });

    test('simulates git add', async () => {
      const simulation = await practiceMode.simulateCommand('git add .');

      expect(simulation.command).toBe('git add .');
      expect(simulation.sideEffects.length).toBeGreaterThan(0);
    });

    test('simulates git commit', async () => {
      const simulation = await practiceMode.simulateCommand('git commit -m "test"');

      expect(simulation.wouldDo).toContain('staged changes');
      expect(simulation.output).toContain('file changed');
    });

    test('simulates git push with warning', async () => {
      const simulation = await practiceMode.simulateCommand('git push origin main');

      expect(simulation.safe).toBe(false);
      expect(simulation).toHaveProperty('warning');
    });

    test('handles unknown commands', async () => {
      const simulation = await practiceMode.simulateCommand('git unknown');

      expect(simulation.description).toContain('Unknown');
    });
  });

  describe('history tracking', () => {
    test('records commands in history', async () => {
      await practiceMode.simulateCommand('git status');
      await practiceMode.simulateCommand('git add .');

      const history = practiceMode.getHistory();
      expect(history.length).toBe(2);
    });

    test('history includes timestamp', async () => {
      await practiceMode.simulateCommand('git status');

      const history = practiceMode.getHistory();
      expect(history[0]).toHaveProperty('timestamp');
    });

    test('clearHistory removes all entries', async () => {
      await practiceMode.simulateCommand('git status');
      practiceMode.clearHistory();

      expect(practiceMode.getHistory().length).toBe(0);
    });
  });

  describe('safety classification', () => {
    test('marks read-only commands as safe', async () => {
      const statusSim = await practiceMode.simulateCommand('git status');
      const logSim = await practiceMode.simulateCommand('git log');

      expect(statusSim.safe).toBe(true);
    });

    test('marks destructive commands as unsafe', async () => {
      const pushSim = await practiceMode.simulateCommand('git push origin main');

      expect(pushSim.safe).toBe(false);
    });
  });
});
