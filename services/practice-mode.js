// PracticeMode - Simulate Git commands without executing them

class PracticeMode {
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

  // Simulate a Git command and return what would happen
  async simulateCommand(command, context = {}) {
    const simulation = this.getSimulation(command, context);

    // Add to history
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
        return this.simulateStatus(context);

      case 'add':
        return this.simulateAdd(parts.slice(2), context);

      case 'commit':
        return this.simulateCommit(command, context);

      case 'push':
        return this.simulatePush(parts.slice(2), context);

      case 'pull':
        return this.simulatePull(parts.slice(2), context);

      case 'branch':
        return this.simulateBranch(parts.slice(2), context);

      case 'checkout':
        return this.simulateCheckout(parts.slice(2), context);

      case 'log':
        return this.simulateLog(context);

      case 'diff':
        return this.simulateDiff(context);

      case 'merge':
        return this.simulateMerge(parts.slice(2), context);

      case 'stash':
        return this.simulateStash(parts.slice(2), context);

      default:
        return this.simulateUnknown(command);
    }
  }

  simulateStatus(context) {
    const branch = context.branch || 'main';
    const modified = context.modified || 2;
    const staged = context.staged || 1;
    const untracked = context.untracked || 1;

    let output = `On branch ${branch}\n`;
    output += `Your branch is up to date with 'origin/${branch}'.\n\n`;

    if (staged > 0 || modified > 0 || untracked > 0) {
      if (staged > 0) {
        output += `Changes to be committed:\n`;
        output += `  (use "git restore --staged <file>..." to unstage)\n`;
        output += `        modified:   src/app.js\n\n`;
      }

      if (modified > 0) {
        output += `Changes not staged for commit:\n`;
        output += `  (use "git add <file>..." to update what will be committed)\n`;
        output += `        modified:   README.md\n`;
        output += `        modified:   package.json\n\n`;
      }

      if (untracked > 0) {
        output += `Untracked files:\n`;
        output += `  (use "git add <file>..." to include in what will be committed)\n`;
        output += `        new-file.txt\n`;
      }
    } else {
      output += `nothing to commit, working tree clean`;
    }

    return {
      command: 'git status',
      description: 'Shows the current state of your working directory and staging area',
      wouldDo: 'Display which files have been modified, staged, or are untracked',
      output: output,
      sideEffects: [],
      safe: true
    };
  }

  simulateAdd(args, context) {
    const files = args.join(' ') || '.';
    const isAll = files === '.' || files === '-A' || files === '--all';

    return {
      command: `git add ${files}`,
      description: isAll ? 'Stage all changes for commit' : `Stage ${files} for commit`,
      wouldDo: isAll
        ? 'Move all modified and untracked files to the staging area'
        : `Move ${files} to the staging area`,
      output: '', // git add has no output on success
      sideEffects: [
        'Files would be moved from "Changes not staged" to "Changes to be committed"',
        'New files would be tracked by Git'
      ],
      safe: true
    };
  }

  simulateCommit(command, context) {
    // Extract message from command
    const messageMatch = command.match(/-m\s*["'](.+?)["']/);
    const message = messageMatch ? messageMatch[1] : 'No message provided';

    const branch = context.branch || 'main';
    const fakeHash = this.generateFakeHash();

    return {
      command: `git commit -m "${message}"`,
      description: 'Create a new commit with staged changes',
      wouldDo: `Save a snapshot of all staged changes with the message "${message}"`,
      output: `[${branch} ${fakeHash}] ${message}\n 3 files changed, 45 insertions(+), 12 deletions(-)`,
      sideEffects: [
        'A new commit would be created in your local repository',
        'The staging area would be cleared',
        'HEAD would move to point to the new commit'
      ],
      safe: true
    };
  }

  simulatePush(args, context) {
    const remote = args[0] || 'origin';
    const branch = args[1] || context.branch || 'main';

    return {
      command: `git push ${remote} ${branch}`,
      description: 'Upload local commits to remote repository',
      wouldDo: `Send your local commits on ${branch} to ${remote}`,
      output: `Enumerating objects: 5, done.\nCounting objects: 100% (5/5), done.\nWriting objects: 100% (3/3), 328 bytes | 328.00 KiB/s, done.\nTotal 3 (delta 2), reused 0 (delta 0)\nTo github.com:user/repo.git\n   abc1234..def5678  ${branch} -> ${branch}`,
      sideEffects: [
        `Your commits would be uploaded to ${remote}`,
        'Other team members could see your changes',
        'The remote branch would be updated'
      ],
      safe: false,
      warning: 'This would modify the remote repository. Others would see your changes.'
    };
  }

  simulatePull(args, context) {
    const remote = args[0] || 'origin';
    const branch = args[1] || context.branch || 'main';

    return {
      command: `git pull ${remote} ${branch}`,
      description: 'Download and merge changes from remote',
      wouldDo: `Fetch commits from ${remote}/${branch} and merge them into your local branch`,
      output: `remote: Enumerating objects: 5, done.\nremote: Counting objects: 100% (5/5), done.\nremote: Compressing objects: 100% (2/2), done.\nFrom github.com:user/repo\n   abc1234..def5678  ${branch}     -> ${remote}/${branch}\nUpdating abc1234..def5678\nFast-forward\n README.md | 5 +++++\n 1 file changed, 5 insertions(+)`,
      sideEffects: [
        'New commits would be downloaded from the remote',
        'Your local branch would be updated',
        'Your working directory might change if files were modified'
      ],
      safe: true,
      warning: 'If there are conflicts, you would need to resolve them manually.'
    };
  }

  simulateBranch(args, context) {
    if (args.length === 0) {
      // List branches
      const branch = context.branch || 'main';
      return {
        command: 'git branch',
        description: 'List all local branches',
        wouldDo: 'Display all branches in your local repository',
        output: `  develop\n  feature/login\n* ${branch}\n  bugfix/header`,
        sideEffects: [],
        safe: true
      };
    }

    const branchName = args[0];
    if (args.includes('-d') || args.includes('-D')) {
      return {
        command: `git branch -d ${branchName}`,
        description: 'Delete a branch',
        wouldDo: `Delete the branch "${branchName}"`,
        output: `Deleted branch ${branchName} (was abc1234).`,
        sideEffects: [
          `The branch "${branchName}" would be removed`,
          'Commits only on that branch might become unreachable'
        ],
        safe: false,
        warning: 'Make sure the branch has been merged before deleting!'
      };
    }

    return {
      command: `git branch ${branchName}`,
      description: 'Create a new branch',
      wouldDo: `Create a new branch called "${branchName}" pointing to current commit`,
      output: '', // No output on success
      sideEffects: [
        `A new branch "${branchName}" would be created`,
        'You would still be on your current branch'
      ],
      safe: true
    };
  }

  simulateCheckout(args, context) {
    const target = args[0];
    const createNew = args.includes('-b');

    if (createNew) {
      const branchName = args[args.indexOf('-b') + 1] || target;
      return {
        command: `git checkout -b ${branchName}`,
        description: 'Create and switch to a new branch',
        wouldDo: `Create a new branch "${branchName}" and switch to it`,
        output: `Switched to a new branch '${branchName}'`,
        sideEffects: [
          `A new branch "${branchName}" would be created`,
          'Your working directory would be on the new branch'
        ],
        safe: true
      };
    }

    return {
      command: `git checkout ${target}`,
      description: 'Switch to a different branch',
      wouldDo: `Switch your working directory to the "${target}" branch`,
      output: `Switched to branch '${target}'\nYour branch is up to date with 'origin/${target}'.`,
      sideEffects: [
        'Your working directory would change to match the target branch',
        'Any uncommitted changes must be committed or stashed first'
      ],
      safe: true,
      warning: 'Make sure to commit or stash your changes before switching branches.'
    };
  }

  simulateLog(context) {
    const branch = context.branch || 'main';
    const logs = [
      { hash: 'def5678', message: 'Add user authentication', author: 'You', time: '2 hours ago' },
      { hash: 'abc1234', message: 'Fix header alignment', author: 'You', time: '5 hours ago' },
      { hash: '9876543', message: 'Initial commit', author: 'You', time: '2 days ago' }
    ];

    const output = logs.map(l =>
      `${l.hash} ${l.message} (${l.author}, ${l.time})`
    ).join('\n');

    return {
      command: 'git log --oneline',
      description: 'View commit history',
      wouldDo: 'Display a list of recent commits',
      output: output,
      sideEffects: [],
      safe: true
    };
  }

  simulateDiff(context) {
    return {
      command: 'git diff',
      description: 'Show changes in working directory',
      wouldDo: 'Display line-by-line changes that have not been staged',
      output: `diff --git a/README.md b/README.md\nindex abc1234..def5678 100644\n--- a/README.md\n+++ b/README.md\n@@ -1,3 +1,5 @@\n # My Project\n \n+This is a new line.\n+\n A description of the project.`,
      sideEffects: [],
      safe: true
    };
  }

  simulateMerge(args, context) {
    const branch = args[0] || 'feature';
    const currentBranch = context.branch || 'main';

    return {
      command: `git merge ${branch}`,
      description: 'Merge another branch into current branch',
      wouldDo: `Integrate changes from "${branch}" into "${currentBranch}"`,
      output: `Updating abc1234..def5678\nFast-forward\n src/app.js | 25 +++++++++++++++++++++++++\n 1 file changed, 25 insertions(+)`,
      sideEffects: [
        `Commits from "${branch}" would be added to "${currentBranch}"`,
        'A merge commit might be created if there are divergent changes',
        'Conflicts may occur if the same lines were changed in both branches'
      ],
      safe: false,
      warning: 'Merging may cause conflicts that need manual resolution.'
    };
  }

  simulateStash(args, context) {
    if (args.includes('pop')) {
      return {
        command: 'git stash pop',
        description: 'Apply and remove stashed changes',
        wouldDo: 'Restore your previously stashed changes and remove them from stash',
        output: `On branch main\nChanges not staged for commit:\n  modified:   README.md\n\nDropped refs/stash@{0} (abc123)`,
        sideEffects: [
          'Your stashed changes would be applied to the working directory',
          'The stash entry would be removed'
        ],
        safe: true
      };
    }

    if (args.includes('list')) {
      return {
        command: 'git stash list',
        description: 'List all stashed changes',
        wouldDo: 'Show all saved stashes',
        output: `stash@{0}: WIP on main: abc1234 Last commit message\nstash@{1}: WIP on feature: def5678 Another commit`,
        sideEffects: [],
        safe: true
      };
    }

    return {
      command: 'git stash',
      description: 'Temporarily save uncommitted changes',
      wouldDo: 'Save your current changes and revert to a clean working directory',
      output: `Saved working directory and index state WIP on main: abc1234 Last commit message`,
      sideEffects: [
        'Your uncommitted changes would be saved to the stash',
        'Your working directory would be clean',
        'You can retrieve these changes later with "git stash pop"'
      ],
      safe: true
    };
  }

  simulateUnknown(command) {
    return {
      command: command,
      description: 'Unknown command',
      wouldDo: 'This command is not recognized for simulation',
      output: `git: '${command.split(' ')[1]}' is not a git command. See 'git --help'.`,
      sideEffects: [],
      safe: true,
      warning: 'This command could not be simulated.'
    };
  }

  generateFakeHash() {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 7; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}

// Make available globally
window.PracticeMode = PracticeMode;
