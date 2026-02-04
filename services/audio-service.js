// AudioService - Handles microphone input and Voice Activity Detection (VAD)

class AudioService {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.isRecording = false;
    this.isListening = false;

    // VAD settings
    this.vadThreshold = 0.02;
    this.silenceTimeout = 1500; // ms of silence before stopping
    this.minRecordingTime = 500; // minimum recording time in ms

    // Callbacks
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onAudioData = null;
    this.onVolumeChange = null;
  }

  async initialize() {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up audio context for VAD
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  async startListening() {
    if (this.isListening) return;

    if (!this.stream) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    this.isListening = true;
    this.monitorVAD();
    return true;
  }

  stopListening() {
    this.isListening = false;
    this.stopRecording();
  }

  monitorVAD() {
    if (!this.isListening) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = null;
    let recordingStart = null;

    const checkAudio = () => {
      if (!this.isListening) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength) / 255;

      // Notify volume change
      if (this.onVolumeChange) {
        this.onVolumeChange(rms);
      }

      const isSpeaking = rms > this.vadThreshold;

      if (isSpeaking) {
        silenceStart = null;

        if (!this.isRecording) {
          // Start recording
          this.startRecording();
          recordingStart = Date.now();
          if (this.onSpeechStart) {
            this.onSpeechStart();
          }
        }
      } else if (this.isRecording) {
        // Check for silence timeout
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > this.silenceTimeout) {
          // Ensure minimum recording time
          if (recordingStart && Date.now() - recordingStart > this.minRecordingTime) {
            this.stopRecording();
            if (this.onSpeechEnd) {
              this.onSpeechEnd();
            }
            silenceStart = null;
            recordingStart = null;
          }
        }
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  }

  startRecording() {
    if (this.isRecording || !this.stream) return;

    this.isRecording = true;
    this.audioChunks = [];

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      if (this.onAudioData) {
        this.onAudioData(audioBlob);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  stopRecording() {
    if (!this.isRecording) return null;

    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  async recordWithVAD() {
    return new Promise(async (resolve, reject) => {
      const initialized = await this.startListening();
      if (!initialized) {
        reject(new Error('Failed to initialize audio'));
        return;
      }

      let recordedBlob = null;

      this.onAudioData = (blob) => {
        recordedBlob = blob;
      };

      this.onSpeechEnd = () => {
        this.stopListening();
        if (recordedBlob) {
          resolve(recordedBlob);
        } else {
          reject(new Error('No audio recorded'));
        }
      };

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          reject(new Error('Recording timeout'));
        }
      }, 30000);
    });
  }

  async recordForDuration(durationMs) {
    return new Promise(async (resolve, reject) => {
      if (!this.stream) {
        const initialized = await this.initialize();
        if (!initialized) {
          reject(new Error('Failed to initialize audio'));
          return;
        }
      }

      this.audioChunks = [];
      this.startRecording();

      setTimeout(() => {
        this.stopRecording();
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);
      }, durationMs);
    });
  }

  setVADThreshold(threshold) {
    this.vadThreshold = threshold;
  }

  setSilenceTimeout(timeout) {
    this.silenceTimeout = timeout;
  }

  async getDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  }

  async setDevice(deviceId) {
    // Stop current stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    // Get new stream with selected device
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Reconnect to analyser
    if (this.audioContext && this.analyser) {
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
    }
  }

  destroy() {
    this.stopListening();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Make available globally
window.AudioService = AudioService;
