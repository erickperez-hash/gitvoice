/**
 * Command Explainer Tests
 * Tests for the Git command explanation functionality
 */

// Mock the class for testing
class MockCommandExplainer {
  constructor() {
    this.commandDatabase = this.buildCommandDatabase();
  }

  explainCommand(command) {
    const parts = command.split(' ');
    const gitCommand = parts[1];

    const explanation = this.commandDatabase[gitCommand] || {
      description: 'A Git command',
      breakdown: [],
      tip: "Run 'git help' for more information"
    };

    const breakdown = this.breakdownCommand(command);

    return {
      command: command,
      description: explanation.description,
      breakdown: breakdown,
      tip: explanation.tip,
      learnMoreUrl: `https://git-scm.com/docs/git-${gitCommand}`
    };
  }

  breakdownCommand(command) {
    const parts = command.split(' ');
    const breakdown = [];

    if (parts[0] === 'git') {
      breakdown.push({
        command: 'git',
        explanation: 'The Git version control system command-line tool'
      });
    }

    const gitCommand = parts[1];

    switch (gitCommand) {
      case 'add':
        breakdown.push({
          command: 'add',
          explanation: 'Stage changes for the next commit'
        });
        if (parts[2] === '.') {
          breakdown.push({
            command: '.',
            explanation: 'Current directory - stages all changed files'
          });
        }
        break;

      case 'commit':
        breakdown.push({
          command: 'commit',
          explanation: 'Save staged changes to repository history'
        });
        if (parts[2] === '-m') {
          breakdown.push({
            command: '-m',
            explanation: 'Add a message describing the commit'
          });
        }
        break;

      case 'status':
        breakdown.push({
          command: 'status',
          explanation: 'Show the current state of your working directory'
        });
        break;

      case 'push':
        breakdown.push({
          command: 'push',
          explanation: 'Upload local commits to remote repository'
        });
        break;

      case 'pull':
        breakdown.push({
          command: 'pull',
          explanation: 'Download and merge changes from remote repository'
        });
        break;
    }

    return breakdown;
  }

  buildCommandDatabase() {
    return {
      'status': {
        description: "Check what's changed in your repository",
        tip: "Use 'git status' frequently to see what files you've modified."
      },
      'add': {
        description: 'Stage files to be included in the next commit',
        tip: "Think of 'add' as selecting which changes you want to save."
      },
      'commit': {
        description: 'Save your staged changes to the repository',
        tip: 'A commit is like a save point in a video game.'
      },
      'push': {
        description: 'Upload your local commits to a remote repository',
        tip: 'Push sends your commits to the cloud so others can see them.'
      },
      'pull': {
        description: 'Download and merge changes from a remote repository',
        tip: 'Pull fetches new commits from your team and merges them.'
      }
    };
  }

  getTipOfTheDay() {
    const tips = [
      'Commit early, commit often.',
      "Write commit messages in present tense: 'Add feature' not 'Added feature'.",
      'Use branches for new features.',
      'Pull before you push to avoid merge conflicts.'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }
}

describe('CommandExplainer', () => {
  let explainer;

  beforeEach(() => {
    explainer = new MockCommandExplainer();
  });

  describe('explainCommand', () => {
    test('explains git status correctly', () => {
      const result = explainer.explainCommand('git status');

      expect(result.command).toBe('git status');
      expect(result.description).toContain('changed');
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    test('explains git add . correctly', () => {
      const result = explainer.explainCommand('git add .');

      expect(result.command).toBe('git add .');
      expect(result.breakdown.length).toBe(3);
      expect(result.breakdown[0].command).toBe('git');
      expect(result.breakdown[1].command).toBe('add');
      expect(result.breakdown[2].command).toBe('.');
    });

    test('explains git commit -m correctly', () => {
      const result = explainer.explainCommand('git commit -m "test"');

      expect(result.command).toBe('git commit -m "test"');
      expect(result.breakdown.length).toBeGreaterThanOrEqual(2);
    });

    test('provides learn more URL', () => {
      const result = explainer.explainCommand('git push');

      expect(result.learnMoreUrl).toBe('https://git-scm.com/docs/git-push');
    });
  });

  describe('breakdownCommand', () => {
    test('breaks down git status', () => {
      const breakdown = explainer.breakdownCommand('git status');

      expect(breakdown.length).toBe(2);
      expect(breakdown[0].command).toBe('git');
      expect(breakdown[1].command).toBe('status');
    });

    test('breaks down git add .', () => {
      const breakdown = explainer.breakdownCommand('git add .');

      expect(breakdown.length).toBe(3);
      expect(breakdown.find(b => b.command === '.').explanation).toContain('all changed files');
    });

    test('includes explanations for each part', () => {
      const breakdown = explainer.breakdownCommand('git commit -m "message"');

      breakdown.forEach(part => {
        expect(part).toHaveProperty('command');
        expect(part).toHaveProperty('explanation');
        expect(part.explanation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTipOfTheDay', () => {
    test('returns a string', () => {
      const tip = explainer.getTipOfTheDay();

      expect(typeof tip).toBe('string');
    });

    test('returns non-empty tip', () => {
      const tip = explainer.getTipOfTheDay();

      expect(tip.length).toBeGreaterThan(0);
    });
  });

  describe('commandDatabase', () => {
    test('contains common Git commands', () => {
      const db = explainer.commandDatabase;

      expect(db).toHaveProperty('status');
      expect(db).toHaveProperty('add');
      expect(db).toHaveProperty('commit');
      expect(db).toHaveProperty('push');
      expect(db).toHaveProperty('pull');
    });

    test('each command has description and tip', () => {
      const db = explainer.commandDatabase;

      Object.values(db).forEach(entry => {
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('tip');
      });
    });
  });
});
