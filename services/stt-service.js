// STTService - Speech-to-Text using Web Speech API or local models

class STTService {
  constructor() {
    this.isListening = false;
    this.useLocalModel = false; // Use downloaded models if available
    this.useAzureSpeech = true; // Default to Azure Speech Services
    this.azureConfig = null;

    // Callbacks
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;

    this.checkAzureConfig();
  }

  async checkAzureConfig() {
    try {
      const config = await window.electronAPI.azureGetConfig();
      if (config.configured) {
        this.azureConfig = config;
        this.useAzureSpeech = true;
        console.log('[STT] Azure Speech configured and enabled');
      } else {
        this.useAzureSpeech = false;
        console.warn('[STT] Azure Speech not configured. Will use Local Model if available.');
      }
    } catch (error) {
      console.error('[STT] Failed to check Azure config:', error);
      this.useAzureSpeech = false;
    }
  }


  setUseLocalModel(enabled) {
    this.useLocalModel = enabled;
    this.useAzureSpeech = !enabled;
  }

  async start() {
    if (this.isListening) return;

    if (this.useLocalModel || this.useAzureSpeech) {
      this.isListening = true;
      if (this.onStart) this.onStart();
      return;
    }

    throw new Error('STT service not configured (Azure credentials missing and Local Model disabled)');
  }

  stop() {
    this.isListening = false;
  }

  abort() {
    this.isListening = false;
  }

  // Transcribe audio from a blob
  async transcribe(audioBlob) {
    if (this.useLocalModel) {
      try {
        // Step 1: Decode audio in renderer (much easier than in Node)
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Step 2: Resample to 16kHz (required by Whisper)
        const offlineCtx = new OfflineAudioContext(
          1, // mono
          Math.ceil(audioBuffer.duration * 16000),
          16000
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        const resampledBuffer = await offlineCtx.startRendering();
        const float32Data = resampledBuffer.getChannelData(0);

        const status = await window.electronAPI.checkModelStatus('stt');
        if (!status.downloaded) {
          throw new Error('STT model not found');
        }

        console.log('[STT] Sending resampled audio (16kHz) to main process...');
        // Convert Float32Array to regular Array for reliable IPC serialization
        const audioDataArray = Array.from(float32Data);

        const result = await window.electronAPI.transcribeLocal({
          audioData: audioDataArray,
          modelPath: status.path
        });

        if (this.onEnd) this.onEnd();

        if (result.success) {
          return { text: result.text, confidence: result.confidence || 0.9 };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        if (this.onEnd) this.onEnd();
        throw new Error(`Local transcription failed: ${error.message}`);
      }
    }

    if (this.useAzureSpeech) {
      try {
        if (this.onStart) this.onStart();

        // Step 1: Decode audio in renderer (Azure SDK likes raw samples when pushed)
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Step 2: Resample to 16kHz (Standard for speech recognition)
        const offlineCtx = new OfflineAudioContext(
          1, // mono
          Math.ceil(audioBuffer.duration * 16000),
          16000
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        const resampledBuffer = await offlineCtx.startRendering();
        const float32Data = resampledBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (16-bit PCM is required for Azure PushStream)
        const int16Data = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
          const s = Math.max(-1, Math.min(1, float32Data[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert Int16Array to regular Array for reliable IPC serialization
        const audioDataArray = Array.from(int16Data);

        const result = await window.electronAPI.azureTranscribe({
          audioData: audioDataArray,
          sampleRate: 16000
        });

        if (this.onEnd) this.onEnd();

        if (result.success) {
          return { text: result.text, confidence: 1.0 };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        if (this.onEnd) this.onEnd();
        throw new Error(`Azure transcription failed: ${error.message}`);
      }
    }

    return new Promise((resolve, reject) => {
      reject(new Error('Real-time Web Speech recognition is no longer supported. Please use Azure or Local Models.'));
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
    console.log('[STT] Setting language to:', lang);
  }

  isAvailable() {
    return true; // We now rely on Azure/Local which are always "available" in terms of code presence
  }

  getStatus() {
    return {
      isListening: this.isListening,
      isAvailable: true,
      useAzureSpeech: this.useAzureSpeech,
      useLocalModel: this.useLocalModel
    };
  }
}

// Make available globally
window.STTService = STTService;
