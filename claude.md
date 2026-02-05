# GitVoice - Project Documentation

## Overview

GitVoice is an educational Electron desktop application that teaches Git commands while enabling voice-controlled Git repository management. Users can speak natural language commands, and the app converts them to Git operations while providing step-by-step educational feedback.

**Tech Stack:** Electron 33, JavaScript (ES6+), Web Speech API, @xenova/transformers (Whisper), dugite (Git)

---

## Project Structure

```
gitvoice/
├── electron.js              # Main process (~889 lines) - IPC handlers, Git operations
├── preload.js               # Security bridge - exposes safe IPC methods
├── renderer.js              # UI controller (~1900 lines) - orchestrates everything
├── index.html               # Single-page UI layout
├── styles.css               # All styling
├── package.json             # Dependencies and scripts
│
├── components/
│   ├── command-modal.js     # Educational command display with breakdown
│   ├── progress-indicator.js # 4-step workflow progress (Listen→Understand→Execute→Complete)
│   └── learning-overlay.js  # Interactive Git tutorials and quizzes
│
├── services/
│   ├── audio-service.js     # Microphone & VAD (Voice Activity Detection)
│   ├── stt-service.js       # Speech-to-Text (Web Speech API + local Whisper)
│   ├── tts-service.js       # Text-to-Speech (Web Speech Synthesis)
│   ├── intent-service.js    # Voice command parsing (regex patterns)
│   ├── git-service.js       # Git operations wrapper with educational context
│   ├── narration-service.js # Educational voice announcements
│   ├── practice-mode.js     # Simulate Git commands without executing
│   └── github-auth-service.js # GitHub OAuth device flow
│
└── utils/
    ├── command-explainer.js # Git command explanations database
    ├── model-downloader.js  # Offline model management (Whisper)
    └── trampoline.js        # Git credential management
```

---

## Critical Bugs

