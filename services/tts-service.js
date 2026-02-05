// TTSService - Text-to-Speech using Web Speech Synthesis API

class TTSService {
  constructor() {
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.queue = [];
    this.speaking = false;
    this.useLocalModel = false; // Whether to use local model
    this.useAzureSpeech = true; // Default to Azure Speech
    this.azureConfig = null;

    // Callbacks
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;

    this.checkAzureConfig();
  }

  async checkAzureConfig() {
    try {
      const config = await window.electronAPI.azureGetConfig();
      if (config.configured) {
        this.azureConfig = config;
        this.useAzureSpeech = true;
        console.log('[TTS] Azure Speech configured and enabled');
      } else {
        this.useAzureSpeech = false;
        console.warn('[TTS] Azure Speech not configured. Will use Local Model if available.');
      }
    } catch (error) {
      console.error('[TTS] Failed to check Azure config:', error);
      this.useAzureSpeech = false;
    }
  }


  async speak(text, priority = false) {
    if (priority) {
      // Cancel current speech and clear queue
      this.stop();
      this.queue = [];
    }

    if (this.useAzureSpeech) {
      try {
        if (this.onStart) this.onStart(text);
        const result = await window.electronAPI.azureSpeak({
          text,
          voiceName: "en-US-AndrewNeural" // Default neural voice
        });
        if (result.success && result.audioData) {
          await this.playAudioData(result.audioData);
          if (this.onEnd) this.onEnd(text);
          return;
        } else {
          throw new Error(result.error || 'Failed to get audio data from Azure');
        }
      } catch (error) {
        console.error('[TTS] Azure Speak failed:', error);
      }
    }

    if (this.useLocalModel) {
      try {
        if (this.onStart) this.onStart(text);
        const status = await window.electronAPI.checkModelStatus('tts');
        if (!status.downloaded) {
          throw new Error('Local TTS model not found');
        }

        const result = await window.electronAPI.ttsLocal({
          text,
          modelPath: status.path
        });

        if (result.success && result.audioData) {
          await this.playAudioData(result.audioData);
          if (this.onEnd) this.onEnd(text);
          return;
        } else {
          throw new Error(result.error || 'Local TTS failed');
        }
      } catch (error) {
        console.error('[TTS] Local TTS failed:', error);
      }
    }

    // throw new Error('TTS service not available (Azure credentials missing and Local Model disabled)');
    console.warn('[TTS] Speech failed, no services available or both failed.');
  }

  async playAudioData(audioDataArray) {
    return new Promise(async (resolve, reject) => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Convert array of bytes (Int16 PCM) to Float32 for Web Audio
        const uint8Array = new Uint8Array(audioDataArray);
        const int16Array = new Int16Array(uint8Array.buffer);

        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 16000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          audioCtx.close();
          resolve();
        };
        source.start();
        this.currentSource = source; // Keep track to allow stopping
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    this.speaking = false;
    this.queue = [];
  }

  pause() {
    console.log('[TTS] Pause not supported in Azure direct playback yet');
  }

  resume() {
    console.log('[TTS] Resume not supported in Azure direct playback yet');
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
    console.log('[TTS] Setting voice to:', voiceName);
  }

  getVoices() {
    return []; // No longer using browser voices
  }

  getAllVoices() {
    return [];
  }

  isSpeaking() {
    return this.speaking;
  }

  setUseLocalModel(enabled) {
    this.useLocalModel = enabled;
  }

  isAvailable() {
    return true;
  }

  getStatus() {
    return {
      speaking: this.speaking,
      queueLength: this.queue.length,
      useAzureSpeech: this.useAzureSpeech,
      useLocalModel: this.useLocalModel,
      rate: this.rate
    };
  }
}

// Make available globally
window.TTSService = TTSService;
