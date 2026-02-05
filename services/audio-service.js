// AudioService - Handles microphone input and Voice Activity Detection (VAD)

class AudioService {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null; // Track source node for proper cleanup
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
      // If we already have an active stream, reuse it
      if (this.stream && this.stream.active) {
        console.log('[Audio] Reusing existing stream');
        return true;
      }

      // Cleanup any previous instances first
      this.cleanup();

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

      // Handle resuming context if it starts suspended (browsers policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyser);

      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  // ... (startListening ...)

  cleanup() {
    // Disconnect source node before closing context to prevent memory leaks
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        // Ignore disconnect errors if already disconnected
      }
      this.sourceNode = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.isListening = false;
    this.isRecording = false;
  }

  async startListening() {
    if (this.isListening) return;

    if (!this.stream) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    // Ensure AudioContext is running (needed for browser security policies)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[Audio] Resuming suspended AudioContext');
      await this.audioContext.resume();
    }

    console.log(`[Audio] Starting VAD listening (Context: ${this.audioContext?.state})`);
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
    let lastHeartbeat = Date.now();

    const checkAudio = () => {
      if (!this.isListening) return;

      // Heartbeat log every 5 seconds
      if (Date.now() - lastHeartbeat > 5000) {
        console.log(`[VAD] Loop heartbeat (Context: ${this.audioContext?.state}, Listening: ${this.isListening})`);
        lastHeartbeat = Date.now();
      }

      // Use time-domain data for more accurate volume detection
      this.analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS volume from time-domain samples
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        // Convert byte (0-255) to normalized amplitude (-1.0 to 1.0)
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / bufferLength);

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
          console.log('[VAD] Speech start detected');
          if (this.onSpeechStart) {
            this.onSpeechStart();
          }
        }
      } else if (this.isRecording) {
        // Check for silence timeout
        if (!silenceStart) {
          silenceStart = Date.now();
          console.log('[VAD] Silence started...');
        } else if (Date.now() - silenceStart > this.silenceTimeout) {
          // Ensure minimum recording time
          if (recordingStart && Date.now() - recordingStart > this.minRecordingTime) {
            console.log('[VAD] Speech end detected (after timeout)');

            // Clear markers first to prevent re-triggering while stopping
            silenceStart = null;
            recordingStart = null;

            this.stopRecording().then(() => {
              if (this.onSpeechEnd) {
                this.onSpeechEnd();
              }
            });
          }
        }
      }

      // Use setTimeout instead of requestAnimationFrame to avoid background throttling in Electron
      setTimeout(checkAudio, 40);
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

    this.mediaRecorder.onerror = (event) => {
      console.error('[Audio] MediaRecorder error:', event.error);
      this.isRecording = false;
    };

    this.mediaRecorder.onstart = () => {
      console.log('[Audio] MediaRecorder started');
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
    if (!this.isRecording) return Promise.resolve(null);

    this.isRecording = false;

    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        const handleStop = () => {
          this.mediaRecorder.removeEventListener('stop', handleStop);
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          if (this.onAudioData) {
            this.onAudioData(audioBlob);
          }
          resolve(audioBlob);
        };

        this.mediaRecorder.addEventListener('stop', handleStop);
        this.mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
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

      this.onSpeechEnd = async () => {
        this.stopListening();

        // Give a tiny bit of time for any pending chunks
        if (!recordedBlob) {
          await new Promise(r => setTimeout(r, 100));
        }

        if (recordedBlob) {
          resolve(recordedBlob);
        } else {
          reject(new Error('No audio recorded'));
        }
      };

      // Timeout after 12 seconds to keep blob size under 150KB
      setTimeout(async () => {
        if (this.isListening) {
          console.log('[Audio] Recording timeout reached (12s max)');
          this.stopListening(); // Stop listening FIRST to prevent new recordings

          if (this.isRecording) {
            console.log('[Audio] Timeout during active recording - forcing stop and processing');
            await this.stopRecording();
            // onSpeechEnd will be called by stopRecording().then(...) in monitorVAD
          } else {
            reject(new Error('No speech detected within 12 seconds'));
          }
        }
      }, 12000);
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
    // Disconnect old source node first
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {
        // Ignore
      }
      this.sourceNode = null;
    }

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
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyser);
    }
  }

  destroy() {
    this.stopListening();
    this.cleanup(); // Use cleanup for proper resource release
  }
}

// Make available globally
window.AudioService = AudioService;
