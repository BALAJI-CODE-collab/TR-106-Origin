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
  private currentLanguage: string = 'en-US';
  private latestInterim: string = '';
  private heardFinalInSession: boolean = false;
  private watchdogTimer: number | null = null;
  private speechEndStopTimer: number | null = null;

  private isLocalhost(): boolean {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  getRecognitionDiagnostics(): {
    supported: boolean;
    secureContext: boolean;
    localhost: boolean;
    language: string;
  } {
    return {
      supported: Boolean(this.recognition),
      secureContext: window.isSecureContext,
      localhost: this.isLocalhost(),
      language: this.currentLanguage,
    };
  }

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
      this.recognition.interimResults = config?.interimResults ?? true;
      this.recognition.lang = config?.language || this.currentLanguage;
      this.recognition.maxAlternatives = 1;
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }
  }

  /**
   * Start listening for speech
   */
  async startListening(onResult: (result: SpeechResult) => void, onError: (error: string) => void): Promise<void> {
    if (!this.recognition) {
      onError('Speech recognition is not available in this browser. Please use latest Chrome or Edge.');
      return;
    }

    if (!window.isSecureContext && !this.isLocalhost()) {
      onError('Voice input requires HTTPS (or localhost). Open this app on https:// or localhost.');
      return;
    }

    try {
      // Proactively request microphone permission to avoid silent recognition failures.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error: any) {
      const message = error?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow mic access in browser settings.'
        : 'Microphone access failed. Please check your input device.';
      onError(message);
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('Recognition stop before restart failed:', error);
      }
    }

    this.isListening = true;
    this.latestInterim = '';
    this.heardFinalInSession = false;
    this.recognition.lang = this.currentLanguage;

    if (this.watchdogTimer) {
      window.clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.speechEndStopTimer) {
      window.clearTimeout(this.speechEndStopTimer);
      this.speechEndStopTimer = null;
    }

    const armWatchdog = () => {
      if (this.watchdogTimer) {
        window.clearTimeout(this.watchdogTimer);
      }
      this.watchdogTimer = window.setTimeout(() => {
        if (this.isListening) {
          try {
            this.recognition.stop();
          } catch (error) {
            console.warn('Failed to stop recognition from watchdog:', error);
          }
        }
      }, 9000);
    };

    this.recognition.onstart = () => {
      console.log('Voice input started');
      armWatchdog();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let latestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        latestConfidence = confidence || latestConfidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript.trim()) {
        this.latestInterim = interimTranscript.trim();
        armWatchdog();
        onResult({
          text: this.latestInterim,
          isFinal: false,
          confidence: latestConfidence,
        });
      }

      const finalText = finalTranscript.trim();
      if (finalText) {
        this.heardFinalInSession = true;
        this.latestInterim = '';
        armWatchdog();
        onResult({
          text: finalText,
          isFinal: true,
          confidence: latestConfidence,
        });
      }
    };

    this.recognition.onspeechend = () => {
      // Delay stop slightly so late final results are not cut off.
      if (!this.isListening) {
        return;
      }
      if (this.speechEndStopTimer) {
        window.clearTimeout(this.speechEndStopTimer);
      }
      this.speechEndStopTimer = window.setTimeout(() => {
        if (this.isListening) {
          try {
            this.recognition.stop();
          } catch (error) {
            console.warn('Failed to stop after speech end:', error);
          }
        }
      }, 700);
    };

    this.recognition.onnomatch = () => {
      onError('Could not understand speech. Please speak clearly and try again.');
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (this.watchdogTimer) {
        window.clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      if (event.error === 'no-speech') {
        onError('No speech detected. Please speak a little louder and try again.');
        return;
      }
      if (event.error === 'audio-capture') {
        onError('No microphone input detected. Check your selected microphone device.');
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError('Microphone blocked. Please allow microphone permission for this site.');
        return;
      }
      onError(`Error: ${event.error}`);
    };

    this.recognition.onend = () => {
      if (this.watchdogTimer) {
        window.clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      if (this.speechEndStopTimer) {
        window.clearTimeout(this.speechEndStopTimer);
        this.speechEndStopTimer = null;
      }
      if (!this.heardFinalInSession && this.latestInterim.trim()) {
        onResult({
          text: this.latestInterim.trim(),
          isFinal: true,
          confidence: 0.55,
        });
        this.latestInterim = '';
      } else if (!this.heardFinalInSession) {
        onError('No transcription captured. Please try speaking for 2-3 seconds.');
      }
      this.isListening = false;
      console.log('Voice input stopped');
    };

    try {
      this.recognition.start();
    } catch (error: any) {
      this.isListening = false;
      const message = error?.name === 'InvalidStateError'
        ? 'Voice recognition is already active. Please wait and try again.'
        : error?.message || 'Unable to start voice input';
      onError(message);
    }
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
  language: 'en-US',
});

export default VoiceService;
