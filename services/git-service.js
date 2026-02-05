// GitService - Git operations with educational context

class GitService {
  constructor() {
    this.explainer = new CommandExplainer();
    this.hasExecutedCommand = false;
  }

  // Each operation returns both result and educational context
  async executeWithContext(command, description) {
    const startTime = Date.now();

    // Build educational context
    const context = this.explainer.explainCommand(command);
    context.description = description; // Override with natural language

    try {
      // Parse command to get args
      const parts = command.split(' ');
      const args = parts.slice(1); // Remove 'git'

      // Execute via IPC
      const result = await window.electronAPI.gitExecute(command, args);
      const duration = Date.now() - startTime;

      if (result.success) {
        this.hasExecutedCommand = true;
      }

      let output = result.output || result.error;

      // Add helpful tip for authentication errors
      if (!result.success && output && (output.includes('403') || output.toLowerCase().includes('permission denied'))) {
        output += '\n\n[Auth Tip] This looks like a permission issue. Please verify your GitHub Credentials in the Settings panel.';
      }

      return {
        success: result.success,
        output: output,
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
    try {
      const result = await window.electronAPI.gitStatus();

      return {
        ...result,
        command: 'git status --short --branch',
        context: this.explainer.explainCommand('git status --short --branch')
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async add(files = '.') {
    const command = `git add ${files}`;
    const description = files === '.'
      ? 'Staging all changed files for your next commit'
      : `Staging ${files} for your next commit`;

    try {
      const result = await window.electronAPI.gitAdd(files);
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async commit(message) {
    const command = `git commit -m "${message}"`;
    const description = `Creating a snapshot of your staged changes with the message "${message}"`;

    try {
      const result = await window.electronAPI.gitCommit(message);
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async push(remote = 'origin', branch = null) {
    try {
      const result = await window.electronAPI.gitPush({ remote, branch });
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      const actualBranch = result.data?.branch || branch || 'current branch';
      const command = `git push ${remote} ${actualBranch}`;

      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: `Uploading your commits to ${remote}/${actualBranch} on the remote server`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async pull(remote = 'origin', branch = null) {
    try {
      const result = await window.electronAPI.gitPull({ remote, branch });
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      const actualBranch = result.data?.branch || branch || 'current branch';
      const command = `git pull ${remote} ${actualBranch}`;

      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: `Downloading and merging new commits from ${remote}/${actualBranch}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createBranch(name) {
    const command = `git branch ${name}`;
    const description = `Creating a new branch called "${name}" for isolated development`;

    try {
      const result = await window.electronAPI.gitBranch({ name });
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkout(branch) {
    const command = `git checkout ${branch}`;
    const description = `Switching your working directory to the "${branch}" branch`;

    try {
      const result = await window.electronAPI.gitCheckout(branch);
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async clone(url, targetPath) {
    const command = `git clone ${url}`;
    const description = `Cloning repository from ${url} to ${targetPath}`;

    try {
      const result = await window.electronAPI.gitClone({ url, targetPath });
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async merge(branch) {
    const command = `git merge ${branch}`;
    const description = `Merging branch ${branch} into current branch`;

    try {
      const result = await window.electronAPI.gitMerge(branch);
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async stash(action, name = null) {
    const command = action === 'pop' ? 'git stash pop' : (action === 'list' ? 'git stash list' : `git stash push -m "${name || 'Update'}"`);
    const description = action === 'pop' ? 'Applying stashed changes' : (action === 'list' ? 'Listing stashed changes' : 'Stashing current changes');

    try {
      const result = await window.electronAPI.gitStash({ action, name });
      if (result.success) {
        this.hasExecutedCommand = true;
      }
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getLog(limit = 10) {
    const command = `git log --oneline -n${limit}`;
    const description = `Showing the last ${limit} commits in your repository's history`;

    try {
      const result = await window.electronAPI.gitLog(limit);
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getDiff(options = {}) {
    const command = options.staged ? 'git diff --staged' : 'git diff';
    const description = options.staged
      ? 'Showing changes that are staged for commit'
      : 'Showing unstaged changes in your working directory';

    try {
      const result = await window.electronAPI.gitDiff(options);
      return {
        ...result,
        context: this.explainer.explainCommand(command),
        description: description
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Parse status output for UI display
  parseStatusOutput(output) {
    const lines = output.split('\n').filter(l => l.trim());
    const files = [];

    lines.forEach(line => {
      if (line.startsWith('##')) return; // Skip branch line

      const status = line.substring(0, 2);
      const filename = line.substring(3);

      let type = 'unknown';
      if (status.includes('M')) type = 'modified';
      else if (status.includes('A')) type = 'staged';
      else if (status === '??') type = 'untracked';
      else if (status.includes('D')) type = 'deleted';
      else if (status.includes('R')) type = 'renamed';

      files.push({ status, filename, type });
    });

    return files;
  }

  // Get context for LLM intent parsing
  async getContext() {
    // Run fast branch check and only full status if we've run a command
    const branchPromise = window.electronAPI.gitCurrentBranch();
    const statusPromise = this.hasExecutedCommand ? this.getStatus() : Promise.resolve({ success: false, error: 'Initial status deferred' });

    // We want to be as fast as possible for the UI "Converting..." step
    // So we race them, but we prioritize the lightweight branch check

    const [branchResult, statusResult] = await Promise.allSettled([
      branchPromise,
      statusPromise
    ]);

    let branch = 'HEAD';
    let hasContext = false;
    let stats = { modified: 0, staged: 0, untracked: 0, clean: false };

    // 1. Try to get branch from fast check (most reliable for speed)
    if (branchResult.status === 'fulfilled' && branchResult.value.success) {
      branch = branchResult.value.branch;
      hasContext = true;
    }

    // 2. Try to get full stats if available (might have timed out or deferred)
    if (statusResult.status === 'fulfilled' && statusResult.value.success) {
      const s = statusResult.value.data;
      if (!hasContext) branch = s.branch; // Setup branch if fast check failed
      stats = {
        modified: s.modified,
        staged: s.staged,
        untracked: s.untracked,
        clean: s.clean
      };
      hasContext = true;
    } else if (statusResult.status === 'fulfilled' && statusResult.value.error !== 'Initial status deferred') {
      // It finished but failed (non-zero exit) or timed out
      console.warn('[Git] Status check failed:', statusResult.value.error);
    }

    return {
      hasRepository: hasContext || (branch !== 'HEAD'),
      branch: branch || 'HEAD',
      ...stats
    };
  }
}

// Make available globally
window.GitService = GitService;
