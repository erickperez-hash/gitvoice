// ErrorHandler - Centralized error handling with user-friendly messages

class ErrorHandler {
  constructor() {
    this.errorMessages = this._buildErrorMessages();
  }

  _buildErrorMessages() {
    return {
      // Git Errors
      'authentication failed': {
        title: 'Authentication Failed',
        explanation: 'Git could not authenticate with the remote server.',
        solution: 'Check your credentials in Settings. Make sure your token has the correct permissions.'
      },
      'permission denied': {
        title: 'Permission Denied',
        explanation: 'You do not have permission to perform this action on the remote repository.',
        solution: 'Verify you have push access to this repository, or check your SSH key configuration.'
      },
      'not a git repository': {
        title: 'Not a Git Repository',
        explanation: 'The selected folder is not a Git repository.',
        solution: 'Select a folder that contains a .git directory, or initialize one with "git init".'
      },
      'nothing to commit': {
        title: 'Nothing to Commit',
        explanation: 'There are no staged changes to commit.',
        solution: 'Make changes to your files, then use "git add" to stage them before committing.'
      },
      'merge conflict': {
        title: 'Merge Conflict',
        explanation: 'Git found conflicting changes that cannot be automatically merged.',
        solution: 'Open the conflicting files, resolve the conflicts manually, then stage and commit.'
      },
      'detached head': {
        title: 'Detached HEAD State',
        explanation: 'You are not on any branch. Commits made here may be lost.',
        solution: 'Create a new branch with "git checkout -b branch-name" to save your work.'
      },
      'rejected': {
        title: 'Push Rejected',
        explanation: 'The remote repository has changes that you do not have locally.',
        solution: 'Pull the latest changes first with "git pull", then try pushing again.'
      },
      'could not resolve host': {
        title: 'Network Error',
        explanation: 'Could not connect to the remote server.',
        solution: 'Check your internet connection and verify the repository URL is correct.'
      },
      'timeout': {
        title: 'Operation Timed Out',
        explanation: 'The operation took too long to complete.',
        solution: 'Check your network connection. For large repositories, this may take longer.'
      },
      'branch already exists': {
        title: 'Branch Already Exists',
        explanation: 'A branch with this name already exists.',
        solution: 'Choose a different branch name, or delete the existing branch first.'
      },
      'pathspec': {
        title: 'File Not Found',
        explanation: 'The specified file or path does not exist.',
        solution: 'Check the file path spelling and make sure the file exists.'
      },
      'uncommitted changes': {
        title: 'Uncommitted Changes',
        explanation: 'You have uncommitted changes that would be overwritten.',
        solution: 'Commit your changes with "git commit" or stash them with "git stash" first.'
      },

      // Voice/Audio Errors
      'no speech detected': {
        title: 'No Speech Detected',
        explanation: 'The microphone did not pick up any speech.',
        solution: 'Speak clearly and closer to the microphone. Check microphone sensitivity in Settings.'
      },
      'no audio recorded': {
        title: 'No Audio Recorded',
        explanation: 'The recording failed to capture any audio.',
        solution: 'Make sure your microphone is working and not muted. Try adjusting sensitivity.'
      },
      'microphone': {
        title: 'Microphone Error',
        explanation: 'Could not access the microphone.',
        solution: 'Check that microphone permission is granted in System Settings > Privacy > Microphone.'
      },
      'speech recognition': {
        title: 'Speech Recognition Error',
        explanation: 'The speech recognition service encountered an error.',
        solution: 'Try again, or download offline models in Settings for more reliable recognition.'
      },

      // Network Errors
      'network': {
        title: 'Network Error',
        explanation: 'A network error occurred while processing your request.',
        solution: 'Check your internet connection. Try using offline mode if available.'
      },
      'fetch failed': {
        title: 'Connection Failed',
        explanation: 'Could not connect to the required service.',
        solution: 'Verify your internet connection and try again.'
      },

      // Model Errors
      'model not found': {
        title: 'Model Not Found',
        explanation: 'The required AI model is not available.',
        solution: 'Download the model in Settings under "Offline Mode".'
      },
      'model load failed': {
        title: 'Model Load Failed',
        explanation: 'Failed to load the AI model.',
        solution: 'Try re-downloading the model in Settings.'
      }
    };
  }

  /**
   * Get a user-friendly error object from an error message
   * @param {string|Error} error - The error message or Error object
   * @returns {Object} Error object with title, message, explanation, and solution
   */
  getErrorInfo(error) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    // Find matching error pattern
    for (const [pattern, info] of Object.entries(this.errorMessages)) {
      if (lowerMessage.includes(pattern)) {
        return {
          title: info.title,
          message: message,
          explanation: info.explanation,
          solution: info.solution
        };
      }
    }

    // Default error info
    return {
      title: 'An Error Occurred',
      message: message,
      explanation: 'An unexpected error occurred while processing your request.',
      solution: 'Please try again. If this persists, restart the application.'
    };
  }

  /**
   * Log an error with context
   * @param {string} context - Where the error occurred
   * @param {Error} error - The error object
   */
  logError(context, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${context}]`, error);

    // Could be extended to send to error tracking service
  }

  /**
   * Handle an error and return formatted error info
   * @param {string} context - Where the error occurred
   * @param {Error} error - The error object
   * @returns {Object} Formatted error info
   */
  handle(context, error) {
    this.logError(context, error);
    return this.getErrorInfo(error);
  }

  /**
   * Create a wrapped function that handles errors
   * @param {Function} fn - The function to wrap
   * @param {string} context - Context for error logging
   * @returns {Function} Wrapped function
   */
  wrapAsync(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorInfo = this.handle(context, error);
        throw Object.assign(new Error(errorInfo.message), errorInfo);
      }
    };
  }

  /**
   * Check if an error is recoverable
   * @param {string|Error} error - The error
   * @returns {boolean} True if the error might be recoverable by retrying
   */
  isRecoverable(error) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    const recoverablePatterns = [
      'timeout',
      'network',
      'connection',
      'fetch failed',
      'temporary'
    ];

    return recoverablePatterns.some(pattern => lowerMessage.includes(pattern));
  }
}

// Make available globally
window.ErrorHandler = ErrorHandler;
window.errorHandler = new ErrorHandler();
