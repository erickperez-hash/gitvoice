// RepositoryController - Handles repository operations (browse, clone, status)

class RepositoryController {
  constructor(services) {
    this.gitService = services.gitService;
    this.narrationService = services.narrationService;
    this.progressIndicator = services.progressIndicator;
    this.uiController = services.uiController;

    this.currentRepo = null;
    this.isProcessing = false;
  }

  getCurrentRepo() {
    return this.currentRepo;
  }

  async checkInitialState() {
    const repoPath = await window.electronAPI.getRepoPath();
    if (repoPath) {
      this.currentRepo = repoPath;
      this.uiController.setRepositoryLoaded(repoPath, 'Repository loaded');
      await this.refreshGitStatus();
    }
  }

  async browseRepository() {
    try {
      const result = await window.electronAPI.browseRepository();

      if (result.success) {
        this.currentRepo = result.path;
        this.uiController.setRepositoryLoaded(result.path, 'Valid Git repository');
        await this.refreshGitStatus();
        await this.narrationService.speak('Repository loaded successfully. Ready for your commands.');
      } else {
        this.uiController.setRepositoryError(result.error);
      }
    } catch (error) {
      console.error('Error browsing repository:', error);
      this.uiController.setRepositoryError('Error selecting repository');
    }
  }

  async cloneRepository() {
    const elements = this.uiController.elements;
    const url = elements.cloneUrl.value.trim();

    if (!url) {
      this.uiController.showError({
        title: 'Missing URL',
        message: 'Please enter a repository URL to clone.',
        explanation: 'To clone a repository, you need to provide its HTTPS or SSH URL.',
        solution: 'Copy the URL from GitHub/GitLab and paste it here.'
      });
      return;
    }

    try {
      this.isProcessing = true;
      this.uiController.setCloneInProgress();
      this.progressIndicator.reset();
      this.progressIndicator.setExecuting();

      const targetPath = await window.electronAPI.showSaveDialog({
        title: 'Select Destination Directory',
        buttonLabel: 'Clone Here',
        defaultPath: '~'
      });

      if (!targetPath) {
        this._resetCloneUI();
        return;
      }

      await this.narrationService.speak(`Starting to clone from ${url}. This may take a moment depending on the repository size.`);

      const result = await this.gitService.clone(url, targetPath);

      if (result.success) {
        this.currentRepo = result.path;
        elements.cloneUrl.value = '';
        this.uiController.setRepositoryLoaded(result.path, 'Repository cloned and loaded');

        this.progressIndicator.setComplete();
        await this.refreshGitStatus();
        await this.narrationService.speak('Cloning complete. The repository is now ready for use.');
      } else {
        this.uiController.showError({
          title: 'Cloning Failed',
          message: result.error,
          explanation: 'Git encountered an error while trying to clone the repository.',
          solution: result.error.includes('authentication') ? 'Check your credentials in Settings' : 'Check the URL and your internet connection'
        });
        this.progressIndicator.reset();
      }
    } catch (error) {
      console.error('Error cloning repository:', error);
      this.uiController.showError({
        title: 'Cloning Error',
        message: error.message
      });
    } finally {
      this._resetCloneUI();
    }
  }

  async refreshGitStatus() {
    if (!this.currentRepo) return;

    try {
      const result = await this.gitService.getStatus();

      if (result.success) {
        this.uiController.displayGitStatus(result);
      } else {
        this.uiController.elements.gitStatus.innerHTML = `<span class="placeholder">Error: ${result.error}</span>`;
      }
    } catch (error) {
      console.error('Error getting status:', error);
    }
  }

  _resetCloneUI() {
    this.isProcessing = false;
    this.uiController.resetCloneUI();
  }

  bindRepositoryEvents(elements) {
    elements.browseRepo?.addEventListener('click', () => this.browseRepository());
    elements.cloneRepoBtn?.addEventListener('click', () => this.cloneRepository());
  }
}

// Make available globally
window.RepositoryController = RepositoryController;
