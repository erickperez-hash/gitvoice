# GitVoice Single-Session LLM Implementation Plan
## With Educational TTS Announcements & Command Learning Modal

## Session Objective
Build a functional GitVoice prototype that not only executes Git commands via voice but **teaches users CLI tools** through progressive disclosure: voice announces each step, and a modal displays the actual commands being executed in real-time.

---

## Pre-Session Requirements

**Environment Verification:**
- Node.js 22+ installed
- Git installed and accessible
- Microphone available
- 4GB+ free disk space for models
- ~4 hours of uninterrupted development time

---

## Educational Philosophy

**GitVoice is a teaching tool first, automation tool second.**

Every operation follows this pattern:
1. **Voice announces what it's doing** - "Let me check the repository status for you"
2. **Modal shows the CLI command** - Display: `git status --short`
3. **Voice explains the result** - "You're on the main branch with 3 modified files"
4. **Modal shows the output** - Display actual Git output
5. **Voice offers learning prompt** - "Would you like to see what that command does?"

---

## Implementation Sequence

### PART 1: Project Initialization (First 10 minutes)

**Create project structure and core configuration files:**

```
gitvoice/
├── package.json
├── electron.js (main process)
├── preload.js
├── index.html
├── renderer.js
├── styles.css
├── models/ (created but gitignored)
├── components/
│   ├── command-modal.js       # NEW: Educational modal
│   ├── learning-overlay.js    # NEW: Command explanation
│   └── progress-indicator.js  # NEW: Multi-step progress
├── services/
│   ├── git-service.js
│   ├── audio-service.js
│   ├── stt-service.js
│   ├── tts-service.js
│   ├── intent-service.js
│   └── narration-service.js   # NEW: Educational narration
└── utils/
    ├── model-downloader.js
    ├── trampoline.js
    └── command-explainer.js    # NEW: CLI explanations
```

**Key Dependencies to Install:**
```json
{
  "dependencies": {
    "electron": "^33.0.0",
    "dugite": "^3.0.0",
    "faster-whisper": "^1.0.0",
    "@ricky0123/vad-node": "^1.0.0",
    "onnxruntime-node": "^1.16.0",
    "node-llama-cpp": "^2.8.0",
    "node-record-lpcm16": "^1.0.0",
    "speaker": "^0.5.0",
    "wav": "^1.0.2",
    "axios": "^1.6.0",
    "ansi-to-html": "^0.7.2"  # NEW: For terminal output styling
  }
}
```

**Immediate Actions:**
- Run `npm install`

---

### PART 2: Basic Electron Shell with Educational UI (Next 30 minutes)

**Goal: Create working Electron window with teaching-focused interface**

**File 1: electron.js**
- Create BrowserWindow with proper security settings
- Implement IPC handlers for Git operations
- Add IPC handlers for modal control
- Set up global shortcuts (Cmd/Ctrl+Shift+V for voice activation)
- Add learning mode toggle
- Configure contextIsolation and sandbox

**File 2: index.html** - Enhanced Educational Interface

```html
<!-- Main Interface -->
<div class="app-container">
  <!-- Header -->
  <header>
    <h1>🎙️ GitVoice - Learn Git by Voice</h1>
    <div class="controls">
      <button id="learn-mode-toggle">📚 Learning Mode: ON</button>
      <button id="settings-btn">⚙️</button>
    </div>
  </header>

  <!-- Repository Info -->
  <div class="repo-info">
    <input type="text" id="repo-path" placeholder="Select repository...">
    <button id="browse-repo">Browse</button>
  </div>

  <!-- Status Display -->
  <div class="status-panel">
    <h2>Repository Status</h2>
    <div id="git-status"></div>
  </div>

  <!-- NEW: Multi-Step Progress Indicator -->
  <div class="progress-steps">
    <div class="step" id="step-listening">
      <span class="step-number">1</span>
      <span class="step-label">Listening</span>
    </div>
    <div class="step" id="step-understanding">
      <span class="step-number">2</span>
      <span class="step-label">Understanding</span>
    </div>
    <div class="step" id="step-executing">
      <span class="step-number">3</span>
      <span class="step-label">Executing</span>
    </div>
    <div class="step" id="step-complete">
      <span class="step-number">4</span>
      <span class="step-label">Complete</span>
    </div>
  </div>

  <!-- Transcript Display -->
  <div class="transcript-panel">
    <h3>What I Heard:</h3>
    <div id="transcript"></div>
  </div>

  <!-- NEW: Voice Feedback Display (what TTS is saying) -->
  <div class="voice-feedback">
    <span class="speaker-icon">🔊</span>
    <div id="voice-text"></div>
  </div>

  <!-- Action Buttons -->
  <div class="action-buttons">
    <button id="execute-btn" disabled>Execute Command</button>
    <button id="cancel-btn">Cancel</button>
    <button id="explain-btn">Explain This Command</button>
  </div>
</div>

<!-- NEW: Command Learning Modal -->
<div id="command-modal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h2>🎓 Learning: Git Command Execution</h2>
      <button class="close-modal">&times;</button>
    </div>
    
    <div class="modal-body">
      <!-- What GitVoice is doing -->
      <div class="action-description">
        <h3>What I'm Doing:</h3>
        <p id="action-description"></p>
      </div>

      <!-- The actual CLI command -->
      <div class="cli-command">
        <h3>The Command:</h3>
        <div class="terminal-window">
          <div class="terminal-header">
            <span class="terminal-dot red"></span>
            <span class="terminal-dot yellow"></span>
            <span class="terminal-dot green"></span>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body">
            <pre id="cli-command-text">$ <span id="command"></span></pre>
          </div>
        </div>
      </div>

      <!-- Command explanation -->
      <div class="command-breakdown">
        <h3>Command Breakdown:</h3>
        <div id="command-parts"></div>
      </div>

      <!-- Live output -->
      <div class="command-output">
        <h3>Output:</h3>
        <div class="terminal-window">
          <div class="terminal-body">
            <pre id="command-output"></pre>
          </div>
        </div>
      </div>

      <!-- Learning tips -->
      <div class="learning-tip">
        <h3>💡 Tip:</h3>
        <p id="learning-tip"></p>
      </div>

      <!-- Try it yourself -->
      <div class="try-yourself">
        <h3>Try it yourself:</h3>
        <p>Copy this command and run it in your terminal:</p>
        <button id="copy-command">📋 Copy Command</button>
      </div>
    </div>

    <div class="modal-footer">
      <button id="learn-more">Learn More About This</button>
      <button id="modal-close">Got It!</button>
    </div>
  </div>
</div>

<!-- Settings Panel (existing) -->
<!-- ... -->
</div>
```

