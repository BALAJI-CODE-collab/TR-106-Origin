/**
 * Voice Input Service
 * Handles Web Speech API integration and audio playback
 */

interface SpeechResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface VoiceServiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

class VoiceService {
  private recognition: any;
  private isListening: boolean = false;
  private currentLanguage: string = 'ta-IN';

  private findBestTamilVoice(): SpeechSynthesisVoice | null {
    if (!window.speechSynthesis) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }

    const exactMatch = voices.find((voice) => voice.lang?.toLowerCase() === 'ta-in');
    if (exactMatch) {
      return exactMatch;
    }

    const tamilMatch = voices.find((voice) => voice.lang?.toLowerCase().startsWith('ta'));
    if (tamilMatch) {
      return tamilMatch;
    }

    return null;
  }

  private chunkSpeechText(text: string, maxLen: number = 140): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return [];
    }

    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if (!sentence) {
        continue;
      }
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        if (current) {
          chunks.push(current);
        }
        if (sentence.length <= maxLen) {
          current = sentence;
        } else {
          const words = sentence.split(' ');
          let part = '';
          for (const word of words) {
            const next = part ? `${part} ${word}` : word;
            if (next.length <= maxLen) {
              part = next;
            } else {
              if (part) {
                chunks.push(part);
              }
              part = word;
            }
          }
          current = part;
        }
      }
    }

    if (current) {
      chunks.push(current);
    }
    return chunks;
  }

  constructor(config?: VoiceServiceConfig) {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = config?.continuous || false;
      this.recognition.interimResults = config?.interimResults || true;
      this.recognition.lang = config?.language || this.currentLanguage;
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }
  }

  /**
   * Start listening for speech
   */
  startListening(onResult: (result: SpeechResult) => void, onError: (error: string) => void): void {
    if (!this.recognition) {
      onError('Speech Recognition not available');
      return;
    }

    this.isListening = true;

    this.recognition.onstart = () => {
      console.log('Voice input started');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }

        if (event.results[i].isFinal) {
          onResult({
            text: finalTranscript.trim(),
            isFinal: true,
            confidence: confidence,
          });
        } else {
          onResult({
            text: interimTranscript,
            isFinal: false,
            confidence: confidence,
          });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      onError(`Error: ${event.error}`);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Voice input stopped');
    };

    this.recognition.start();
  }

  /**
   * Stop listening for speech
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Play text-to-speech audio
   */
  speak(text: string, language: string = this.currentLanguage, rate: number = 1.0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        console.warn('Text-to-Speech not available');
        reject('Text-to-Speech not available');
        return;
      }

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();
      
      // Small delay to ensure cancel completes
      setTimeout(() => {
        try {
          const chunks = this.chunkSpeechText(text);
          if (!chunks.length) {
            resolve();
            return;
          }

          const tamilVoice = language.toLowerCase().startsWith('ta') ? this.findBestTamilVoice() : null;
          const normalizedRate = Math.min(Math.max(rate, 0.5), 2.0);
          const resumeTimer = window.setInterval(() => {
            // Some browsers pause long utterances; periodic resume keeps playback continuous.
            window.speechSynthesis.resume();
          }, 250);

          let index = 0;
          const speakNext = () => {
            if (index >= chunks.length) {
              window.clearInterval(resumeTimer);
              resolve();
              return;
            }

            const utterance = new SpeechSynthesisUtterance(chunks[index]);
            utterance.lang = language;
            utterance.rate = normalizedRate;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            if (tamilVoice) {
              utterance.voice = tamilVoice;
            }

            utterance.onstart = () => {
              console.log('Speech synthesis started', { language, rate: normalizedRate, chunk: index + 1, total: chunks.length });
            };
            utterance.onend = () => {
              index += 1;
              speakNext();
            };
            utterance.onerror = (event) => {
              console.error('Speech synthesis error:', event.error, event);
              window.clearInterval(resumeTimer);
              reject(`Speech synthesis error: ${event.error}`);
            };

            window.speechSynthesis.speak(utterance);
          };

          speakNext();
        } catch (err) {
          console.error('Error creating speech utterance:', err);
          reject(err);
        }
      }, 100);
    });
  }

  /**
   * Change language for recognition and synthesis
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Get current listening status
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Cancel current speech
   */
  cancelSpeech(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceService = new VoiceService({
  continuous: false,
  interimResults: true,
  language: 'ta-IN',
});

export default VoiceService;
