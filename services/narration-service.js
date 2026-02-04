// NarrationService - Manages educational voice announcements throughout the workflow

class NarrationService {
  constructor(ttsService) {
    this.tts = ttsService;
    this.narrationsEnabled = true;
    this.verbosity = 'normal'; // 'minimal', 'normal', 'detailed'
    this.voiceFeedbackEl = document.getElementById('voice-text');
  }

  // Announce each step of the process
  async announceStep(step, context = {}) {
    if (!this.narrationsEnabled) return;

    const narrations = {
      // Listening phase
      listening: "I'm listening. Tell me what you'd like to do with Git.",

      // Processing phase
      processing: 'Let me understand that...',
      transcribed: (text) => `I heard you say: ${text}`,

      // Parsing phase
      parsing: 'Converting your request to a Git command...',
      commandIdentified: (action) => `Got it. You want to ${action}.`,

      // Pre-execution
      preparing: (command) => {
        if (this.verbosity === 'detailed') {
          return `I'm about to run the command: ${command}`;
        }
        return 'Preparing to execute...';
      },

      // Execution phase
      executing: (action) => `${action} now...`,

      // Post-execution
      success: (action, details) => `Successfully ${action}. ${details || ''}`,
      error: (error) => `I encountered an error: ${error}. Let me explain what went wrong.`,

      // Learning prompts
      learningPrompt: 'The command modal shows exactly what I did. Would you like me to explain it?',
      commandExplained: 'This command is now displayed in the learning modal.',

      // Cancellation
      cancelled: 'Command cancelled.',

      // Ready state
      ready: 'Ready for your next command.'
    };

    let message;
    if (typeof narrations[step] === 'function') {
      message = narrations[step](context);
    } else {
      message = narrations[step];
    }

    if (message) {
      await this.speak(message);
    }
  }

  // Create rich, educational narrations for specific Git operations
  async narrateGitOperation(operation, details = {}) {
    const operationNarrations = {
      status: {
        start: 'Let me check the repository status for you',
        success: (data) => {
          const { branch, modified, staged, untracked } = data;
          let msg = `You're on the ${branch || 'main'} branch. `;
          if (modified > 0) msg += `${modified} file${modified > 1 ? 's have' : ' has'} changes. `;
          if (staged > 0) msg += `${staged} file${staged > 1 ? 's are' : ' is'} staged for commit. `;
          if (untracked > 0) msg += `${untracked} new file${untracked > 1 ? 's aren\'t' : ' isn\'t'} tracked yet. `;
          if (modified === 0 && staged === 0 && untracked === 0) msg += 'Your working directory is clean.';
          return msg + ' Check the modal to see the exact command I used.';
        }
      },

      commit: {
        start: "I'm creating a commit with your changes",
        success: (data) =>
          `Committed successfully with message: "${data.message}". Your changes are now saved in Git history. The modal shows the exact git commit command.`
      },

      push: {
        start: 'Pushing your commits to the remote repository',
        success: (data) =>
          `Successfully pushed to ${data.remote || 'origin'} ${data.branch || 'your branch'}. Your code is now on the remote. I used git push, which you can see in the modal.`
      },

      pull: {
        start: 'Fetching and merging changes from the remote repository',
        success: (data) =>
          `Pulled successfully. Your local branch is now up to date. Check the modal for the git pull command details.`
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
      },

      add: {
        start: 'Staging your changes',
        success: () =>
          'Files staged successfully. They are now ready to be committed. The modal shows the git add command.'
      },

      log: {
        start: 'Fetching commit history',
        success: () =>
          'Here is your recent commit history. Each line shows a commit ID and message.'
      },

      diff: {
        start: 'Checking for changes',
        success: () =>
          'Here are the differences in your files. Added lines are shown in green, removed in red.'
      }
    };

    const narration = operationNarrations[operation];
    if (!narration) return null;

    // Announce start
    const startMessage = typeof narration.start === 'function'
      ? narration.start(details.name || details)
      : narration.start;

    await this.speak(startMessage);

    return {
      success: async (data) => {
        const successMessage = typeof narration.success === 'function'
          ? narration.success(data)
          : narration.success;
        await this.speak(successMessage);
      }
    };
  }

  async speak(text) {
    // Update UI immediately
    this.updateVoiceFeedbackUI(text);

    // Speak using TTS service
    if (this.tts && this.tts.speak) {
      await this.tts.speak(text);
    }
  }

  updateVoiceFeedbackUI(text) {
    if (this.voiceFeedbackEl) {
      this.voiceFeedbackEl.textContent = text;

      const container = document.getElementById('voice-feedback');
      if (container) {
        container.classList.add('speaking');

        // Remove after speech completes (estimate based on text length)
        const duration = Math.min((text.length * 60) + 1000, 10000); // ~60ms per char, max 10s
        setTimeout(() => {
          container.classList.remove('speaking');
        }, duration);
      }
    }
  }

  setVerbosity(level) {
    this.verbosity = level; // 'minimal', 'normal', 'detailed'
  }

  setEnabled(enabled) {
    this.narrationsEnabled = enabled;
  }

  isEnabled() {
    return this.narrationsEnabled;
  }
}

// Make available globally
window.NarrationService = NarrationService;
