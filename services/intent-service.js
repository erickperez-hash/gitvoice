// IntentService - Parse voice commands into Git actions

class IntentService {
  constructor() {
    this.patterns = this.buildPatterns();
  }

  buildPatterns() {
    return [
      // Status
      {
        patterns: [
          /show\s*(me\s*)?(?:the\s*)?status/i,
          /what(?:'s|\s*is)\s*(?:the\s*)?status/i,
          /check\s*(?:the\s*)?status/i,
          /git\s*status/i,
          /get\s*status/i,
          /what(?:'s|\s*has)?\s*changed/i,
          /show\s*changes/i
        ],
        action: 'status',
        command: 'git status --short --branch',
        description: 'check status',
        safe: true
      },

      // Commit with message
      {
        patterns: [
          /commit\s*(?:everything\s*)?(?:as|with\s*message|message)?\s*[:\s]*["']?(.+?)["']?$/i,
          /save\s*(?:everything\s*)?(?:as|with)?\s*[:\s]*["']?(.+?)["']?$/i,
          /create\s*(?:a\s*)?commit\s*(?:with\s*message|as|saying)?\s*[:\s]*["']?(.+?)["']?$/i
        ],
        action: 'commit',
        handler: (match) => {
          const message = match[1]?.trim() || 'Update';
          return {
            command: `git add . && git commit -m "${message}"`,
            args: { message },
            description: `commit with message "${message}"`
          };
        },
        safe: true
      },

      // Push
      {
        patterns: [
          /push\s*(?:to\s*)?(?:origin|remote)?(?:\s*(\w+))?/i,
          /upload\s*(?:to\s*)?(?:github|remote|origin)?/i,
          /send\s*(?:to\s*)?(?:github|remote|origin)?/i
        ],
        action: 'push',
        handler: (match, context) => {
          const branch = match[1] || context.branch || 'main';
          return {
            command: `git push origin ${branch}`,
            args: { remote: 'origin', branch },
            description: `push to origin/${branch}`
          };
        },
        safe: false
      },

      // Pull
      {
        patterns: [
          /pull\s*(?:from\s*)?(?:origin|remote)?(?:\s*(\w+))?/i,
          /get\s*(?:latest|updates|changes)/i,
          /update\s*(?:from\s*)?(?:remote|origin)?/i,
          /fetch\s*(?:and\s*merge)?/i
        ],
        action: 'pull',
        handler: (match, context) => {
          const branch = match[1] || context.branch || 'main';
          return {
            command: `git pull origin ${branch}`,
            args: { remote: 'origin', branch },
            description: `pull from origin/${branch}`
          };
        },
        safe: true
      },

      // Add files
      {
        patterns: [
          /(?:stage|add)\s*(?:all\s*)?(?:files|changes|everything)/i,
          /stage\s*(.+)/i,
          /add\s*(.+)/i
        ],
        action: 'add',
        handler: (match) => {
          const files = match[1]?.trim() || '.';
          return {
            command: `git add ${files === 'everything' || files === 'all' ? '.' : files}`,
            args: { files: files === 'everything' || files === 'all' ? '.' : files },
            description: `stage ${files === '.' || files === 'everything' || files === 'all' ? 'all files' : files}`
          };
        },
        safe: true
      },

      // Create branch
      {
        patterns: [
          /create\s*(?:a\s*)?(?:new\s*)?branch\s*(?:called|named)?\s*["']?(\S+)["']?/i,
          /(?:new|make)\s*branch\s*["']?(\S+)["']?/i
        ],
        action: 'branch',
        handler: (match) => {
          const name = match[1]?.trim();
          if (!name) return null;
          return {
            command: `git branch ${name}`,
            args: { name },
            description: `create branch "${name}"`
          };
        },
        safe: true
      },

      // Switch/checkout branch
      {
        patterns: [
          /(?:switch|checkout|go)\s*(?:to\s*)?(?:branch\s*)?["']?(\S+)["']?/i,
          /change\s*(?:to\s*)?branch\s*["']?(\S+)["']?/i
        ],
        action: 'checkout',
        handler: (match) => {
          const branch = match[1]?.trim();
          if (!branch) return null;
          return {
            command: `git checkout ${branch}`,
            args: { branch },
            description: `switch to branch "${branch}"`
          };
        },
        safe: true
      },

      // Show log/history
      {
        patterns: [
          /show\s*(?:me\s*)?(?:the\s*)?(?:commit\s*)?(?:log|history)/i,
          /(?:git\s*)?log/i,
          /what(?:'s|\s*has)\s*(?:been\s*)?(?:done|committed)/i,
          /recent\s*commits/i
        ],
        action: 'log',
        command: 'git log --oneline -n10',
        description: 'show commit history',
        safe: true
      },

      // Show diff
      {
        patterns: [
          /show\s*(?:me\s*)?(?:the\s*)?diff(?:erences?)?/i,
          /what(?:'s|\s*)(?:the\s*)?diff(?:erent)?/i,
          /compare\s*changes/i
        ],
        action: 'diff',
        command: 'git diff',
        description: 'show differences',
        safe: true
      },

      // Merge
      {
        patterns: [
          /merge\s*(?:branch\s*)?["']?(\S+)["']?/i,
          /integrate\s*(?:branch\s*)?["']?(\S+)["']?/i
        ],
        action: 'merge',
        handler: (match) => {
          const branch = match[1]?.trim();
          if (!branch) return null;
          return {
            command: `git merge ${branch}`,
            args: { branch },
            description: `merge branch "${branch}"`
          };
        },
        safe: false
      },

      // Stash
      {
        patterns: [
          /stash\s*pop/i,
          /apply\s*stash/i,
          /restore\s*(?:my\s*)?stash/i
        ],
        action: 'stash',
        handler: () => ({
          command: 'git stash pop',
          args: { action: 'pop' },
          description: 'apply stashed changes'
        }),
        safe: true
      },
      {
        patterns: [
          /stash\s*(?:changes|everything)/i,
          /save\s*(?:to\s*)?stash/i
        ],
        action: 'stash',
        handler: () => ({
          command: 'git stash',
          args: { action: 'push' },
          description: 'stash current changes'
        }),
        safe: true
      },

      // Help
      {
        patterns: [
          /help/i,
          /what\s*can\s*(?:you|i)\s*(?:do|say)/i,
          /commands/i
        ],
        action: 'help',
        description: 'show help',
        safe: true
      }
    ];
  }

  parse(transcript, context = {}) {
    const text = transcript.toLowerCase().trim();

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        const match = text.match(regex);
        if (match) {
          // Use handler if available, otherwise return static values
          if (pattern.handler) {
            const result = pattern.handler(match, context);
            if (result) {
              return {
                action: pattern.action,
                command: result.command,
                args: result.args,
                description: result.description,
                safe: pattern.safe !== false
              };
            }
          } else {
            return {
              action: pattern.action,
              command: pattern.command,
              description: pattern.description,
              safe: pattern.safe !== false
            };
          }
        }
      }
    }

    // No match found
    return {
      action: 'unknown',
      command: null,
      description: 'unrecognized command',
      transcript: transcript,
      safe: true
    };
  }

  getSuggestions(partialText) {
    const suggestions = [];
    const text = partialText.toLowerCase();

    const commands = [
      { trigger: 'status', examples: ['show me the status', 'what has changed'] },
      { trigger: 'commit', examples: ['commit as fix bug', 'commit everything as initial setup'] },
      { trigger: 'push', examples: ['push to origin', 'push'] },
      { trigger: 'pull', examples: ['pull latest changes', 'get updates'] },
      { trigger: 'branch', examples: ['create branch feature-login', 'new branch bugfix'] },
      { trigger: 'checkout', examples: ['switch to main', 'checkout develop'] },
      { trigger: 'log', examples: ['show me the log', 'recent commits'] },
      { trigger: 'diff', examples: ['show the diff', 'what changed'] },
      { trigger: 'merge', examples: ['merge branch develop', 'integrate feature-auth'] },
      { trigger: 'stash', examples: ['stash changes', 'stash pop'] }
    ];

    for (const cmd of commands) {
      if (cmd.trigger.includes(text) || cmd.examples.some(e => e.includes(text))) {
        suggestions.push({
          action: cmd.trigger,
          examples: cmd.examples
        });
      }
    }

    return suggestions;
  }

  getHelpText() {
    return `
Available Voice Commands:

STATUS:
  "Show me the status" - Check what's changed
  "What has changed" - See modified files

COMMIT:
  "Commit as [message]" - Stage all and commit
  "Commit everything as initial setup"

PUSH:
  "Push to origin" - Push to remote
  "Push" - Push current branch

PULL:
  "Pull latest changes" - Get updates
  "Pull from origin main"

BRANCHES:
  "Create branch [name]" - Create new branch
  "Switch to [branch]" - Checkout branch

HISTORY:
  "Show me the log" - View commits
  "Show the diff" - See changes

ADVANCED:
  "Merge branch [name]" - Merge changes
  "Stash changes" - Save for later
  "Apply stash" - Restore stashed changes
    `.trim();
  }
}

// Make available globally
window.IntentService = IntentService;
