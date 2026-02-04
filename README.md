# GitVoice - Learn Git Through Voice

GitVoice is an educational desktop application that teaches you Git commands while letting you control your repository with your voice.

## Learning Philosophy

GitVoice isn't just voice control - it's a **teaching tool**. Every command you speak:
1. Gets announced step-by-step
2. Shows the exact CLI command in a modal
3. Explains what each part does
4. Provides tips for better Git usage

## Features

- **Voice-Activated Git** - Control Git with natural language
- **Educational Modals** - See exactly what commands are running
- **Step-by-Step Narration** - Hear explanations of each action
- **Command Breakdown** - Learn what each part of a command does
- **Tips & Tricks** - Git tips to improve your skills
- **Progress Indicators** - Visual 4-step workflow display

## Quick Start

### Installation

```bash
npm install
npm start
```

### First Use

1. Select a Git repository using the Browse button
2. Press `Cmd+Shift+V` (or `Ctrl+Shift+V` on Windows)
3. Say: "show me the status"
4. Watch and listen as GitVoice teaches you!

## Supported Voice Commands

| What to Say | Git Command | What It Does |
|-------------|-------------|--------------|
| "show me the status" | `git status` | Check repository state |
| "commit everything as [message]" | `git add . && git commit -m "[message]"` | Stage and commit all changes |
| "push to origin" | `git push origin [branch]` | Upload commits to remote |
| "pull latest changes" | `git pull origin [branch]` | Download new commits |
| "create branch called [name]" | `git branch [name]` | Create new branch |
| "switch to [branch]" | `git checkout [branch]` | Change branches |
| "show me the log" | `git log --oneline` | View commit history |
| "show the diff" | `git diff` | See changes |

## Learning Features

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
1. Listening
2. Understanding
3. Executing
4. Complete

### Learning Mode
Toggle learning mode on/off:
- **ON**: See modals and detailed narration (recommended for learning)
- **OFF**: Just execute commands quickly (for experienced users)

## Settings

- **Voice Speed**: Adjust TTS speed
- **VAD Sensitivity**: Tune voice detection
- **Verbosity**: Minimal, Normal, or Detailed narration
- **Show Tips**: Toggle learning tips
- **Auto Modal**: Auto-show command modal

## Project Structure

```
gitvoice/
├── package.json          # Dependencies and scripts
├── electron.js           # Main Electron process
├── preload.js            # Secure IPC bridge
├── index.html            # UI layout
├── renderer.js           # UI logic
├── styles.css            # Styling
├── components/
│   ├── command-modal.js  # Educational modal
│   └── progress-indicator.js
├── services/
│   ├── git-service.js    # Git operations
│   ├── audio-service.js  # Microphone/VAD
│   ├── stt-service.js    # Speech-to-text
│   ├── tts-service.js    # Text-to-speech
│   ├── intent-service.js # Command parsing
│   └── narration-service.js
└── utils/
    ├── command-explainer.js # Git command explanations
    └── model-downloader.js
```

## Requirements

- Node.js 18+
- Git installed and accessible
- Microphone access
- Chrome/Edge for best speech recognition support

## How It Works

1. **Voice Input**: Uses Web Speech API for speech recognition
2. **Intent Parsing**: Pattern matching to identify Git operations
3. **Git Execution**: Uses dugite library for Git commands
4. **Voice Output**: Web Speech Synthesis for announcements
5. **Visual Learning**: Modal displays command explanations

## Tips for Best Results

- **Speak clearly**: Enunciate your words
- **Be specific**: "commit as fix login bug" not just "commit"
- **Wait for prompt**: Let GitVoice finish speaking
- **Use learning mode**: Keep it on until comfortable
- **Read the modals**: They contain valuable information
- **Try it in terminal**: Copy commands and practice

## Troubleshooting

**Voice not recognized?**
- Check microphone permissions in browser
- Adjust VAD sensitivity in settings
- Speak more slowly and clearly

**Commands not executing?**
- Verify you're in a Git repository
- Check the error modal for guidance

**No voice output?**
- Check system volume
- Verify speech synthesis is available

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+V` | Activate voice command |
| `Escape` | Close modals |

## License

MIT License

---

Made for developers who want to learn Git the fun way!
