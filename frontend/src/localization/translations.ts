/**
 * Localization strings for elderly care UI
 * Supports English and Tamil
 */

type Language = 'en' | 'ta';

export interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Header
    welcome: 'Welcome',
    howAreYou: 'How are you feeling today?',

    // Microphone Button
    tapToSpeak: 'Tap to speak',
    listening: 'Listening...',
    processing: 'Processing...',
    listeningForVoice: 'Listening for your voice...',

    // Chat
    conversation: 'Conversation',
    startSpeaking: 'Start speaking to begin!',
    readAloud: 'Read aloud',
    sorry: 'Sorry, I had trouble understanding. Please try again.',

    // Reminders
    dailyReminders: 'Daily Reminders',
    completed: 'completed',
    allDoneToday: 'All done for today!',
    completedToday: 'Completed Today',
    tapToComplete: 'Tap to complete',
    takeMedicine: 'Take medicine',
    drinkWater: 'Drink water',
    exerciseTime: 'Exercise time',
    mealTime: 'Meal time',

    // Emotion Indicator
    feelingGood: 'Feeling good!',
    aBitDown: 'A bit down?',
    feelingWorried: 'Feeling worried?',
    feelingCalm: 'Feeling calm',
    intensity: 'Intensity',

    // Games
    brainTraining: 'Brain Training Games',
    memoryTest: 'Memory Test',
    rememberWords: 'Remember words for 5 seconds',
    typingSpeed: 'Typing Speed',
    typeQuickly: 'Type the sentence quickly',
    howManyWords: 'How many words can you recall? Type them (comma separated):',
    submitAnswer: 'Submit Answer',
    typeSentence: 'Type this sentence:',
    startTyping: 'Start typing here...',
    submit: 'Submit',
    time: 'Time',
    greatJob: 'Great job!',
    score: 'Score',
    playAgain: 'Play Again',

    // Caregiver Dashboard
    caregiverDashboard: 'Caregiver Dashboard',
    monitoring: 'Monitoring',
    currentEmotion: 'Current Emotion',
    riskScore: 'Risk Score',
    healthStatus: 'Health Status',
    lastInteraction: 'Last Interaction',
    now: 'Now',
    conversations: 'conversations',
    dailyMoodTrend: 'Daily Mood Trend',
    emotionDistribution: 'Emotion Distribution',
    cognitionAnomalyDetection: 'Cognition & Anomaly Detection',
    activeAlerts: 'Active Alerts',
    logout: 'Logout',
    exit: 'Exit',
    language: 'Language',

    // Status
    highRisk: 'High Risk',
    moderateRisk: 'Moderate Risk',
    lowRisk: 'Low Risk',
    stable: 'Stable',
    good: 'Good',
    stableVitals: 'Stable vitals',
    unusualBehavior: 'Unusual behavioral pattern detected',
    medicationReminder: 'Medication reminder missed',

    // Languages
    english: 'English',
    tamil: 'Tamil',
  },
  // Intentionally left empty so unknown/missing keys fall back to English.
  ta: {},
};

/**
 * Get translation for a key in the specified language
 */
export const translate = (key: string, language: Language = 'en'): string => {
  return translations[language][key] || translations['en'][key] || key;
};

/**
 * Get all translations for a language
 */
export const getTranslations = (language: Language): Translations => {
  return translations[language];
};

/**
 * React hook for using translations in components
 */
export const useTranslations = (language: Language) => {
  return (key: string): string => translate(key, language);
};
