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
  private synthesis: SpeechSynthesisUtterance | null = null;
  private isListening: boolean = false;
  private currentLanguage: string = 'ta-IN';

  constructor(config?: VoiceServiceConfig) {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = config?.continuous || false;
      this.recognition.interimResults = config?.interimResults || true;
      this.recognition.language = config?.language || this.currentLanguage;
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
        reject('Text-to-Speech not available');
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.language = language;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(`Speech synthesis error: ${event.error}`);

      window.speechSynthesis.speak(utterance);
      this.synthesis = utterance;
    });
  }

  /**
   * Change language for recognition and synthesis
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
    if (this.recognition) {
      this.recognition.language = language;
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