**File 3: components/command-modal.js** - NEW

```javascript
class CommandModal {
  constructor() {
    this.modal = document.getElementById('command-modal');
    this.isLearningMode = true;
  }

  show(commandData) {
    if (!this.isLearningMode) return;

    // Set action description
    document.getElementById('action-description').textContent = 
      commandData.description;

    // Set command
    document.getElementById('command').textContent = 
      commandData.command;

    // Break down command parts
    this.renderCommandBreakdown(commandData.breakdown);

    // Set learning tip
    document.getElementById('learning-tip').textContent = 
      commandData.tip;

    // Show modal
    this.modal.classList.remove('hidden');
  }

  updateOutput(output) {
    const outputEl = document.getElementById('command-output');
    outputEl.textContent = output;
    
    // Auto-scroll to bottom
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  renderCommandBreakdown(breakdown) {
    const container = document.getElementById('command-parts');
    container.innerHTML = breakdown.map(part => `
      <div class="command-part">
        <code>${part.command}</code>
        <p>${part.explanation}</p>
      </div>
    `).join('');
  }

  close() {
    this.modal.classList.add('hidden');
  }

  setLearningMode(enabled) {
    this.isLearningMode = enabled;
  }
}
```

**File 4: services/narration-service.js** - NEW

```javascript
// Manages educational voice announcements throughout the workflow

class NarrationService {
  constructor(ttsService) {
    this.tts = ttsService;
    this.narrationsEnabled = true;
    this.verbosity = 'normal'; // 'minimal', 'normal', 'detailed'
  }

  // Announce each step of the process
  async announceStep(step, context = {}) {
    if (!this.narrationsEnabled) return;

    const narrations = {
      // Listening phase
      listening: "I'm listening. Tell me what you'd like to do with Git.",
      
      // Processing phase
      processing: "Let me understand that...",
      transcribed: (text) => `I heard you say: ${text}`,
      
      // Parsing phase
      parsing: "Converting your request to a Git command...",
      commandIdentified: (action) => `Got it. You want to ${action}.`,
      
      // Pre-execution
      preparing: (command) => {
        if (this.verbosity === 'detailed') {
          return `I'm about to run the command: ${command}`;
        }
        return "Preparing to execute...";
      },
      
      // Execution phase
      executing: (action) => `${action} now...`,
      
      // Post-execution
      success: (action, details) => `Successfully ${action}. ${details}`,
      error: (error) => `I encountered an error: ${error}. Let me explain what went wrong.`,
      
      // Learning prompts
      learningPrompt: "The command modal shows exactly what I did. Would you like me to explain it?",
      commandExplained: "This command is now displayed in the learning modal."
    };

    const message = typeof narrations[step] === 'function' 
      ? narrations[step](context)
      : narrations[step];

    if (message) {
      await this.tts.speak(message);
      this.updateVoiceFeedbackUI(message);
    }
  }

  // Create rich, educational narrations for specific Git operations
  async narrateGitOperation(operation, details) {
    const operationNarrations = {
      status: {
        start: "Let me check the repository status for you",
        success: (data) => {
          const { branch, modified, staged, untracked } = data;
          let msg = `You're on the ${branch} branch. `;
          if (modified > 0) msg += `${modified} files have changes. `;
          if (staged > 0) msg += `${staged} files are staged for commit. `;
          if (untracked > 0) msg += `${untracked} new files aren't tracked yet. `;
          return msg + "Check the modal to see the exact command I used.";
        }
      },
      
      commit: {
        start: "I'm creating a commit with your changes",
        success: (data) => 
          `Committed successfully with message: "${data.message}". Your changes are now saved in Git history. The modal shows the exact git commit command.`
      },
      
      push: {
        start: "Pushing your commits to the remote repository",
        success: (data) => 
          `Successfully pushed to ${data.remote} ${data.branch}. Your code is now on GitHub. I used git push, which you can see in the modal.`
      },
      
      pull: {
        start: "Fetching and merging changes from the remote repository",
        success: (data) => 
          `Pulled ${data.commits} new commits. Your local branch is now up to date. Check the modal for the git pull command details.`
      },
      
      branch: {
        start: (name) => `Creating a new branch called ${name}`,
        success: (name) => 
          `Branch ${name} created. You're now on a separate timeline for your changes. See git branch in the modal.`
      },
      
      checkout: {
        start: (name) => `Switching to branch ${name}`,
        success: (name) => 
          `Now on branch ${name}. Your working directory reflects this branch's code. The modal shows git checkout.`
      }
    };

    const narration = operationNarrations[operation];
    if (!narration) return;

    // Announce start
    await this.announceStep('executing', narration.start);

    return {
      success: (data) => this.announceStep('success', 
        narration.success(data))
    };
  }

  updateVoiceFeedbackUI(text) {
    const feedbackEl = document.getElementById('voice-text');
    if (feedbackEl) {
      feedbackEl.textContent = text;
      feedbackEl.classList.add('speaking');
      
      // Remove after speech completes (estimate based on text length)
      const duration = (text.length * 50) + 1000; // ~50ms per char
      setTimeout(() => {
        feedbackEl.classList.remove('speaking');
      }, duration);
    }
  }

  setVerbosity(level) {
    this.verbosity = level; // 'minimal', 'normal', 'detailed'
  }
}
```

**File 5: utils/command-explainer.js** - NEW

```javascript
// Provides detailed explanations of Git commands for educational purposes

