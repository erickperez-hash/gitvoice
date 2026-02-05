// StylesInjector - Injects additional CSS for dynamic components

function injectAdditionalStyles() {
  const styles = `
    /* Practice Mode */
    #practice-mode-toggle.active {
      background: var(--warning-color);
      color: white;
      border-color: var(--warning-color);
    }

    .side-effects ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    .side-effects li {
      margin: 5px 0;
      color: var(--text-color);
    }

    .practice-warning {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      padding: 10px 15px;
      border-radius: 4px;
      margin-top: 15px;
      color: #92400e;
    }

    /* Credential Status */
    .credential-status .loading {
      color: var(--info-color);
    }

    .credential-status .success {
      color: var(--success-color);
    }

    .credential-status .error {
      color: var(--error-color);
    }

    .credential-status .hint {
      color: var(--text-muted);
    }

    .credential-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      margin: 5px 0;
    }

    .service-name {
      font-weight: 600;
      text-transform: capitalize;
    }

    /* SSH Keys */
    .ssh-key-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      margin: 5px 0;
    }

    .key-type {
      background: var(--primary-color);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .key-fingerprint {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Hotkey Input */
    .hotkey-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    .hotkey-input.recording {
      border-color: var(--primary-color);
      background: #f0f4ff;
    }

    .setting-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 5px;
    }

    .setting-hint a {
      color: var(--primary-color);
    }

    /* Microphone Level */
    .mic-level-container {
      flex: 1;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .mic-level {
      height: 100%;
      background: var(--success-color);
      width: 0%;
      transition: width 0.1s ease;
    }

    /* Learning Overlay Styles */
    .learning-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2000;
    }

    .learning-overlay.hidden {
      display: none;
    }

    .learning-overlay .overlay-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
    }

    .learning-overlay .overlay-content {
      position: relative;
      background: white;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      margin: 5vh auto;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .learning-overlay .overlay-header {
      background: var(--gradient-primary);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .learning-overlay .overlay-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .learning-overlay .overlay-footer {
      padding: 15px 20px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      background: #f8f9fa;
    }

    .topic-nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .topic-btn {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      border-radius: 20px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .topic-btn.active {
      background: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }

    .concept-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }

    .concept-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid var(--primary-color);
    }

    .concept-card h4 {
      margin: 0 0 8px 0;
      color: var(--primary-color);
    }

    .concept-card p {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }

    .workflow-steps {
      list-style: none;
      padding: 0;
    }

    .workflow-steps li {
      padding: 10px 15px;
      margin: 5px 0;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .command-list .command-item {
      display: flex;
      align-items: baseline;
      gap: 15px;
      padding: 10px;
      margin: 5px 0;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .command-list code {
      background: var(--terminal-bg);
      color: var(--terminal-text);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
    }

    .quiz-option {
      display: block;
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: white;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .quiz-option:hover:not(:disabled) {
      background: #f8f9fa;
    }

    .quiz-option.correct {
      background: #d1fae5;
      border-color: var(--success-color);
    }

    .quiz-option.incorrect {
      background: #fee2e2;
      border-color: var(--error-color);
    }

    .quiz-correct {
      color: var(--success-color);
      font-weight: 600;
    }

    .quiz-incorrect {
      color: var(--error-color);
    }

    .contextual-help {
      padding: 10px 0;
    }

    .contextual-help .help-title {
      color: var(--primary-color);
      margin-bottom: 10px;
    }

    .help-examples ul,
    .help-workflow ol,
    .help-errors ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    .help-related .related-commands {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .related-cmd {
      background: #f0f4ff;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
    }

    /* Practice History */
    .practice-history-item {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
      border-left: 4px solid var(--primary-color);
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .history-command {
      background: var(--terminal-bg);
      color: var(--terminal-text);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
    }

    .history-time {
      color: var(--text-muted);
      font-size: 12px;
    }

    .history-details p {
      margin: 5px 0;
      font-size: 14px;
      color: var(--text-color);
    }

    .history-warning {
      color: var(--warning-color);
    }

    .history-safe {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 8px;
    }

    .history-safe.safe {
      background: #d1fae5;
      color: #065f46;
    }

    .history-safe.unsafe {
      background: #fef3c7;
      color: #92400e;
    }

    #practice-history-list {
      max-height: 400px;
      overflow-y: auto;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Make available globally
window.injectAdditionalStyles = injectAdditionalStyles;
