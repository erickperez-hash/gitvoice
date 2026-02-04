// CommandExplainer - Provides detailed explanations of Git commands for educational purposes

class CommandExplainer {
  constructor() {
    this.commandDatabase = this.buildCommandDatabase();
  }

  explainCommand(command) {
    // Parse the command
    const parts = command.split(' ');
    const gitCommand = parts[1]; // git [command]

    const explanation = this.commandDatabase[gitCommand] || {
      description: 'A Git command',
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
        } else if (parts[2]) {
          breakdown.push({
            command: parts[2],
            explanation: 'Specific file or pattern to stage'
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
          const message = parts.slice(3).join(' ');
          if (message) {
            breakdown.push({
              command: message,
              explanation: 'Your commit message'
            });
          }
        }
        break;

      case 'push':
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
        break;

      case 'pull':
        breakdown.push({
          command: 'pull',
          explanation: 'Download and merge changes from remote repository'
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
            explanation: 'Branch name to pull'
          });
        }
        break;

      case 'status':
        breakdown.push({
          command: 'status',
          explanation: 'Show the current state of your working directory'
        });
        if (parts.includes('--short')) {
          breakdown.push({
            command: '--short',
            explanation: 'Display in compact format'
          });
        }
        if (parts.includes('--branch')) {
          breakdown.push({
            command: '--branch',
            explanation: 'Show branch information'
          });
        }
        break;

      case 'branch':
        breakdown.push({
          command: 'branch',
          explanation: 'List, create, or delete branches'
        });
        if (parts[2] === '-d') {
          breakdown.push({
            command: '-d',
            explanation: 'Delete a branch (safe delete)'
          });
          if (parts[3]) {
            breakdown.push({
              command: parts[3],
              explanation: 'Name of the branch to delete'
            });
          }
        } else if (parts[2]) {
          breakdown.push({
            command: parts[2],
            explanation: 'Name for the new branch'
          });
        }
        break;

      case 'checkout':
        breakdown.push({
          command: 'checkout',
          explanation: 'Switch branches or restore files'
        });
        if (parts[2] === '-b') {
          breakdown.push({
            command: '-b',
            explanation: 'Create a new branch and switch to it'
          });
          if (parts[3]) {
            breakdown.push({
              command: parts[3],
              explanation: 'Name for the new branch'
            });
          }
        } else if (parts[2]) {
          breakdown.push({
            command: parts[2],
            explanation: 'Branch name to switch to'
          });
        }
        break;

      case 'log':
        breakdown.push({
          command: 'log',
          explanation: 'View commit history'
        });
        if (parts.includes('--oneline')) {
          breakdown.push({
            command: '--oneline',
            explanation: 'Show each commit on a single line'
          });
        }
        parts.forEach(p => {
          if (p.startsWith('-n')) {
            breakdown.push({
              command: p,
              explanation: `Show only the last ${p.replace('-n', '')} commits`
            });
          }
        });
        break;

      case 'diff':
        breakdown.push({
          command: 'diff',
          explanation: 'Show changes between commits or working tree'
        });
        if (parts.includes('--staged')) {
          breakdown.push({
            command: '--staged',
            explanation: 'Show changes that are staged for commit'
          });
        }
        break;

      case 'merge':
        breakdown.push({
          command: 'merge',
          explanation: 'Join development histories together'
        });
        if (parts[2]) {
          breakdown.push({
            command: parts[2],
            explanation: 'Branch to merge into current branch'
          });
        }
        break;

      case 'rebase':
        breakdown.push({
          command: 'rebase',
          explanation: 'Reapply commits on top of another base'
        });
        if (parts[2]) {
          breakdown.push({
            command: parts[2],
            explanation: 'Branch to rebase onto'
          });
        }
        break;

      case 'stash':
        breakdown.push({
          command: 'stash',
          explanation: 'Temporarily save uncommitted changes'
        });
        if (parts[2] === 'pop') {
          breakdown.push({
            command: 'pop',
            explanation: 'Apply stashed changes and remove from stash'
          });
        } else if (parts[2] === 'list') {
          breakdown.push({
            command: 'list',
            explanation: 'Show all stashed changes'
          });
        }
        break;

      case 'reset':
        breakdown.push({
          command: 'reset',
          explanation: 'Reset current HEAD to a specified state'
        });
        if (parts.includes('--hard')) {
          breakdown.push({
            command: '--hard',
            explanation: 'Discard all changes (use with caution!)'
          });
        } else if (parts.includes('--soft')) {
          breakdown.push({
            command: '--soft',
            explanation: 'Keep changes in staging area'
          });
        }
        break;

      default:
        if (gitCommand) {
          breakdown.push({
            command: gitCommand,
            explanation: 'Git subcommand'
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
        description: 'Stage files to be included in the next commit',
        tip: "Think of 'add' as selecting which changes you want to save. Use 'git add .' to stage everything, or 'git add filename' for specific files."
      },
      'commit': {
        description: 'Save your staged changes to the repository with a descriptive message',
        tip: "A commit is like a save point in a video game. Write clear messages so you can understand what changed later. Format: 'git commit -m \"Your message\"'"
      },
      'push': {
        description: 'Upload your local commits to a remote repository (like GitHub)',
        tip: 'Push sends your commits to the cloud so others can see them. Always pull before pushing to avoid conflicts.'
      },
      'pull': {
        description: 'Download and merge changes from a remote repository',
        tip: 'Pull fetches new commits from your team and merges them. Always pull before starting new work to stay up to date.'
      },
      'branch': {
        description: 'Create, list, or delete branches',
        tip: "Branches let you work on features separately. Create with 'git branch name', list with 'git branch', delete with 'git branch -d name'."
      },
      'checkout': {
        description: 'Switch between branches or restore files',
        tip: "Checkout changes your working directory to match a different branch. Use 'git checkout branch-name' to switch branches."
      },
      'log': {
        description: 'View commit history',
        tip: "See what's been done in the project. Use 'git log --oneline' for a compact view."
      },
      'diff': {
        description: 'Show changes between commits, branches, or files',
        tip: 'Diff shows exactly what changed. Use it before committing to review your changes.'
      },
      'merge': {
        description: 'Combine changes from different branches',
        tip: 'Merge integrates changes from one branch into another. Always commit your changes before merging.'
      },
      'rebase': {
        description: 'Reapply commits on top of another base tip',
        tip: 'Rebase creates a cleaner history but rewrites commits. Never rebase commits that have been pushed.'
      },
      'stash': {
        description: 'Temporarily store modified, tracked files',
        tip: "Stash is like a clipboard for your changes. Use 'git stash' to save and 'git stash pop' to restore."
      },
      'reset': {
        description: 'Reset current HEAD to a specified state',
        tip: "Reset can undo commits. '--soft' keeps changes staged, '--hard' discards everything (dangerous!)."
      },
      'clone': {
        description: 'Create a copy of a remote repository',
        tip: "Clone downloads the entire repository. Use 'git clone URL' to get started with any project."
      },
      'fetch': {
        description: 'Download objects and refs from another repository',
        tip: 'Fetch downloads changes without merging. Use it to see what others have done before merging.'
      },
      'remote': {
        description: 'Manage set of tracked repositories',
        tip: "Remotes are bookmarks to other repositories. 'origin' typically refers to where you cloned from."
      }
    };
  }

  getTipOfTheDay() {
    const tips = [
      'Commit early, commit often. Small commits are easier to understand and undo.',
      "Write commit messages in present tense: 'Add feature' not 'Added feature'.",
      'Use branches for new features. Keep main/master stable.',
      'Pull before you push to avoid merge conflicts.',
      "Use 'git status' constantly. It's your friend.",
      "Don't commit sensitive data like passwords or API keys.",
      "Learn 'git log' to understand your project's history.",
      "Use '.gitignore' to exclude files you don't want to track.",
      'Before making changes, create a new branch to keep main clean.',
      "Use 'git diff' before committing to review your changes.",
      'Write descriptive commit messages that explain WHY, not just WHAT.',
      "Use 'git stash' when you need to switch branches but aren't ready to commit.",
      "The 'git blame' command shows who last modified each line of a file.",
      "Use 'git revert' to undo a commit safely without rewriting history.",
      'Always read error messages carefully - Git tells you how to fix problems.'
    ];

    return tips[Math.floor(Math.random() * tips.length)];
  }

  getEducationalError(errorType) {
    const errors = {
      noChangesToCommit: {
        voice: "There are no changes to commit. You need to modify some files first, then use 'git add' to stage them.",
        title: "Why Can't I Commit?",
        explanation: "Git commits save changes, but you haven't made any yet. The workflow is: 1) Edit files, 2) git add to stage, 3) git commit to save.",
        tip: 'Try making a change to a file first, then I\'ll help you commit it.'
      },
      authenticationFailed: {
        voice: "Authentication failed. This means Git couldn't verify your identity. Let's set up your credentials.",
        title: 'Git Authentication',
        explanation: 'When pushing to remote repositories, Git needs to confirm you have permission. This uses either SSH keys or personal access tokens.',
        tip: 'Go to Settings to add your GitHub token.'
      },
      mergeConflict: {
        voice: "There's a merge conflict. This happens when the same code was changed in two different ways. Don't worry, we can resolve it.",
        title: 'Merge Conflicts',
        explanation: "Git found conflicting changes that it can't automatically merge. You'll need to manually choose which version to keep.",
        tip: 'Look for files marked with <<<<<<< and ======= markers. Edit them to keep the code you want.'
      },
      notARepository: {
        voice: "This folder isn't a Git repository. Would you like me to initialize one?",
        title: 'Not a Git Repository',
        explanation: "Git commands only work inside a Git repository. A repository is a folder that Git is tracking.",
        tip: "Use 'git init' to turn any folder into a Git repository."
      },
      detachedHead: {
        voice: "You're in detached HEAD state. This means you're not on a branch.",
        title: 'Detached HEAD',
        explanation: "Normally you're on a branch like 'main'. Detached HEAD means you're looking at a specific commit instead.",
        tip: "Create a branch with 'git checkout -b new-branch' to save any changes you make."
      },
      unmergedPaths: {
        voice: 'There are unresolved merge conflicts. You need to resolve them before continuing.',
        title: 'Unmerged Files',
        explanation: 'Some files have conflicts that need to be manually resolved before Git can proceed.',
        tip: "Edit the conflicted files, then use 'git add' to mark them as resolved."
      }
    };

    return errors[errorType] || null;
  }
}

// Make available globally
window.CommandExplainer = CommandExplainer;
