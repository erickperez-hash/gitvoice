// ModelDownloader - Download and manage AI models for offline use

class ModelDownloader {
  constructor() {
    this.modelsDir = './models';
    this.models = {
      stt: {
        name: 'Whisper Tiny (ONNX)',
        folder: 'whisper-tiny.en',
        files: [
          { name: 'config.json', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/config.json' },
          { name: 'tokenizer.json', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/tokenizer.json' },
          { name: 'tokenizer_config.json', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/tokenizer_config.json' },
          { name: 'preprocessor_config.json', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/preprocessor_config.json' },
          { name: 'generation_config.json', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/generation_config.json' },
          { name: 'onnx/encoder_model_quantized.onnx', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder_model_quantized.onnx' },
          { name: 'onnx/decoder_model_merged_quantized.onnx', url: 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/decoder_model_merged_quantized.onnx' }
        ],
        size: '45MB',
        downloaded: false
      },
      tts: {
        name: 'Kokoro TTS (ONNX)',
        filename: 'kokoro.onnx',
        url: 'https://huggingface.co/onnx-community/Kokoro-82M-ONNX/resolve/main/onnx/model_quantized.onnx',
        size: '92MB',
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
        this.models[modelType].needsUpdate = status.needsUpdate || false;
      }
    } catch (error) {
      console.warn('Could not check model status:', error);
    }
  }

  getModelStatus() {
    return {
      stt: {
        ...this.models.stt,
        status: this.models.stt.needsUpdate ? 'update-required' : (this.models.stt.downloaded ? 'downloaded' : 'not-downloaded')
      },
      tts: {
        ...this.models.tts,
        status: this.models.tts.needsUpdate ? 'update-required' : (this.models.tts.downloaded ? 'downloaded' : 'not-downloaded')
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

    // Set up progress listener
    const cleanup = window.electronAPI.onModelDownloadProgress((data) => {
      if (data.modelType === modelType) {
        if (this.onProgress) {
          // Progress data is now more complex with multi-file
          this.onProgress(modelType, data.progress, data.downloadedBytes);
        }
      }
    });

    try {
      if (model.files) {
        // Multi-file download
        for (let i = 0; i < model.files.length; i++) {
          const file = model.files[i];
          const result = await window.electronAPI.downloadModel({
            modelType,
            url: file.url,
            filename: model.folder ? `${model.folder}/${file.name}` : file.name,
            totalFiles: model.files.length,
            fileIndex: i
          });
          if (!result.success) throw new Error(result.error);
        }
      } else {
        // Single file download
        const result = await window.electronAPI.downloadModel({
          modelType,
          url: model.url,
          filename: model.filename
        });
        if (!result.success) throw new Error(result.error);
      }

      model.downloaded = true;
      if (this.onComplete) {
        this.onComplete(modelType);
      }
      return { success: true, message: 'Download complete' };
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
