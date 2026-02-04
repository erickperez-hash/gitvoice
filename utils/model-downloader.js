// ModelDownloader - Download and manage AI models for offline use

class ModelDownloader {
  constructor() {
    this.modelsDir = './models';
    this.models = {
      stt: {
        name: 'Whisper Tiny (ONNX)',
        url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/model_q8.onnx',
        filename: 'whisper-tiny.onnx',
        size: '40MB',
        downloaded: false
      },
      tts: {
        name: 'Kokoro TTS',
        url: 'https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v0_19.onnx',
        filename: 'kokoro.onnx',
        size: '82MB',
        downloaded: false
      }
    };

    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;

    this.checkDownloadedModels();
  }

  async checkDownloadedModels() {
    try {
      for (const modelType of Object.keys(this.models)) {
        const status = await window.electronAPI.checkModelStatus(modelType);
        this.models[modelType].downloaded = status.downloaded;
      }
    } catch (error) {
      console.warn('Could not check model status:', error);
    }
  }

  getModelStatus() {
    return {
      stt: {
        ...this.models.stt,
        status: this.models.stt.downloaded ? 'downloaded' : 'not-downloaded'
      },
      tts: {
        ...this.models.tts,
        status: this.models.tts.downloaded ? 'downloaded' : 'not-downloaded'
      }
    };
  }

  async downloadModel(modelType) {
    const model = this.models[modelType];
    if (!model) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    if (model.downloaded) {
      return { success: true, message: 'Model already downloaded' };
    }

    console.log(`Model download requested for ${modelType}: ${model.url}`);

    // Set up progress listener
    const cleanup = window.electronAPI.onModelDownloadProgress((data) => {
      if (data.modelType === modelType) {
        if (this.onProgress) {
          this.onProgress(modelType, data.progress);
        }
      }
    });

    try {
      const result = await window.electronAPI.downloadModel({
        modelType,
        url: model.url,
        filename: model.filename
      });

      if (result.success) {
        model.downloaded = true;
        if (this.onComplete) {
          this.onComplete(modelType);
        }
        return { success: true, message: 'Download complete' };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (this.onError) {
        this.onError(modelType, error.message);
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  async downloadAllModels() {
    const results = [];
    for (const modelType of Object.keys(this.models)) {
      try {
        const result = await this.downloadModel(modelType);
        results.push({ model: modelType, ...result });
      } catch (error) {
        results.push({ model: modelType, success: false, error: error.message });
      }
    }
    return results;
  }

  isModelAvailable(modelType) {
    return this.models[modelType]?.downloaded || false;
  }

  areAllModelsAvailable() {
    return Object.values(this.models).every(m => m.downloaded);
  }

  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  setCompleteCallback(callback) {
    this.onComplete = callback;
  }

  setErrorCallback(callback) {
    this.onError = callback;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Make available globally
window.ModelDownloader = ModelDownloader;
