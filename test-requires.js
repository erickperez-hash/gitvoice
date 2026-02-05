console.log('Testing requires...');
try {
    console.log('Requiring path...');
    require('path');
    console.log('Requiring fs...');
    require('fs');
    console.log('Requiring dotenv...');
    require('dotenv').config();
    console.log('Requiring dugite...');
    require('dugite');
    console.log('Requiring microsoft-cognitiveservices-speech-sdk...');
    require('microsoft-cognitiveservices-speech-sdk');
    console.log('All requires successful!');
} catch (e) {
    console.error('Error during require:', e);
}
