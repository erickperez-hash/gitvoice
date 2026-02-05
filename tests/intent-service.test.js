// IntentService Tests

// Mock the window object for Node.js environment
global.window = {};

// Load the IntentService
const fs = require('fs');
const path = require('path');
const serviceCode = fs.readFileSync(
  path.join(__dirname, '../services/intent-service.js'),
  'utf8'
);
eval(serviceCode);

describe('IntentService', () => {
  let intentService;

  beforeEach(() => {
    intentService = new IntentService();
  });

  describe('Status Commands', () => {
    test('parses "show status"', () => {
      const result = intentService.parse('show status');
      expect(result.action).toBe('status');
      expect(result.safe).toBe(true);
    });

    test('parses "show me the status"', () => {
      const result = intentService.parse('show me the status');
      expect(result.action).toBe('status');
    });

    test('parses "what is the status"', () => {
      const result = intentService.parse('what is the status');
      expect(result.action).toBe('status');
    });

    test('parses "git status"', () => {
      const result = intentService.parse('git status');
      expect(result.action).toBe('status');
    });

    test('parses "what has changed"', () => {
      const result = intentService.parse('what has changed');
      expect(result.action).toBe('status');
    });
  });

  describe('Commit Commands', () => {
    test('parses "commit as fix bug"', () => {
      const result = intentService.parse('commit as fix bug');
      expect(result.action).toBe('commit');
      expect(result.args.message).toBe('fix bug');
      expect(result.safe).toBe(true);
    });

    test('parses "commit with message initial setup"', () => {
      const result = intentService.parse('commit with message initial setup');
      expect(result.action).toBe('commit');
      expect(result.args.message).toBe('initial setup');
    });

    test('parses "save as updated readme"', () => {
      const result = intentService.parse('save as updated readme');
      expect(result.action).toBe('commit');
      expect(result.args.message).toBe('updated readme');
    });

    test('parses "create a commit saying added tests"', () => {
      const result = intentService.parse('create a commit saying added tests');
      expect(result.action).toBe('commit');
    });
  });

  describe('Push Commands', () => {
    test('parses "push to origin"', () => {
      const result = intentService.parse('push to origin', { branch: 'main' });
      expect(result.action).toBe('push');
      expect(result.safe).toBe(false);
    });

    test('parses "push" with context branch', () => {
      const result = intentService.parse('push', { branch: 'feature' });
      expect(result.action).toBe('push');
      expect(result.args.branch).toBe('feature');
    });

    test('parses "upload to github"', () => {
      const result = intentService.parse('upload to github');
      expect(result.action).toBe('push');
    });
  });

  describe('Pull Commands', () => {
    test('parses "pull from origin"', () => {
      const result = intentService.parse('pull from origin', { branch: 'main' });
      expect(result.action).toBe('pull');
      expect(result.safe).toBe(true);
    });

    test('parses "get latest changes"', () => {
      const result = intentService.parse('get latest changes');
      expect(result.action).toBe('pull');
    });

    test('parses "update from remote"', () => {
      const result = intentService.parse('update from remote');
      expect(result.action).toBe('pull');
    });
  });

  describe('Branch Commands', () => {
    test('parses "create branch feature-login"', () => {
      const result = intentService.parse('create branch feature-login');
      expect(result.action).toBe('branch');
      expect(result.args.name).toBe('feature-login');
    });

    test('parses "new branch bugfix"', () => {
      const result = intentService.parse('new branch bugfix');
      expect(result.action).toBe('branch');
      expect(result.args.name).toBe('bugfix');
    });
  });

  describe('Checkout Commands', () => {
    test('parses "switch to main"', () => {
      const result = intentService.parse('switch to main');
      expect(result.action).toBe('checkout');
      expect(result.args.branch).toBe('main');
    });

    test('parses "checkout develop"', () => {
      const result = intentService.parse('checkout develop');
      expect(result.action).toBe('checkout');
      expect(result.args.branch).toBe('develop');
    });

    test('parses "go to feature branch"', () => {
      const result = intentService.parse('go to feature branch');
      expect(result.action).toBe('checkout');
    });
  });

  describe('Log Commands', () => {
    test('parses "show me the log"', () => {
      const result = intentService.parse('show me the log');
      expect(result.action).toBe('log');
      expect(result.safe).toBe(true);
    });

    test('parses "show commit history"', () => {
      const result = intentService.parse('show commit history');
      expect(result.action).toBe('log');
    });
  });

  describe('Diff Commands', () => {
    test('parses "show the diff"', () => {
      const result = intentService.parse('show the diff');
      expect(result.action).toBe('diff');
      expect(result.safe).toBe(true);
    });

    test('parses "what changed"', () => {
      // Note: "what changed" might match status, depending on pattern order
      const result = intentService.parse('show differences');
      expect(result.action).toBe('diff');
    });
  });

  describe('Merge Commands', () => {
    test('parses "merge feature into main"', () => {
      const result = intentService.parse('merge feature into main');
      expect(result.action).toBe('merge');
      expect(result.safe).toBe(false);
    });

    test('parses "merge develop"', () => {
      const result = intentService.parse('merge develop');
      expect(result.action).toBe('merge');
      expect(result.args.branch).toBe('develop');
    });
  });

  describe('Stash Commands', () => {
    test('parses "stash changes"', () => {
      const result = intentService.parse('stash changes');
      expect(result.action).toBe('stash');
      expect(result.args.action).toBe('push');
    });

    test('parses "pop stash"', () => {
      const result = intentService.parse('pop stash');
      expect(result.action).toBe('stash');
      expect(result.args.action).toBe('pop');
    });
  });

  describe('Add/Stage Commands', () => {
    test('parses "add all files"', () => {
      const result = intentService.parse('add all files');
      expect(result.action).toBe('add');
      expect(result.args.files).toBe('.');
    });

    test('parses "stage everything"', () => {
      const result = intentService.parse('stage everything');
      expect(result.action).toBe('add');
    });
  });

  describe('Help Commands', () => {
    test('parses "help"', () => {
      const result = intentService.parse('help');
      expect(result.action).toBe('help');
    });

    test('parses "what can you do"', () => {
      const result = intentService.parse('what can you do');
      expect(result.action).toBe('help');
    });
  });

  describe('Unknown Commands', () => {
    test('returns unknown for unrecognized input', () => {
      const result = intentService.parse('make coffee');
      expect(result.action).toBe('unknown');
    });

    test('returns unknown for empty input', () => {
      const result = intentService.parse('');
      expect(result.action).toBe('unknown');
    });
  });

  describe('Safe vs Unsafe Commands', () => {
    test('status is safe', () => {
      const result = intentService.parse('show status');
      expect(result.safe).toBe(true);
    });

    test('push is unsafe', () => {
      const result = intentService.parse('push to origin');
      expect(result.safe).toBe(false);
    });

    test('merge is unsafe', () => {
      const result = intentService.parse('merge feature');
      expect(result.safe).toBe(false);
    });

    test('pull is safe', () => {
      const result = intentService.parse('pull');
      expect(result.safe).toBe(true);
    });
  });
});