class CommandExplainer {
  constructor() {
    this.commandDatabase = this.buildCommandDatabase();
  }

  explainCommand(command) {
    // Parse the command
    const parts = command.split(' ');
    const gitCommand = parts[1]; // git [command]
    
    const explanation = this.commandDatabase[gitCommand] || {
      description: "A Git command",
      breakdown: [],
      tip: "Run 'git help' for more information"
    };

    // Build detailed breakdown
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

    // Example: "git add ."
    if (parts[0] === 'git') {
      breakdown.push({
        command: 'git',
        explanation: 'The Git version control system command-line tool'
      });
    }

    if (parts[1] === 'add') {
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
    } else if (parts[1] === 'commit') {
      breakdown.push({
        command: 'commit',
        explanation: 'Save staged changes to repository history'
      });
      
      if (parts[2] === '-m') {
        breakdown.push({
          command: '-m',
          explanation: 'Add a message describing the commit'
        });
        
        const message = parts.slice(3).join(' ');
        breakdown.push({
          command: message,
          explanation: 'Your commit message'
        });
      }
    } else if (parts[1] === 'push') {
      breakdown.push({
        command: 'push',
        explanation: 'Upload local commits to remote repository'
      });
      
      if (parts[2]) {
        breakdown.push({
          command: parts[2],
          explanation: 'Remote name (usually "origin")'
        });
      }
      
      if (parts[3]) {
        breakdown.push({
          command: parts[3],
          explanation: 'Branch name to push'
        });
      }
    } else if (parts[1] === 'status') {
      breakdown.push({
        command: 'status',
        explanation: 'Show the current state of your working directory'
      });
      
      if (parts[2] === '--short') {
        breakdown.push({
          command: '--short',
          explanation: 'Display in compact format'
        });
      }
    }

    return breakdown;
  }

  buildCommandDatabase() {
    return {
      'status': {
        description: "Check what's changed in your repository",
        tip: "Use 'git status' frequently to see what files you've modified. It's like asking 'what have I changed since my last commit?'"
      },
      'add': {
        description: "Stage files to be included in the next commit",
        tip: "Think of 'add' as selecting which changes you want to save. Use 'git add .' to stage everything, or 'git add filename' for specific files."
      },
      'commit': {
        description: "Save your staged changes to the repository with a descriptive message",
        tip: "A commit is like a save point in a video game. Write clear messages so you can understand what changed later. Format: 'git commit -m \"Your message\"'"
      },
      'push': {
        description: "Upload your local commits to a remote repository (like GitHub)",
        tip: "Push sends your commits to the cloud so others can see them. Always pull before pushing to avoid conflicts."
      },
      'pull': {
        description: "Download and merge changes from a remote repository",
        tip: "Pull fetches new commits from your team and merges them. Always pull before starting new work to stay up to date."
      },
      'branch': {
        description: "Create, list, or delete branches",
        tip: "Branches let you work on features separately. Create with 'git branch name', list with 'git branch', delete with 'git branch -d name'."
      },
      'checkout': {
        description: "Switch between branches or restore files",
        tip: "Checkout changes your working directory to match a different branch. Use 'git checkout branch-name' to switch branches."
      },
      'log': {
        description: "View commit history",
        tip: "See what's been done in the project. Use 'git log --oneline' for a compact view."
      },
      'diff': {
        description: "Show changes between commits, branches, or files",
        tip: "Diff shows exactly what changed. Use it before committing to review your changes."
      }
    };
  }

