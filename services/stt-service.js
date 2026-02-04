// STTService - Speech-to-Text using Web Speech API or local models

class STTService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.useWebSpeech = true; // Default to Web Speech API
    this.useLocalModel = false; // Use downloaded models if available

    // Callbacks
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;

    this.initialize();
  }

  initialize() {
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStart) this.onStart();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEnd) this.onEnd();
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (this.onResult) {
          this.onResult({
            final: finalTranscript,
            interim: interimTranscript,
            isFinal: finalTranscript.length > 0
          });
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (this.onError) {
          this.onError(event.error);
        }
      };

      return true;
    }

    console.warn('Web Speech API not supported');
    return false;
  }

  setUseLocalModel(enabled) {
    this.useLocalModel = enabled;
    if (enabled) {
      this.useWebSpeech = false;
    }
  }

  async start() {
    if (this.isListening) return;

    if (this.useLocalModel) {
      // Local model doesn't use the web speech recognition object
      this.isListening = true;
      if (this.onStart) this.onStart();
      return;
    }

    if (!this.recognition) {
      if (!this.initialize()) {
        throw new Error('Speech recognition not available');
      }
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      throw error;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  abort() {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  // Transcribe audio from a blob
  async transcribe(audioBlob) {
    if (this.useLocalModel) {
      try {
        // Convert blob to array buffer for IPC
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const status = await window.electronAPI.checkModelStatus('stt');
        if (!status.downloaded) {
          throw new Error('STT model not found');
        }

        const result = await window.electronAPI.transcribeLocal({
          audioBuffer: buffer,
          modelPath: status.path
        });

        if (result.success) {
          return { text: result.text, confidence: result.confidence || 0.9 };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        throw new Error(`Local transcription failed: ${error.message}`);
      }
    }

    return new Promise((resolve, reject) => {
      if (this.useWebSpeech) {
        // For Web Speech API, we need to use real-time recognition
        // This method is for compatibility with local models

        let transcript = '';

        this.onResult = (result) => {
          if (result.isFinal) {
            transcript = result.final;
          }
        };

        this.onEnd = () => {
          resolve({ text: transcript, confidence: 0.9 });
        };

        this.onError = (error) => {
          reject(new Error(`Transcription error: ${error}`));
        };

        this.start();

        // Stop after reasonable time
        setTimeout(() => {
          if (this.isListening) {
            this.stop();
          }
        }, 10000);
      } else {
        // Future: Use local Whisper model
        reject(new Error('Local transcription not yet implemented'));
      }
    });
  }

  // Real-time transcription with callbacks
  startRealtime(onTranscript, onEnd) {
    return new Promise((resolve, reject) => {
      this.onResult = (result) => {
        onTranscript(result);
        if (result.isFinal) {
          resolve(result.final);
        }
      };

      this.onEnd = () => {
        if (onEnd) onEnd();
      };

      this.onError = (error) => {
        let errorMessage = error;
        if (error === 'network') {
          errorMessage = 'network (internet connection required for Web Speech API)';
        }
        reject(new Error(`Recognition error: ${errorMessage}`));
      };

      this.start();
    });
  }

  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  isAvailable() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  getStatus() {
    return {
      isListening: this.isListening,
      isAvailable: this.isAvailable(),
      useWebSpeech: this.useWebSpeech
    };
  }
}

// Make available globally
window.STTService = STTService;