### 1. HTML Structure Malformed
**Location:** [index.html:488-519](index.html#L488-L519)
**Issue:** The device auth modal is placed AFTER the closing `</html>` tag, making it invalid HTML that may not render correctly in all browsers.
**Fix:** Move the modal inside the `<body>` tag before line 485.

### 2. Duplicate Event Listeners
**Location:** [renderer.js:105-107](renderer.js#L105-L107) and [renderer.js:149-152](renderer.js#L149-L152)
**Issue:** Settings button, close-settings, and settings-save have event listeners registered twice in `bindEvents()`.
**Fix:** Remove duplicate registrations on lines 149-152.

### 3. Extra Closing Div Tag
**Location:** [index.html:470](index.html#L470)
**Issue:** Orphan `</div>` tag creates invalid HTML structure.
**Fix:** Remove the extra tag.

### 4. Missing showSaveDialog in Preload
**Location:** [renderer.js:247](renderer.js#L247)
**Issue:** `window.electronAPI.showSaveDialog()` is called but never exposed in preload.js.
**Fix:** Add IPC handler in electron.js and expose in preload.js.

### 5. audioService.cleanup() Memory Leak Potential
**Location:** [audio-service.js:67-78](services/audio-service.js#L67-L78)
**Issue:** When cleanup() closes audioContext, the MediaStreamSource connected to the analyser is not disconnected first, which can cause memory leaks.
**Fix:** Disconnect source before closing context.

---

## Placeholders & Unimplemented Features

### 1. Local TTS (Kokoro) Not Implemented
**Location:** [tts-service.js:196-198](services/tts-service.js#L196-L198), [model-downloader.js:22-28](utils/model-downloader.js#L22-L28)
**Issue:** Kokoro TTS model can be downloaded but `setUseLocalModel(true)` does nothing - there's no actual local TTS inference code.
**Status:** PLACEHOLDER - UI suggests feature exists but it doesn't work.

### 2. Settings Checkboxes Ignored
**Location:** [index.html:264-270](index.html#L264-L270), [renderer.js:862-885](renderer.js#L862-L885)
**Issue:** `show-tips` and `auto-modal` checkboxes exist in settings but their values are never used.
**Status:** UI only - no implementation.

### 3. Practice Mode History Not Exposed
**Location:** [practice-mode.js:393-399](services/practice-mode.js#L393-L399)
**Issue:** `getHistory()` and `clearHistory()` exist but there's no UI to view practice history.
**Status:** Backend ready, no UI.

### 4. Quiz Always Same Answer
**Location:** [learning-overlay.js:404-430](components/learning-overlay.js#L404-L430)
**Issue:** All quiz questions have `correct: 1` - the second option is always correct.
**Status:** Needs varied answers.

### 5. Unused npm Packages
**Packages:** `ansi-to-html`, `node-record-lpcm16`, `wav`, `wavefile`
**Issue:** Installed but never imported or used anywhere in the codebase.
**Status:** Dead dependencies - remove or implement.

---

## Code Quality Issues

### Architecture Problems

| Issue | Location | Description |
|-------|----------|-------------|
| Global pollution | All services | Classes exposed via `window.*` instead of ES modules |
| Monolithic files | renderer.js | 1900+ lines mixing UI, state, and business logic |
| No bundler | package.json | Direct script loading, no build step |
| No types | All files | Plain JS without TypeScript, making refactoring risky |
| No tests | test/ | Jest installed but zero test files |

### Specific Code Smells

1. **Magic Strings Everywhere**
   - Hardcoded selectors: `document.getElementById('step-cloning')`
   - Hardcoded URLs: `'https://github.com/login/device/code'`
   - Hardcoded timeouts: `setTimeout(..., 15000)`

2. **Inconsistent Error Handling**
   - Some functions use try/catch, others let errors propagate
   - Many async operations lack .catch() handlers

3. **State Management**
   - Global variables: `isLearningMode`, `isPracticeMode`, `isProcessing`, `currentRepo`
   - State scattered across files with no central store

4. **Duplicate Code**
   - Similar Git operation patterns repeated in git-service.js
   - Modal show/hide logic duplicated across components

---

## Security Concerns

### 1. Credentials Stored in Plaintext
**Location:** [trampoline.js:38-51](utils/trampoline.js#L38-L51)
**Issue:** Comment says "In production, this should use OS keychain" but tokens are written to `~/.gitvoice/credentials.json` with only file permissions for protection.
**Risk:** HIGH - Any process can read tokens if it can access the file.
**Fix:** Use Electron's `safeStorage` API or native keychain.

### 2. Token Exposed in Temp File
**Location:** [trampoline.js:135-150](utils/trampoline.js#L135-L150)
**Issue:** GIT_ASKPASS script writes token to /tmp in plaintext.
**Risk:** MEDIUM - Temp files readable by other processes.
**Fix:** Use environment variables or Electron's credential helper.

### 3. Settings in localStorage
**Location:** [renderer.js:874-881](renderer.js#L874-L881)
**Issue:** Using browser localStorage in Electron is less secure than IPC-based storage.
**Fix:** Use electronAPI.saveSettings() which already exists.

---

## Disconnected/Broken Features

### Features With UI But No Implementation
1. **SSH Key Management** - Can view keys but no add/remove/test functionality
2. **GitLab/Bitbucket Auth** - Dropdown options exist, validation logic exists, but untested
3. **Voice Mode Offline** - Selection exists but TTS remains online-only
4. **Custom OAuth Client ID** - Advanced setting hidden and appears unused

### Features With Implementation But No UI
1. **Practice Mode History** - Can view history programmatically but no UI
2. **Command Suggestions** - IntentService.getSuggestions() exists but never called
3. **Contextual Help** - CommandModal.showContextualHelp() implemented but unused

---

## Improvement Plan (COMPLETED)

### Phase 1: Bug Fixes (Critical) - DONE
- [x] Fix HTML structure (move modal, remove extra div)
- [x] Remove duplicate event listeners in renderer.js
- [x] Add missing showSaveDialog IPC handler
- [x] Fix memory leak in audioService cleanup
- [x] Properly close AudioContext sources before cleanup

### Phase 2: Security Hardening - DONE
- [x] Implement Electron safeStorage for credentials
- [x] Remove plaintext token from temp askpass script
- [x] Migrate localStorage settings to secure IPC storage
- [ ] Add input sanitization for commit messages (deferred)

### Phase 3: Code Quality - DONE
- [x] Split renderer.js into modules (ui-controller, settings-manager, voice-controller, credentials-manager, repository-controller)
- [x] Extract constants (selectors, URLs, timeouts) into utils/constants.js
- [x] Implement centralized error handler with user-friendly messages
- [x] Remove unused npm packages (ansi-to-html, node-record-lpcm16, wav, wavefile)
- [ ] Add TypeScript types (deferred - would require build system)

### Phase 4: Complete Features - DONE
- [x] Wire up show-tips and auto-modal settings
- [x] Add practice mode history viewer
- [x] Vary quiz answers in learning overlay
- [ ] Implement local TTS with Kokoro (deferred - requires ONNX runtime integration)
- [ ] Add SSH key management actions (deferred)

### Phase 5: Testing & Polish - DONE
- [x] Add Jest unit tests for services (intent-service, practice-mode)
- [x] Improve error messages with actionable guidance via ErrorHandler
- [ ] Add integration tests for IPC handlers (deferred)
- [ ] Test GitLab/Bitbucket auth flows (deferred)
- [ ] Add proper loading states and spinners (deferred)

---

## Voice Commands Supported

| Say This | Git Command | Safe? |
|----------|-------------|-------|
| "show me the status" | `git status --short --branch` | ✓ |
| "commit as [message]" | `git add . && git commit -m "[message]"` | ✓ |
| "push to origin" | `git push origin [branch]` | ✗ |
| "pull latest changes" | `git pull origin [branch]` | ✓ |
| "create branch [name]" | `git branch [name]` | ✓ |
| "switch to [branch]" | `git checkout [branch]` | ✓ |
| "show me the log" | `git log --oneline -n10` | ✓ |
| "show the diff" | `git diff` | ✓ |
| "merge [branch]" | `git merge [branch]` | ✗ |
| "stash changes" | `git stash` | ✓ |

---

## Development Notes

### Running the App
```bash
npm install
npm start
```

### Key Files to Understand First
1. `renderer.js` - Main entry point, orchestrates everything
2. `services/intent-service.js` - How voice commands are parsed
3. `electron.js` - All IPC handlers and Git operations
4. `services/audio-service.js` - VAD and recording logic

### Known Limitations
- **Web Speech API is fundamentally incompatible with Electron** - Google blocks requests from non-browser environments (9-year-old unsolved issue). Use Offline Mode with Whisper instead.
- Offline Whisper model provides excellent accuracy and works reliably (recommended default)
- macOS only fully tested (Windows/Linux may have voice issues)
- Large repositories may cause git status timeouts (3s limit)

---

## Contributing

When making changes:
1. Test voice commands manually after any service changes
2. Check console for uncaught promise rejections
3. Verify modals open/close correctly
4. Test with both online and offline voice modes