  getTipOfTheDay() {
    const tips = [
      "Commit early, commit often. Small commits are easier to understand and undo.",
      "Write commit messages in present tense: 'Add feature' not 'Added feature'.",
      "Use branches for new features. Keep main/master stable.",
      "Pull before you push to avoid merge conflicts.",
      "Use 'git status' constantly. It's your friend.",
      "Don't commit sensitive data like passwords or API keys.",
      "Learn 'git log' to understand your project's history.",
      "Use '.gitignore' to exclude files you don't want to track."
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }
}
```

**File 6: styles.css** - Enhanced with Educational Elements

```css
/* Add terminal styling */
.terminal-window {
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  margin: 15px 0;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

.terminal-header {
  background: #323232;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-dot.red { background: #ff5f56; }
.terminal-dot.yellow { background: #ffbd2e; }
.terminal-dot.green { background: #27c93f; }

.terminal-title {
  margin-left: auto;
  color: #8a8a8a;
  font-size: 12px;
}

.terminal-body {
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  color: #00ff00;
  background: #1e1e1e;
  min-height: 60px;
  max-height: 400px;
  overflow-y: auto;
}

.terminal-body pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Command breakdown styling */
.command-part {
  background: #f5f5f5;
  border-left: 4px solid #4CAF50;
  padding: 10px 15px;
  margin: 10px 0;
  border-radius: 4px;
}

.command-part code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  color: #d63384;
}

.command-part p {
  margin: 5px 0 0 0;
  color: #666;
}

/* Voice feedback display */
.voice-feedback {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin: 15px 0;
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 60px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.voice-feedback.speaking {
  opacity: 1;
  transform: translateY(0);
}

.speaker-icon {
  font-size: 24px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Progress steps */
.progress-steps {
  display: flex;
  justify-content: space-between;
  margin: 30px 0;
  padding: 0 20px;
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  opacity: 0.4;
  transition: all 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step.complete {
  opacity: 1;
}

.step.complete .step-number {
  background: #4CAF50;
  color: white;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: #2196F3;
  color: white;
  transform: scale(1.2);
}

.step-label {
  font-size: 12px;
  color: #666;
}

/* Modal improvements */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 20px 30px;
  border-bottom: 2px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.modal-body {
  padding: 30px;
}

.learning-tip {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

.try-yourself {
  background: #d1ecf1;
  border-left: 4px solid #17a2b8;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

#copy-command {
  margin-top: 10px;
  padding: 8px 16px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

#copy-command:hover {
  background: #138496;
}
```

**Test Point 1:** Run `npm start` - Window should open with enhanced educational UI, modal hidden

---

### PART 3: Git Integration via Dugite (Next 30 minutes)

**Goal: Execute Git commands and display results with educational context**

**File: services/git-service.js** - Enhanced with Educational Metadata

```javascript
class GitService {
  constructor() {
    this.dugite = require('dugite');
    this.currentRepo = null;
    this.explainer = new CommandExplainer();
  }

  // Each operation returns both result and educational context
  async executeWithContext(command, description) {
    const startTime = Date.now();
    
    // Build educational context
    const context = this.explainer.explainCommand(command);
    context.description = description; // Override with natural language
    
    try {
      // Execute the actual Git command
      const result = await this.dugite.GitProcess.exec(
        command.split(' ').slice(1), // Remove 'git'
        this.currentRepo
      );
      
      const duration = Date.now() - startTime;
      
      return {
        success: result.exitCode === 0,
        output: result.stdout || result.stderr,
        command: command,
        context: context,
        duration: duration,
        exitCode: result.exitCode
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        command: command,
        context: context
      };
    }
  }

  async getStatus() {
    return this.executeWithContext(
      'git status --short --branch',
      "Checking which files have changed in your repository"
    );
  }

  async add(files = '.') {
    return this.executeWithContext(
      `git add ${files}`,
      `Staging ${files === '.' ? 'all changed files' : files} for your next commit`
    );
  }

  async commit(message) {
    return this.executeWithContext(
      `git commit -m "${message}"`,
      `Creating a snapshot of your staged changes with the message "${message}"`
    );
  }

  async push(remote = 'origin', branch = null) {
    if (!branch) {
      branch = await this.getCurrentBranch();
    }
    return this.executeWithContext(
      `git push ${remote} ${branch}`,
      `Uploading your commits to ${remote}/${branch} on the remote server`
    );
  }

  async pull(remote = 'origin', branch = null) {
    if (!branch) {
      branch = await this.getCurrentBranch();
    }
    return this.executeWithContext(
      `git pull ${remote} ${branch}`,
      `Downloading and merging new commits from ${remote}/${branch}`
    );
  }

  async createBranch(name) {
    return this.executeWithContext(
      `git branch ${name}`,
      `Creating a new branch called "${name}" for isolated development`
    );
  }

  async checkout(branch) {
    return this.executeWithContext(
      `git checkout ${branch}`,
      `Switching your working directory to the "${branch}" branch`
    );
  }

  async getLog(limit = 10) {
    return this.executeWithContext(
      `git log --oneline -n ${limit}`,
      `Showing the last ${limit} commits in your repository's history`
    );
  }

  // ... other methods
}
```

**Update electron.js with credential handling** (same as before)

**Test Point 2:** 
- Open a test Git repository
- Run `git status` via the UI
- Verify output displays correctly WITH educational context

---

### PART 4: Model Download System (Next 30 minutes)

*[Keep same as original plan - no changes needed]*

---

### PART 5: Audio Input Pipeline (Next 45 minutes)

*[Keep same as original plan - VAD and audio capture unchanged]*

---

### PART 6: Speech-to-Text Integration (Next 45 minutes)

**Add narration during STT:**

```javascript
// In stt-service.js
async transcribe(audioBuffer) {
  // Announce what's happening
  await narrationService.announceStep('processing');
  
  const result = await this.whisper.transcribe(audioBuffer);
  
  // Announce what was heard
  await narrationService.announceStep('transcribed', result.text);
  
  return result;
}
```

**Test Point 5:** Voice narration announces "Let me understand that..." then "I heard you say: [transcript]"

---

### PART 7: Intent Parsing with LLM (Next 60 minutes)

**Enhanced intent service with educational context:**

```javascript
// services/intent-service.js
async parseIntent(transcript, context) {
  await narrationService.announceStep('parsing');
  
  const intent = await this.llm.parse(transcript, context);
  
  await narrationService.announceStep('commandIdentified', intent.action);
  
  // Add educational explanation
  intent.explanation = commandExplainer.explainCommand(intent.command);
  
  return intent;
}
```

---

### PART 8: Text-to-Speech Integration (Next 45 minutes)

**Enhanced TTS service for educational announcements:**

```javascript
// services/tts-service.js
class TTSService {
  constructor() {
    this.kokoro = null;
    this.queue = [];
    this.speaking = false;
  }

  async speak(text, priority = false) {
    // Display in UI immediately
    this.updateVoiceFeedbackUI(text);
    
    if (priority) {
      // Interrupt current speech for important announcements
      this.stop();
      this.queue.unshift(text);
    } else {
      this.queue.push(text);
    }
    
    if (!this.speaking) {
      await this.processQueue();
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      this.speaking = true;
      const text = this.queue.shift();
      
      await this.synthesizeAndPlay(text);
    }
    this.speaking = false;
  }

  async synthesizeAndPlay(text) {
    // Generate audio with Kokoro
    const audioBuffer = await this.kokoro.synthesize(text);
    
    // Play through speakers
    await this.playAudio(audioBuffer);
  }

  updateVoiceFeedbackUI(text) {
    // Send to renderer to display
    ipcRenderer.send('voice-feedback', text);
  }

  stop() {
    // Interrupt current playback
    this.speaking = false;
    this.queue = [];
  }
}
```

**Test Point 7:** TTS announces each step with educational context

---

### PART 9: End-to-End Integration with Educational Modal (Next 60 minutes)

**Goal: Connect all services with progressive disclosure teaching**

**Update electron.js main workflow:**

```javascript
const commandModal = new CommandModal();
const narrationService = new NarrationService(ttsService);
const explainer = new CommandExplainer();

async function handleVoiceCommand() {
  try {
    // STEP 1: LISTENING
    updateProgressStep(1);
    await narrationService.announceStep('listening');
    
    uiService.setStatus("listening");
    const audioBuffer = await audioService.recordWithVAD();
    completeProgressStep(1);
    
    // STEP 2: UNDERSTANDING
    updateProgressStep(2);
    await narrationService.announceStep('processing');
    
    const transcript = await sttService.transcribe(audioBuffer);
    uiService.showTranscript(transcript);
    
    await narrationService.announceStep('transcribed', transcript);
    
    // Parse intent
    await narrationService.announceStep('parsing');
    const context = await gitService.getContext();
    const intent = await intentService.parse(transcript, context);
    
    uiService.showCommandPreview(intent);
    await narrationService.announceStep('commandIdentified', intent.action);
    completeProgressStep(2);
    
    // Request confirmation if needed
    if (!intent.safe) {
      const confirmed = await uiService.showConfirmationDialog(intent);
      if (!confirmed) {
        await narrationService.announceStep('cancelled');
        return;
      }
    }
    
    // STEP 3: EXECUTING
    updateProgressStep(3);
    
    // Announce what we're about to do
    const narrator = await narrationService.narrateGitOperation(
      intent.action,
      intent.details
    );
    
    // SHOW THE EDUCATIONAL MODAL
    const commandData = explainer.explainCommand(intent.command);
    commandModal.show({
      ...commandData,
      description: `I'm ${intent.action}ing now. Here's the exact command:`,
      tip: explainer.getTipOfTheDay()
    });
    
    // Execute the Git command
    uiService.setStatus("executing");
    const result = await gitService.executeWithContext(
      intent.command,
      intent.description
    );
    
    // UPDATE MODAL WITH OUTPUT IN REAL-TIME
    commandModal.updateOutput(result.output);
    
    completeProgressStep(3);
    
    // STEP 4: COMPLETE
    updateProgressStep(4);
    
    if (result.success) {
      // Narrate the successful result
      await narrator.success(result.data);
      
      // Educational prompt
      await narrationService.announceStep('learningPrompt');
      
      uiService.showResult(result);
    } else {
      await narrationService.announceStep('error', result.error);
      commandModal.updateOutput(`ERROR: ${result.error}`);
    }
    
    completeProgressStep(4);
    uiService.setStatus("ready");
    
  } catch (error) {
    await narrationService.announceStep('error', error.message);
    uiService.showError(error);
    uiService.setStatus("error");
  }
}

function updateProgressStep(stepNumber) {
  document.querySelectorAll('.step').forEach((el, index) => {
    if (index + 1 === stepNumber) {
      el.classList.add('active');
    } else if (index + 1 < stepNumber) {
      el.classList.add('complete');
      el.classList.remove('active');
    } else {
      el.classList.remove('active', 'complete');
    }
  });
}

function completeProgressStep(stepNumber) {
  const step = document.querySelector(`#step-${getStepName(stepNumber)}`);
  if (step) {
    step.classList.remove('active');
    step.classList.add('complete');
  }
}

function getStepName(num) {
  const names = ['', 'listening', 'understanding', 'executing', 'complete'];
  return names[num];
}
```

**Enhanced Modal Interactions:**

```javascript
// In renderer.js

// Copy command button
document.getElementById('copy-command').addEventListener('click', async () => {
  const command = document.getElementById('command').textContent;
  await navigator.clipboard.writeText(command);
  
  // Visual feedback
  const btn = document.getElementById('copy-command');
  const original = btn.textContent;
  btn.textContent = '✓ Copied!';
  setTimeout(() => btn.textContent = original, 2000);
  
  // Voice feedback
  await narrationService.announceStep('commandExplained');
});

// Learn more button
document.getElementById('learn-more').addEventListener('click', () => {
  const command = document.getElementById('command').textContent;
  const explanation = explainer.explainCommand(command);
  
  // Open Git documentation
  if (explanation.learnMoreUrl) {
    require('electron').shell.openExternal(explanation.learnMoreUrl);
  }
});

// Learning mode toggle
document.getElementById('learn-mode-toggle').addEventListener('click', () => {
  const isEnabled = commandModal.isLearningMode;
  commandModal.setLearningMode(!isEnabled);
  
  const btn = document.getElementById('learn-mode-toggle');
  btn.textContent = `📚 Learning Mode: ${!isEnabled ? 'ON' : 'OFF'}`;
  btn.classList.toggle('disabled', isEnabled);
});
```

**Test Point 8: Complete Educational Voice-to-Git Flow**

**Expected behavior:**
1. Press Cmd+Shift+V
2. Hear: "I'm listening. Tell me what you'd like to do with Git."
3. Say: "show me the status"
4. Progress indicator moves to step 2
5. Hear: "Let me understand that..."
6. See transcript: "show me the status"
7. Hear: "I heard you say: show me the status"
8. Hear: "Converting your request to a Git command..."
9. Hear: "Got it. You want to check status."
10. Progress moves to step 3
11. Hear: "Let me check the repository status for you"
12. **Modal appears showing:**
    - "What I'm Doing: Checking which files have changed"
    - Terminal showing: `$ git status --short --branch`
    - Command breakdown explaining each part
    - Live output appearing
    - Tip of the day
13. Hear: "You're on the main branch. 3 files have changes. Check the modal to see the exact command I used."
14. Progress moves to step 4
15. Hear: "The command modal shows exactly what I did. Would you like me to explain it?"
16. Modal remains open for learning

---

### PART 10: Polish & Error Handling (Next 30 minutes)

**Add educational error messages:**

```javascript
const EDUCATIONAL_ERRORS = {
  noChangesToCommit: {
    voice: "There are no changes to commit. You need to modify some files first, then use 'git add' to stage them.",
    modal: {
      title: "Learning: Why Can't I Commit?",
      explanation: "Git commits save changes, but you haven't made any yet. The workflow is: 1) Edit files, 2) git add to stage, 3) git commit to save.",
      tip: "Try making a change to a file first, then I'll help you commit it."
    }
  },
  
  authenticationFailed: {
    voice: "Authentication failed. This means Git couldn't verify your identity. Let's set up your credentials.",
    modal: {
      title: "Learning: Git Authentication",
      explanation: "When pushing to remote repositories, Git needs to confirm you have permission. This uses either SSH keys or personal access tokens.",
      tip: "Go to Settings to add your GitHub token."
    }
  },
  
  mergConflict: {
    voice: "There's a merge conflict. This happens when the same code was changed in two different ways. Don't worry, we can resolve it.",
    modal: {
      title: "Learning: Merge Conflicts",
      explanation: "Git found conflicting changes that it can't automatically merge. You'll need to manually choose which version to keep.",
      tip: "Look for files marked with <<<<<<< and ======= markers. Edit them to keep the code you want."
    }
  }
};
```

**Add contextual help:**

```javascript
// In command-modal.js
showContextualHelp(gitAction, error) {
  const helpContent = {
    commit: {
      title: "About Git Commits",
      content: "A commit is like a snapshot of your project at a specific point in time. Each commit should represent one logical change.",
      examples: [
        "✓ Good: 'Fix login button alignment'",
        "✗ Bad: 'Changed stuff'",
        "✓ Good: 'Add user authentication'",
        "✗ Bad: 'Updates'"
      ]
    },
    push: {
      title: "About Pushing",
      content: "Push uploads your local commits to a remote server (like GitHub) so others can see your work.",
      workflow: [
        "1. Make commits locally",
        "2. Pull latest changes (git pull)",
        "3. Push your commits (git push)"
      ]
    }
    // ... more help content
  };
  
  // Display in modal
  this.showHelpSection(helpContent[gitAction]);
}
```

**Add "Practice Mode":**

```javascript
// Allow users to practice commands without executing
class PracticeMode {
  constructor() {
    this.enabled = false;
  }

  async simulateCommand(command) {
    // Don't execute, just show what would happen
    const simulation = this.simulateGitCommand(command);
    
    await narrationService.speak(
      `In practice mode. This would ${simulation.description}. The actual command is ${command}`
    );
    
    commandModal.show({
      ...simulation,
      isPractice: true
    });
  }

  simulateGitCommand(command) {
    // Return simulated output
    if (command.includes('git status')) {
      return {
        description: "show the current status",
        output: "On branch main\nYour branch is up to date with 'origin/main'."
      };
    }
    // ... more simulations
  }
}
```

**Test Point 9:** Test all error scenarios with educational feedback

---

### PART 11: Documentation & README (Next 15 minutes)

**Create comprehensive README.md:**

````markdown
# 🎙️ GitVoice - Learn Git Through Voice

GitVoice is an educational desktop application that teaches you Git commands while letting you control your repository with your voice.

## 🎓 Learning Philosophy

GitVoice isn't just voice control - it's a **teaching tool**. Every command you speak:
1. Gets announced step-by-step
2. Shows the exact CLI command in a modal
3. Explains what each part does
4. Provides tips for better Git usage

## ✨ Features

- **🗣️ Voice-Activated Git** - Control Git with natural language
- **📚 Educational Modals** - See exactly what commands are running
- **🔊 Step-by-Step Narration** - Hear explanations of each action
- **🎯 Command Breakdown** - Learn what each part of a command does
- **💡 Tips & Tricks** - Daily Git tips to improve your skills
- **🔒 100% Offline** - All AI runs locally, no cloud required

## 🚀 Quick Start

### Installation
```bash
npm install
npm start
```

### First Use
1. Select a Git repository
2. Press `Cmd+Shift+V` (or `Ctrl+Shift+V` on Windows)
3. Say: "show me the status"
4. Watch and listen as GitVoice teaches you!

## 🎤 Supported Commands

| What to Say | Git Command | What It Does |
|-------------|-------------|--------------|
| "show me the status" | `git status` | Check repository state |
| "commit everything as [message]" | `git add . && git commit -m "[message]"` | Stage and commit all changes |
| "push to origin" | `git push origin [branch]` | Upload commits to remote |
| "pull latest changes" | `git pull origin [branch]` | Download new commits |
| "create branch called [name]" | `git branch [name]` | Create new branch |
| "switch to [branch]" | `git checkout [branch]` | Change branches |
| "show me the log" | `git log --oneline` | View commit history |

## 🎓 Learning Features

### Command Modal
Every Git operation opens an educational modal showing:
- What GitVoice is doing (in plain English)
- The exact CLI command
- Breakdown of each part of the command
- Live output as it happens
- A helpful tip about the command
- "Copy Command" button to try it yourself in terminal

### Voice Narration
GitVoice announces:
- When it's listening
- What it heard you say
- What command it's about to run
- What happened (success or error)
- Tips for next steps

### Progress Indicators
Watch the 4-step process:
1. 🎤 Listening
2. 🧠 Understanding
3. ⚡ Executing
4. ✅ Complete

### Learning Mode
Toggle learning mode on/off:
- **ON**: See modals and detailed narration (recommended for learning)
- **OFF**: Just execute commands quickly (for experienced users)

## ⚙️ Settings

- **Model Selection**: Choose AI models
- **Microphone**: Select input device
- **Hotkey**: Customize activation key
- **Voice Speed**: Adjust TTS speed
- **VAD Sensitivity**: Tune voice detection
- **Credentials**: Manage Git authentication

## 🛡️ Privacy

- **100% Offline**: All AI processing happens on your machine
- **No Data Sent**: Your code never leaves your computer
- **Local Models**: Whisper, Llama, and Kokoro run locally
- **Secure Credentials**: Tokens stored in OS keychain

## 🧪 Practice Mode

Enable Practice Mode to:
- See what commands would do without executing them
- Learn Git commands safely
- Build confidence before real operations

## 📖 Tips for Best Results

- **Speak clearly**: Enunciate your words
- **Be specific**: "commit as fix login bug" not just "commit"
- **Wait for prompt**: Let GitVoice finish speaking
- **Use learning mode**: Keep it on until comfortable
- **Read the modals**: They contain valuable information
- **Try it in terminal**: Copy commands and practice

## 🔧 Troubleshooting

**Voice not recognized?**
- Check microphone permissions
- Adjust VAD sensitivity in settings
- Speak more slowly and clearly

**Commands not executing?**
- Verify you're in a Git repository
- Check credentials in settings
- Look at the error modal for guidance

**Modal too distracting?**
- Toggle Learning Mode off
- You can always turn it back on

## 🎯 Learning Path

**Week 1**: Use with Learning Mode ON
- Focus on status, add, commit
- Read every modal
- Copy commands and try in terminal

**Week 2**: Try more complex operations
- Branching and merging
- Pushing and pulling
- Resolving conflicts

**Week 3**: Toggle Learning Mode OFF occasionally
- Test your knowledge
- Use modals only when uncertain

**Week 4**: Confident CLI user!
- Use terminal directly when faster
- Use GitVoice for convenience
- Teach others what you learned

## 🤝 Contributing

Found a bug? Have an idea? We'd love your feedback!

## 📝 License

MIT License - Learn Git, Share Knowledge

---

Made with ❤️ for developers who want to learn Git the fun way
````

---

### PART 12: Testing & Package (Final 30 minutes)

**Create comprehensive test scenarios:**

```javascript
// test/educational-flow.test.js

describe('Educational Flow Tests', () => {
  test('Voice command triggers narration', async () => {
    const narrations = [];
    narrationService.on('speak', (text) => narrations.push(text));
    
    await handleVoiceCommand('show me the status');
    
    expect(narrations).toContain("I'm listening");
    expect(narrations).toContain("Let me understand that");
    expect(narrations).toContain(/I heard you say/);
  });

  test('Modal displays for every Git command', async () => {
    const modalShown = jest.spyOn(commandModal, 'show');
    
    await handleVoiceCommand('commit as test');
    
    expect(modalShown).toHaveBeenCalled();
    expect(modalShown).toHaveBeenCalledWith(
      expect.objectContaining({
        command: expect.stringContaining('git commit'),
        breakdown: expect.any(Array)
      })
    );
  });

  test('Command explainer provides accurate breakdowns', () => {
    const explanation = explainer.explainCommand('git add .');
    
    expect(explanation.breakdown).toHaveLength(3);
    expect(explanation.breakdown[0].command).toBe('git');
    expect(explanation.breakdown[1].command).toBe('add');
    expect(explanation.breakdown[2].command).toBe('.');
  });

  test('Learning mode can be toggled', () => {
    commandModal.setLearningMode(false);
    const result = commandModal.show({});
    expect(result).toBe(false); // Should not show
    
    commandModal.setLearningMode(true);
    // Should show modal
  });
});
```

**Manual testing checklist with educational focus:**

```markdown
## Educational Feature Testing

### Voice Narration
- [ ] Announces "I'm listening" when activated
- [ ] Announces what was heard
- [ ] Announces what action will be taken
- [ ] Narrates during execution
- [ ] Announces success/failure
- [ ] Offers learning prompts

### Command Modal
- [ ] Appears for every Git command
- [ ] Shows accurate command
- [ ] Breaks down command parts correctly
- [ ] Displays live output
- [ ] Shows relevant tip
- [ ] Copy button works
- [ ] Learn more button opens docs

### Progress Indicators
- [ ] All 4 steps show correctly
- [ ] Active step highlighted
- [ ] Completed steps marked
- [ ] Smooth transitions

### Learning Mode
- [ ] Toggle works
- [ ] Modal doesn't show when off
- [ ] Narration continues when off
- [ ] Settings persist

### Error Education
- [ ] Errors explained in plain English
- [ ] Helpful suggestions provided
- [ ] Commands shown in errors
- [ ] Recovery steps clear

### Command Explainer
- [ ] Accurate for common commands
- [ ] Breakdown makes sense
- [ ] Tips are relevant
- [ ] Documentation links work
```

---

## Session Deliverables

### Working Educational Prototype with:
✅ Voice-activated Git control
✅ **Step-by-step voice narration** of every action
✅ **Educational modal** showing commands in real-time
✅ **Command breakdown** explaining each part
✅ **Progress indicators** showing the workflow
✅ **Live output display** in terminal-style modal
✅ **Copy commands** to practice in terminal
✅ **Learning tips** for better Git usage
✅ **Toggle learning mode** for advanced users
✅ **Error education** with helpful explanations
✅ Comprehensive documentation

---

## Educational Features Summary

### What Makes This a Teaching Tool

1. **Progressive Disclosure**
   - Users hear what's happening before seeing code
   - Commands revealed incrementally
   - Explanations provided at each step

2. **Multi-Modal Learning**
   - **Audio**: Voice narration
   - **Visual**: Command modal with syntax highlighting
   - **Text**: Breakdown explanations
   - **Interactive**: Copy and try yourself

3. **Scaffolded Experience**
   - Learning Mode ON for beginners
   - Gradually reduce assistance
   - Eventually use CLI directly

4. **Real-Time Feedback**
   - See commands as they execute
   - Understand cause and effect
   - Build mental model of Git

---

## Estimated Session Timeline

| Phase | Duration | Cumulative | Educational Focus |
|-------|----------|------------|-------------------|
| Project setup | 10 min | 0:10 | Structure for teaching components |
| Electron shell + UI | 30 min | 0:40 | **Educational UI, modal, progress** |
| Git integration | 30 min | 1:10 | **Context & explanations** |
| Model downloader | 30 min | 1:40 | Standard |
| Audio input | 45 min | 2:25 | Standard |
| Speech-to-text | 45 min | 3:10 | **With narration** |
| Intent parsing | 60 min | 4:10 | **With educational context** |
| Text-to-speech | 45 min | 4:55 | **Enhanced announcements** |
| Integration | 60 min | 5:55 | **Complete educational flow** |
| Polish & errors | 30 min | 6:25 | **Educational error handling** |
| Documentation | 15 min | 6:40 | **Learning-focused README** |
| Testing | 30 min | 7:10 | **Test educational features** |

**Total: ~7 hours** (includes buffer)

---

## Success Criteria

At end of session, the complete educational flow should work:

**User Journey:**
1. Press hotkey
2. **Hear**: "I'm listening. Tell me what you'd like to do with Git."
3. Say: "commit everything as initial setup"
4. **See**: Progress move to "Understanding"
5. **Hear**: "I heard you say: commit everything as initial setup"
6. **Hear**: "Got it. You want to commit."
7. **See**: Progress move to "Executing"
8. **Hear**: "I'm creating a commit with your changes"
9. **See**: Modal opens showing:
   ```
   What I'm Doing: Creating a snapshot of your staged changes
   
   The Command:
   $ git add .
   $ git commit -m "initial setup"
   
   Breakdown:
   - git add . → Stage all changed files
   - git commit → Save staged changes
   - -m "initial setup" → Add this message
   
   Output:
   [main f7a9c2e] initial setup
    3 files changed, 45 insertions(+)
   
   💡 Tip: Write commit messages in present tense
   ```
10. **Hear**: "Successfully committed with message 'initial setup'. The modal shows the exact git command I used."
11. **See**: Progress complete
12. **User clicks**: "Copy Command"
13. **User opens terminal**: Tries it themselves!

This demonstrates that GitVoice successfully teaches Git while automating it.

---

This enhanced plan creates GitVoice as a **true educational tool** that doesn't just execute commands, but actively teaches users how Git works through voice narration and visual command displays!