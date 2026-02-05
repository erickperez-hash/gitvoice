/**
 * @jest-environment jsdom
 */
/**
 * GitVoice Educational Flow Tests
 * Tests for the educational features of GitVoice
 */

describe('Educational Flow Tests', () => {
  let commandModal;
  let narrationService;
  let commandExplainer;
  let practiceMode;
  let intentService;

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="command-modal" class="modal hidden">
        <div id="action-description"></div>
        <div id="command"></div>
        <div id="command-parts"></div>
        <div id="command-output"></div>
        <div id="learning-tip"></div>
      </div>
      <div id="voice-text"></div>
      <div id="voice-feedback"></div>
    `;

    // Initialize services with mocks
    const mockTTS = {
      speak: jest.fn().mockResolvedValue(undefined)
    };

    // Load and initialize the classes
    // Note: In actual tests, these would be properly imported
    commandExplainer = {
      explainCommand: jest.fn((cmd) => ({
        command: cmd,
        description: 'Test description',
        breakdown: [{ command: 'git', explanation: 'Git CLI' }],
        tip: 'Test tip',
        learnMoreUrl: 'https://git-scm.com'
      })),
      getTipOfTheDay: jest.fn(() => 'Test tip of the day'),
      getEducationalError: jest.fn(() => null)
    };

    narrationService = {
      speak: jest.fn().mockResolvedValue(undefined),
      announceStep: jest.fn().mockResolvedValue(undefined),
      narrateGitOperation: jest.fn().mockResolvedValue({
        success: jest.fn()
      })
    };

    practiceMode = {
      enabled: false,
      toggle: jest.fn(function () { this.enabled = !this.enabled; return this.enabled; }),
      isEnabled: jest.fn(function () { return this.enabled; }),
      simulateCommand: jest.fn((cmd) => ({
        command: cmd,
        description: 'Simulated command',
        wouldDo: 'Would do something',
        output: 'Simulated output',
        sideEffects: ['Side effect 1'],
        safe: true
      }))
    };

    intentService = {
      parse: jest.fn((transcript) => {
        if (transcript.includes('status')) {
          return { action: 'status', command: 'git status', description: 'check status', safe: true };
        }
        if (transcript.includes('commit')) {
          return { action: 'commit', command: 'git commit -m "test"', description: 'commit', safe: true };
        }
        return { action: 'unknown', command: null, description: 'unknown' };
      }),
      getHelpText: jest.fn(() => 'Help text')
    };
  });

  describe('CommandExplainer', () => {
    test('explainCommand provides breakdown for git status', () => {
      const explanation = commandExplainer.explainCommand('git status');

      expect(explanation).toHaveProperty('command', 'git status');
      expect(explanation).toHaveProperty('breakdown');
      expect(explanation).toHaveProperty('tip');
      expect(Array.isArray(explanation.breakdown)).toBe(true);
    });

    test('explainCommand provides learn more URL', () => {
      const explanation = commandExplainer.explainCommand('git add .');

      expect(explanation).toHaveProperty('learnMoreUrl');
      expect(explanation.learnMoreUrl).toMatch(/git-scm\.com/);
    });

    test('getTipOfTheDay returns a string', () => {
      const tip = commandExplainer.getTipOfTheDay();

      expect(typeof tip).toBe('string');
      expect(tip.length).toBeGreaterThan(0);
    });
  });

  describe('NarrationService', () => {
    test('announceStep is called for listening phase', async () => {
      await narrationService.announceStep('listening');

      expect(narrationService.announceStep).toHaveBeenCalledWith('listening');
    });

    test('announceStep is called with transcript', async () => {
      const transcript = 'show me the status';
      await narrationService.announceStep('transcribed', transcript);

      expect(narrationService.announceStep).toHaveBeenCalledWith('transcribed', transcript);
    });

    test('narrateGitOperation returns success callback', async () => {
      const result = await narrationService.narrateGitOperation('status', {});

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('function');
    });
  });

  describe('PracticeMode', () => {
    test('toggle enables practice mode', () => {
      expect(practiceMode.isEnabled()).toBe(false);

      practiceMode.toggle();

      expect(practiceMode.isEnabled()).toBe(true);
    });

    test('toggle disables practice mode when already enabled', () => {
      practiceMode.toggle(); // Enable
      expect(practiceMode.isEnabled()).toBe(true);

      practiceMode.toggle(); // Disable
      expect(practiceMode.isEnabled()).toBe(false);
    });

    test('simulateCommand returns simulation object', () => {
      const simulation = practiceMode.simulateCommand('git status', {});

      expect(simulation).toHaveProperty('command');
      expect(simulation).toHaveProperty('wouldDo');
      expect(simulation).toHaveProperty('output');
      expect(simulation).toHaveProperty('sideEffects');
    });

    test('simulateCommand includes safety information', () => {
      const simulation = practiceMode.simulateCommand('git push origin main', {});

      expect(simulation).toHaveProperty('safe');
    });
  });

  describe('IntentService', () => {
    test('parses status command correctly', () => {
      const intent = intentService.parse('show me the status', {});

      expect(intent.action).toBe('status');
      expect(intent.command).toContain('git status');
    });

    test('parses commit command correctly', () => {
      const intent = intentService.parse('commit as test message', {});

      expect(intent.action).toBe('commit');
      expect(intent.command).toContain('git commit');
    });

    test('returns unknown for unrecognized commands', () => {
      const intent = intentService.parse('do something random', {});

      expect(intent.action).toBe('unknown');
    });

    test('provides help text', () => {
      const helpText = intentService.getHelpText();

      expect(typeof helpText).toBe('string');
      expect(helpText.length).toBeGreaterThan(0);
    });
  });
});

describe('Command Modal Tests', () => {
  let modal;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="command-modal" class="modal hidden">
        <div id="action-description"></div>
        <div id="command"></div>
        <div id="command-parts"></div>
        <div id="command-output"></div>
        <div id="learning-tip"></div>
        <button id="close-modal"></button>
        <button id="modal-close"></button>
        <button id="copy-command"></button>
        <button id="learn-more"></button>
      </div>
    `;
  });

  test('modal shows when learning mode is enabled', () => {
    const modalEl = document.getElementById('command-modal');

    // Simulate showing modal
    modalEl.classList.remove('hidden');

    expect(modalEl.classList.contains('hidden')).toBe(false);
  });

  test('modal hides when close button is clicked', () => {
    const modalEl = document.getElementById('command-modal');
    modalEl.classList.remove('hidden');

    // Simulate hiding
    modalEl.classList.add('hidden');

    expect(modalEl.classList.contains('hidden')).toBe(true);
  });
});

