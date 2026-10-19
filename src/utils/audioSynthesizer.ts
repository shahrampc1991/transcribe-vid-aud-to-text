/**
 * Generates an audio WAV blob for demo samples or synthetic playback
 * using the Web Audio API and SpeechSynthesis (if available) or harmonic synthesized audio.
 */

export function createSynthesizedAudioUrl(durationSeconds: number, title: string): string {
  // Create an audio context to synthesize an ambient audio track with voice-like harmonics
  const sampleRate = 22050;
  const numChannels = 1;
  const totalSamples = Math.floor(sampleRate * Math.min(durationSeconds, 120));
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  // Generate pleasant synthesized human-speech-like harmonic vocal formants and melodic tones
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Base pitch (approx male/female speaking cadence 140Hz - 220Hz with slight modulation)
    const phraseTime = t % 4.0;
    const isSpeaking = phraseTime < 3.2; // slight pauses between sentences

    let sample = 0;
    if (isSpeaking) {
      const f0 = 160 + Math.sin(t * 3.5) * 25 + Math.sin(t * 11) * 8;
      // Speech formants F1, F2
      const f1 = 600 + Math.sin(t * 4.2) * 150;
      const f2 = 1700 + Math.cos(t * 5.1) * 300;

      const v0 = Math.sin(2 * Math.PI * f0 * t);
      const v1 = Math.sin(2 * Math.PI * f1 * t) * 0.4;
      const v2 = Math.sin(2 * Math.PI * f2 * t) * 0.2;

      // Soft envelope
      const env = Math.min(1, phraseTime * 3) * Math.min(1, (3.2 - phraseTime) * 3);
      sample = (v0 * 0.5 + v1 + v2) * 0.25 * env;
    } else {
      // gentle room tone
      sample = (Math.random() - 0.5) * 0.005;
    }

    // Clip & write 16-bit PCM
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
