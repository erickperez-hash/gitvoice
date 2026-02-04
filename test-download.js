const axios = require('axios');
const fs = require('fs');

async function test() {
  const url = 'https://huggingface.co/onnx-community/whisper-tiny.en/resolve/main/onnx/encoder_model_quantized.onnx';
  try {
    console.log('Sending GET request to:', url);
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 10000,
      maxRedirects: 5
    });
    
    console.log('Response status:', response.status);
    console.log('Content-Length:', response.headers['content-length']);
    
    let downloaded = 0;
    const total = parseInt(response.headers['content-length'], 10);
    
    response.data.on('data', (chunk) => {
      downloaded += chunk.length;
      if (total) {
        const percent = Math.round((downloaded / total) * 100);
        process.stdout.write(`\rProgress: ${percent}% (${downloaded}/${total})`);
      } else {
        process.stdout.write(`\rDownloaded: ${downloaded} bytes`);
      }
    });
    
    response.data.on('end', () => {
      console.log('\nDownload finished successfully');
      process.exit(0);
    });
    
    response.data.on('error', (err) => {
      console.error('\nStream error occurred:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Initial request failed:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
    }
    process.exit(1);
  }
}

test();
