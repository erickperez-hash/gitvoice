// TTSService - Text-to-Speech using Web Speech Synthesis API

class TTSService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.queue = [];
    this.speaking = false;
    this.useLocalModel = false; // Whether to use local model instead of Web Speech

    // Callbacks
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;

    this.initialize();
  }

  initialize() {
    // Wait for voices to load
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.selectDefaultVoice();
      };
    }

    // Try to select voice immediately
    setTimeout(() => this.selectDefaultVoice(), 100);
  }

  selectDefaultVoice() {
    const voices = this.synth.getVoices();
    const isOnline = navigator.onLine;

    // Prefer natural-sounding voices, but avoid cloud voices if offline
    let preferredVoices = [
      'Samantha', // macOS (Local)
      'Alex', // macOS (Local)
      'Microsoft Zira', // Windows (Local)
      'Microsoft David', // Windows (Local)
    ];

    if (isOnline) {
      preferredVoices.unshift('Google US English'); // Chrome Cloud Voice (Best when online)
    }

    for (const preferred of preferredVoices) {
      const voice = voices.find(v =>
        v.name.includes(preferred) && v.lang.startsWith('en')
      );
      if (voice) {
        this.voice = voice;
        console.log(`[TTS] Selected voice: ${voice.name} (${isOnline ? 'Online' : 'Offline'} mode)`);
        return;
      }
    }

    // Fallback to first English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      this.voice = englishVoice;
    } else if (voices.length > 0) {
      this.voice = voices[0];
    }
  }

  async speak(text, priority = false) {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      if (priority) {
        // Cancel current speech and clear queue
        this.stop();
        this.queue = [];
      }

      const utterance = new SpeechSynthesisUtterance(text);

      if (this.voice) {
        utterance.voice = this.voice;
      }

      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      utterance.onstart = () => {
        this.speaking = true;
        if (this.onStart) this.onStart(text);
      };

      utterance.onend = () => {
        this.speaking = false;
        if (this.onEnd) this.onEnd(text);
        this.processQueue();
        resolve();
      };

      utterance.onerror = (event) => {
        this.speaking = false;
        if (this.onError) this.onError(event.error);
        reject(new Error(`Speech error: ${event.error}`));
      };

      if (this.speaking && !priority) {
        // Add to queue
        this.queue.push({ utterance, resolve, reject });
      } else {
        // Speak immediately
        this.synth.speak(utterance);
      }
    });
  }

  processQueue() {
    if (this.queue.length === 0 || this.speaking) return;

    const { utterance, resolve, reject } = this.queue.shift();

    utterance.onend = () => {
      this.speaking = false;
      if (this.onEnd) this.onEnd(utterance.text);
      resolve();
      this.processQueue();
    };

    utterance.onerror = (event) => {
      this.speaking = false;
      if (this.onError) this.onError(event.error);
      reject(new Error(`Speech error: ${event.error}`));
      this.processQueue();
    };

    this.synth.speak(utterance);
    this.speaking = true;
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.speaking = false;
    this.queue = [];
  }

  pause() {
    if (this.synth) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth) {
      this.synth.resume();
    }
  }

  setRate(rate) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  setPitch(pitch) {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1.0, volume));
  }

  setVoice(voiceName) {
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      this.voice = voice;
    }
  }

  getVoices() {
    return this.synth.getVoices().filter(v => v.lang.startsWith('en'));
  }

  getAllVoices() {
    return this.synth.getVoices();
  }

  isSpeaking() {
    return this.speaking || (this.synth && this.synth.speaking);
  }

  setUseLocalModel(enabled) {
    this.useLocalModel = enabled;
  }

  isAvailable() {
    return 'speechSynthesis' in window;
  }

  getStatus() {
    return {
      speaking: this.speaking,
      paused: this.synth?.paused,
      pending: this.synth?.pending,
      queueLength: this.queue.length,
      currentVoice: this.voice?.name,
      rate: this.rate
    };
  }
}

// Make available globally
window.TTSService = TTSService;