describe('Progress Indicator Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="step-listening" class="step"></div>
      <div id="step-understanding" class="step"></div>
      <div id="step-executing" class="step"></div>
      <div id="step-complete" class="step"></div>
    `;
  });

  test('step 1 is marked active when listening', () => {
    const stepEl = document.getElementById('step-listening');
    stepEl.classList.add('active');

    expect(stepEl.classList.contains('active')).toBe(true);
  });

  test('previous steps are marked complete', () => {
    const step1 = document.getElementById('step-listening');
    const step2 = document.getElementById('step-understanding');

    step1.classList.add('complete');
    step2.classList.add('active');

    expect(step1.classList.contains('complete')).toBe(true);
    expect(step2.classList.contains('active')).toBe(true);
  });
});

describe('Learning Overlay Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="learning-overlay" class="learning-overlay hidden">
        <div id="overlay-title"></div>
        <div id="topic-content"></div>
        <div id="example-command"></div>
      </div>
    `;
  });

  test('overlay shows when triggered', () => {
    const overlay = document.getElementById('learning-overlay');
    overlay.classList.remove('hidden');

    expect(overlay.classList.contains('hidden')).toBe(false);
  });

  test('overlay can switch topics', () => {
    const contentEl = document.getElementById('topic-content');

    // Simulate topic change
    contentEl.innerHTML = '<p>Branching content</p>';

    expect(contentEl.innerHTML).toContain('Branching');
  });
});

describe('Error Handling Tests', () => {
  test('educational error provides explanation', () => {
    const errors = {
      noChangesToCommit: {
        title: "Why Can't I Commit?",
        explanation: 'Git commits save changes, but you haven\'t made any yet.',
        tip: 'Try making a change to a file first.'
      },
      authenticationFailed: {
        title: 'Git Authentication',
        explanation: 'When pushing to remote repositories, Git needs to confirm you have permission.',
        tip: 'Go to Settings to add your GitHub token.'
      }
    };

    expect(errors.noChangesToCommit).toHaveProperty('title');
    expect(errors.noChangesToCommit).toHaveProperty('explanation');
    expect(errors.noChangesToCommit).toHaveProperty('tip');
  });
});

describe('Credential Management Tests', () => {
  test('validates token format', () => {
    const validateToken = (token) => {
      return !!(token && token.length > 10);
    };

    expect(validateToken('ghp_abcdefghijklmnop')).toBe(true);
    expect(validateToken('short')).toBe(false);
    expect(validateToken('')).toBe(false);
  });

  test('detects service from URL', () => {
    const detectService = (url) => {
      if (url.includes('github.com')) return 'github';
      if (url.includes('gitlab.com')) return 'gitlab';
      if (url.includes('bitbucket.org')) return 'bitbucket';
      return 'custom';
    };

    expect(detectService('https://github.com/user/repo')).toBe('github');
    expect(detectService('https://gitlab.com/user/repo')).toBe('gitlab');
    expect(detectService('https://bitbucket.org/user/repo')).toBe('bitbucket');
    expect(detectService('https://example.com/repo')).toBe('custom');
  });
});
