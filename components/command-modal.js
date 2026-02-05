// CommandModal - Educational modal for displaying Git commands

class CommandModal {
  constructor() {
    this.modal = document.getElementById('command-modal');
    this.isLearningMode = true;
    this.currentCommand = null;

    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.elements = {
      modal: document.getElementById('command-modal'),
      actionDescription: document.getElementById('action-description'),
      command: document.getElementById('command'),
      commandParts: document.getElementById('command-parts'),
      commandOutput: document.getElementById('command-output'),
      learningTip: document.getElementById('learning-tip'),
      closeModal: document.getElementById('close-modal'),
      modalClose: document.getElementById('modal-close'),
      copyCommand: document.getElementById('copy-command'),
      learnMore: document.getElementById('learn-more')
    };
  }

  bindEvents() {
    // Close modal buttons
    if (this.elements.closeModal) {
      this.elements.closeModal.addEventListener('click', () => this.close());
    }
    if (this.elements.modalClose) {
      this.elements.modalClose.addEventListener('click', () => this.close());
    }

    // Click overlay to close
    const overlay = this.modal?.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }

    // Copy command button
    if (this.elements.copyCommand) {
      this.elements.copyCommand.addEventListener('click', () => this.copyCommand());
    }

    // Learn more button
    if (this.elements.learnMore) {
      this.elements.learnMore.addEventListener('click', () => this.openLearnMore());
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  show(commandData) {
    if (!this.isLearningMode || !this.modal) return false;

    this.currentCommand = commandData;

    // Set action description
    if (this.elements.actionDescription) {
      this.elements.actionDescription.textContent = commandData.description || 'Executing Git command...';
    }

    // Set command
    if (this.elements.command) {
      this.elements.command.textContent = commandData.command || '';
    }

    // Break down command parts
    if (commandData.breakdown) {
      this.renderCommandBreakdown(commandData.breakdown);
    }

    // Set learning tip
    const tipContainer = this.modal.querySelector('.learning-tip');
    if (this.elements.learningTip && commandData.tip) {
      this.elements.learningTip.textContent = commandData.tip;
      if (tipContainer) tipContainer.style.display = 'block';
    } else {
      if (tipContainer) tipContainer.style.display = 'none';
    }

    // Clear output
    if (this.elements.commandOutput) {
      this.elements.commandOutput.textContent = 'Waiting for output...';
    }

    // Show modal
    this.modal.classList.remove('hidden');

    return true;
  }

  updateOutput(output) {
    if (this.elements.commandOutput) {
      this.elements.commandOutput.textContent = output || 'No output';

      // Auto-scroll to bottom
      this.elements.commandOutput.scrollTop = this.elements.commandOutput.scrollHeight;
    }
  }

  appendOutput(text) {
    if (this.elements.commandOutput) {
      const currentOutput = this.elements.commandOutput.textContent;
      if (currentOutput === 'Waiting for output...') {
        this.elements.commandOutput.textContent = text;
      } else {
        this.elements.commandOutput.textContent += '\n' + text;
      }
      this.elements.commandOutput.scrollTop = this.elements.commandOutput.scrollHeight;
    }
  }

  renderCommandBreakdown(breakdown) {
    if (!this.elements.commandParts) return;

    if (!breakdown || breakdown.length === 0) {
      this.elements.commandParts.innerHTML = '<p class="placeholder">Command breakdown not available</p>';
      return;
    }

    this.elements.commandParts.innerHTML = breakdown.map(part => `
      <div class="command-part">
        <code>${this.escapeHtml(part.command)}</code>
        <p>${this.escapeHtml(part.explanation)}</p>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async copyCommand() {
    if (!this.currentCommand?.command) return;

    try {
      await window.clipboardAPI.writeText(this.currentCommand.command);

      // Visual feedback
      const btn = this.elements.copyCommand;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="copy-icon">&#10004;</span> Copied!';
      btn.classList.add('copied');

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy command:', error);
    }
  }

  openLearnMore() {
    if (this.currentCommand?.learnMoreUrl) {
      window.electronAPI.openExternal(this.currentCommand.learnMoreUrl);
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }

  setLearningMode(enabled) {
    this.isLearningMode = enabled;
  }

  showError(errorData) {
    if (!this.modal) return;

    // Update modal for error display
    if (this.elements.actionDescription) {
      this.elements.actionDescription.innerHTML = `
        <span style="color: #f56565;">&#9888;</span>
        ${errorData.title || 'An Error Occurred'}
      `;
    }

    if (this.elements.command) {
      this.elements.command.textContent = errorData.command || '';
    }

    if (this.elements.commandOutput) {
      this.elements.commandOutput.innerHTML = `
        <span style="color: #f56565;">ERROR: ${this.escapeHtml(errorData.message || 'Unknown error')}</span>
      `;
    }

    if (this.elements.learningTip && errorData.tip) {
      this.elements.learningTip.textContent = errorData.tip;
    }

    // Show explanation in breakdown area
    if (this.elements.commandParts && errorData.explanation) {
      this.elements.commandParts.innerHTML = `
        <div class="command-part" style="border-color: #f56565;">
          <code style="color: #f56565;">What went wrong</code>
          <p>${this.escapeHtml(errorData.explanation)}</p>
        </div>
      `;
    }

    this.modal.classList.remove('hidden');
  }

  showSuccess(successData) {
    if (this.elements.commandOutput) {
      this.elements.commandOutput.innerHTML = `
        <span style="color: #48bb78;">&#10004;</span> ${this.escapeHtml(successData.message || 'Command completed successfully')}
        ${successData.output ? '\n\n' + this.escapeHtml(successData.output) : ''}
      `;
    }
  }

  // Contextual help for specific Git actions
  showContextualHelp(gitAction, error = null) {
    const helpContent = this.getHelpContent(gitAction);
    if (!helpContent) return;

    // Create help section HTML
    const helpHtml = `
      <div class="contextual-help">
        <h3 class="help-title">${helpContent.title}</h3>
        <p class="help-description">${helpContent.content}</p>

        ${helpContent.examples ? `
          <div class="help-examples">
            <h4>Examples:</h4>
            <ul>
              ${helpContent.examples.map(ex => `<li>${this.escapeHtml(ex)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${helpContent.workflow ? `
          <div class="help-workflow">
            <h4>Workflow:</h4>
            <ol>
              ${helpContent.workflow.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
            </ol>
          </div>
        ` : ''}

        ${helpContent.commonErrors ? `
          <div class="help-errors">
            <h4>Common Issues:</h4>
            <ul>
              ${helpContent.commonErrors.map(err => `
                <li>
                  <strong>${this.escapeHtml(err.error)}</strong>
                  <p>${this.escapeHtml(err.solution)}</p>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${helpContent.relatedCommands ? `
          <div class="help-related">
            <h4>Related Commands:</h4>
            <div class="related-commands">
              ${helpContent.relatedCommands.map(cmd => `
                <code class="related-cmd">${this.escapeHtml(cmd)}</code>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Show in the command parts area or create a new section
    if (this.elements.commandParts) {
      this.elements.commandParts.innerHTML = helpHtml;
    }

    this.modal.classList.remove('hidden');
  }

  getHelpContent(gitAction) {
    const helpDatabase = {
      status: {
        title: 'About Git Status',
        content: 'The status command shows the current state of your working directory and staging area. It tells you which changes have been staged, which haven\'t, and which files aren\'t being tracked.',
        examples: [
          'git status - Full status output',
          'git status --short - Compact format',
          'git status -sb - Short format with branch info'
        ],
        workflow: [
          'Run git status before making commits',
          'Check which files are staged vs unstaged',
          'Identify untracked files that need to be added'
        ],
        relatedCommands: ['git add', 'git diff', 'git commit']
      },

      commit: {
        title: 'About Git Commits',
        content: 'A commit is like a snapshot of your project at a specific point in time. Each commit should represent one logical change and include a descriptive message.',
        examples: [
          "✓ Good: 'Fix login button alignment'",
          "✓ Good: 'Add user authentication feature'",
          "✗ Bad: 'Changed stuff'",
          "✗ Bad: 'Updates'"
        ],
        workflow: [
          'Make changes to your files',
          'Use git add to stage changes',
          'Use git commit -m "message" to save',
          'Write a clear, present-tense message'
        ],
        commonErrors: [
          {
            error: 'Nothing to commit',
            solution: 'You need to stage changes first with "git add"'
          },
          {
            error: 'Empty commit message',
            solution: 'Always provide a descriptive message with -m "message"'
          }
        ],
        relatedCommands: ['git add', 'git status', 'git log']
      },

      push: {
        title: 'About Pushing',
        content: 'Push uploads your local commits to a remote repository (like GitHub) so others can see your work and collaborate.',
        examples: [
          'git push origin main - Push to main branch',
          'git push -u origin feature - Push and set upstream',
          'git push --force - Force push (use carefully!)'
        ],
        workflow: [
          'Pull latest changes first (git pull)',
          'Make and commit your changes locally',
          'Push to share with your team'
        ],
        commonErrors: [
          {
            error: 'Rejected - non-fast-forward',
            solution: 'Pull and merge remote changes first, then push again'
          },
          {
            error: 'Authentication failed',
            solution: 'Check your credentials in Settings'
          }
        ],
        relatedCommands: ['git pull', 'git fetch', 'git remote']
      },

      pull: {
        title: 'About Pulling',
        content: 'Pull downloads commits from a remote repository and merges them into your current branch. It\'s essentially git fetch + git merge.',
        examples: [
          'git pull origin main - Pull from main',
          'git pull --rebase - Pull with rebase instead of merge',
          'git pull --no-commit - Pull without auto-commit'
        ],
        workflow: [
          'Always pull before starting new work',
          'Pull before pushing to avoid conflicts',
          'Resolve any merge conflicts that arise'
        ],
        commonErrors: [
          {
            error: 'Merge conflict',
            solution: 'Edit conflicting files, remove markers, then commit'
          },
          {
            error: 'Local changes would be overwritten',
            solution: 'Commit or stash your changes first'
          }
        ],
        relatedCommands: ['git push', 'git fetch', 'git merge', 'git stash']
      },

      branch: {
        title: 'About Branches',
        content: 'Branches let you work on different features independently. Each branch is a separate line of development that can later be merged.',
        examples: [
          'git branch - List all branches',
          'git branch feature-name - Create new branch',
          'git branch -d branch-name - Delete branch',
          'git branch -m old-name new-name - Rename branch'
        ],
        workflow: [
          'Create a branch for each feature or bugfix',
          'Keep main/master branch stable',
          'Merge branches when features are complete',
          'Delete branches after merging'
        ],
        commonErrors: [
          {
            error: 'Branch already exists',
            solution: 'Choose a different name or delete the existing branch'
          },
          {
            error: 'Cannot delete checked out branch',
            solution: 'Switch to another branch first, then delete'
          }
        ],
        relatedCommands: ['git checkout', 'git merge', 'git switch']
      },

      checkout: {
        title: 'About Checkout',
        content: 'Checkout switches between branches or restores files. It changes your working directory to match the target branch or commit.',
        examples: [
          'git checkout main - Switch to main branch',
          'git checkout -b new-branch - Create and switch to new branch',
          'git checkout -- file.txt - Discard changes to a file'
        ],
        workflow: [
          'Commit or stash changes before switching',
          'Use checkout -b to create and switch in one command',
          'Use checkout -- to undo file changes (careful!)'
        ],
        commonErrors: [
          {
            error: 'Local changes would be overwritten',
            solution: 'Commit, stash, or discard your changes first'
          },
          {
            error: 'Branch not found',
            solution: 'Check branch name spelling, or fetch from remote'
          }
        ],
        relatedCommands: ['git branch', 'git switch', 'git stash']
      },

      add: {
        title: 'About Staging (git add)',
        content: 'The add command stages changes for the next commit. It moves changes from your working directory to the staging area.',
        examples: [
          'git add . - Stage all changes',
          'git add file.txt - Stage specific file',
          'git add *.js - Stage all JS files',
          'git add -p - Stage interactively (by hunks)'
        ],
        workflow: [
          'Review changes with git diff',
          'Stage relevant changes with git add',
          'Verify with git status',
          'Commit the staged changes'
        ],
        relatedCommands: ['git status', 'git diff', 'git commit', 'git reset']
      },

      log: {
        title: 'About Git Log',
        content: 'The log command shows the commit history. You can see who made changes, when, and why.',
        examples: [
          'git log - Full log',
          'git log --oneline - Compact format',
          'git log --graph - Show branch graph',
          'git log -n 5 - Show last 5 commits'
        ],
        workflow: [
          'Use log to understand project history',
          'Find commits to revert or cherry-pick',
          'Track down when bugs were introduced'
        ],
        relatedCommands: ['git show', 'git diff', 'git blame']
      },

      diff: {
        title: 'About Git Diff',
        content: 'The diff command shows the differences between commits, branches, or your working directory and staging area.',
        examples: [
          'git diff - Show unstaged changes',
          'git diff --staged - Show staged changes',
          'git diff main..feature - Compare branches',
          'git diff HEAD~2 - Compare with 2 commits ago'
        ],
        workflow: [
          'Use diff before committing to review changes',
          'Compare branches before merging',
          'Understand what changed between commits'
        ],
        relatedCommands: ['git status', 'git log', 'git show']
      },

      merge: {
        title: 'About Merging',
        content: 'Merge integrates changes from one branch into another. It combines the commit histories of both branches.',
        examples: [
          'git merge feature - Merge feature into current branch',
          'git merge --no-ff feature - Force merge commit',
          'git merge --abort - Cancel a conflicted merge'
        ],
        workflow: [
          'Switch to the target branch (e.g., main)',
          'Pull latest changes',
          'Merge the feature branch',
          'Resolve any conflicts',
          'Push the merged result'
        ],
        commonErrors: [
          {
            error: 'Merge conflict',
            solution: 'Edit files to resolve conflicts, then git add and commit'
          },
          {
            error: 'Already up to date',
            solution: 'The branch has already been merged'
          }
        ],
        relatedCommands: ['git branch', 'git rebase', 'git pull']
      },

      stash: {
        title: 'About Git Stash',
        content: 'Stash temporarily saves your uncommitted changes so you can work on something else, then restore them later.',
        examples: [
          'git stash - Save changes',
          'git stash pop - Restore and remove from stash',
          'git stash list - Show all stashes',
          'git stash drop - Delete a stash'
        ],
        workflow: [
          'Stash when you need to switch branches urgently',
          'Stash before pulling if you have local changes',
          'Pop your stash when ready to continue'
        ],
        relatedCommands: ['git checkout', 'git branch', 'git status']
      }
    };

    return helpDatabase[gitAction] || null;
  }

  // Show practice mode simulation
  showPracticeSimulation(simulation) {
    if (!this.modal) return;

    // Update header to show practice mode
    const headerEl = this.modal.querySelector('.modal-header h2');
    if (headerEl) {
      headerEl.innerHTML = '<span class="modal-icon">&#127891;</span> Practice Mode: Simulated Output';
    }

    if (this.elements.actionDescription) {
      this.elements.actionDescription.innerHTML = `
        <span style="color: #ed8936;">&#9888; PRACTICE MODE</span> - No actual changes made
        <br><br>
        <strong>This command would:</strong> ${this.escapeHtml(simulation.wouldDo)}
      `;
    }

    if (this.elements.command) {
      this.elements.command.textContent = simulation.command;
    }

    if (this.elements.commandOutput) {
      this.elements.commandOutput.innerHTML = `
        <span style="color: #718096;">[Simulated Output]</span>\n\n${this.escapeHtml(simulation.output)}
      `;
    }

    // Show side effects
    if (this.elements.commandParts && simulation.sideEffects) {
      this.elements.commandParts.innerHTML = `
        <div class="side-effects">
          <h4>What would happen:</h4>
          <ul>
            ${simulation.sideEffects.map(effect => `
              <li>${this.escapeHtml(effect)}</li>
            `).join('')}
          </ul>
        </div>
        ${simulation.warning ? `
          <div class="practice-warning">
            <strong>&#9888; Warning:</strong> ${this.escapeHtml(simulation.warning)}
          </div>
        ` : ''}
      `;
    }

    if (this.elements.learningTip) {
      this.elements.learningTip.textContent = simulation.safe
        ? 'This is a safe command that only reads data.'
        : 'This command would modify your repository. Be careful in real usage!';
    }

    this.modal.classList.remove('hidden');
  }
}

// Make available globally
window.CommandModal = CommandModal;
