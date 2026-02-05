/**
 * @jest-environment jsdom
 */

// Mock window.electronAPI
window.electronAPI = {
    azureGetConfig: jest.fn().mockResolvedValue({ configured: true, region: 'eastus' }),
    azureTranscribe: jest.fn().mockResolvedValue({ success: true, text: 'hello world' }),
    azureSpeak: jest.fn().mockResolvedValue({ success: true, audioData: new Array(1000).fill(0) }),
    checkModelStatus: jest.fn().mockResolvedValue({ downloaded: true, path: '/mock/path' }),
    transcribeLocal: jest.fn().mockResolvedValue({ success: true, text: 'local hello' }),
    ttsLocal: jest.fn().mockResolvedValue({ success: true, audioData: new Array(1000).fill(0) })
};

// Mock AudioContext and related classes
class MockAudioBuffer {
    constructor({ length, sampleRate }) {
        this.length = length;
        this.sampleRate = sampleRate;
        this.duration = length / sampleRate;
    }
    getChannelData() { return new Float32Array(this.length); }
}

window.AudioContext = jest.fn().mockImplementation(() => ({
    decodeAudioData: jest.fn().mockResolvedValue(new MockAudioBuffer({ length: 16000, sampleRate: 44100 })),
    createBufferSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        onended: null
    }),
    createMediaStreamSource: jest.fn().mockReturnValue({ connect: jest.fn() }),
    createAnalyser: jest.fn().mockReturnValue({ fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData: jest.fn() }),
    createBuffer: jest.fn().mockImplementation((channels, length, sampleRate) => new MockAudioBuffer({ length, sampleRate })),
    destination: {},
    close: jest.fn().mockResolvedValue(undefined),
    state: 'running'
}));

window.OfflineAudioContext = jest.fn().mockImplementation((channels, length, sampleRate) => ({
    createBufferSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        buffer: null
    }),
    destination: {},
    startRendering: jest.fn().mockResolvedValue(new MockAudioBuffer({ length, sampleRate }))
}));

// Basic polyfill for Blob.arrayBuffer if missing in JSDOM
if (typeof Blob.prototype.arrayBuffer !== 'function') {
    Blob.prototype.arrayBuffer = function () {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(this);
        });
    };
}

// Load services (they attach to window)
require('../services/stt-service');
require('../services/tts-service');

describe('Voice Services Logic Tests', () => {
    let stt;
    let tts;

    beforeEach(() => {
        jest.clearAllMocks();
        // Services attach to window in their constructor or script execution
        stt = new window.STTService();
        tts = new window.TTSService();
    });

    test('STTService.transcribe azure mode calls azureTranscribe with Int16 data', async () => {
        const mockBlob = new Blob(['mock audio'], { type: 'audio/webm' });
        stt.useAzureSpeech = true;
        stt.useLocalModel = false;

        const result = await stt.transcribe(mockBlob);

        expect(window.electronAPI.azureTranscribe).toHaveBeenCalled();
        const callArgs = window.electronAPI.azureTranscribe.mock.calls[0][0];
        expect(callArgs).toHaveProperty('audioData');
        expect(Array.isArray(callArgs.audioData)).toBe(true);
        // Each element should be an integer (from Int16Array)
        expect(Number.isInteger(callArgs.audioData[0])).toBe(true);
        expect(result.text).toBe('hello world');
    });

    test('TTSService.speak azure mode calls azureSpeak and plays audio', async () => {
        tts.useAzureSpeech = true;

        // We need to mock playAudioData or the AudioContext inside it
        const playSpy = jest.spyOn(tts, 'playAudioData').mockResolvedValue(undefined);

        await tts.speak('hello');

        expect(window.electronAPI.azureSpeak).toHaveBeenCalledWith({
            text: 'hello',
            voiceName: expect.any(String)
        });
        expect(playSpy).toHaveBeenCalled();
    });

    test('TTSService.speak local mode calls ttsLocal', async () => {
        tts.useAzureSpeech = false;
        tts.useLocalModel = true;

        const playSpy = jest.spyOn(tts, 'playAudioData').mockResolvedValue(undefined);

        await tts.speak('local hello');

        expect(window.electronAPI.ttsLocal).toHaveBeenCalledWith({
            text: 'local hello',
            modelPath: expect.any(String)
        });
        expect(playSpy).toHaveBeenCalled();
    });
});
