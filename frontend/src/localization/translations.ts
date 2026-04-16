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
  ta: {
    // Header
    welcome: 'வாழ்க',
    howAreYou: 'நீங்கள் இன்று எப்படி உணர்கிறீர்கள்?',

    // Microphone Button
    tapToSpeak: 'பேச கிளிக் செய்க',
    listening: 'கேட்கிறேன்...',
    processing: 'செயல்படுகிறது...',
    listeningForVoice: 'உங்கள் குரலுக்காக கேட்கிறேன்...',

    // Chat
    conversation: 'உரையாடல்',
    startSpeaking: 'தொடங்க பேசினால் தொடங்குங்கள்!',
    readAloud: 'உரக்க வாசிக்க',
    sorry: 'மன்னிக்கவும், நான் புரிந்துகொள்ள முடியவில்லை. மீண்டும் முயற்சி செய்க.',

    // Reminders
    dailyReminders: 'தினசரி நினைப்பூட்டல்',
    completed: 'முடிந்தது',
    allDoneToday: 'இன்று அனைத்தும் முடிந்தது!',
    completedToday: 'இன்று முடிந்தது',
    tapToComplete: 'முடிக்க கிளிக் செய்க',
    takeMedicine: 'மருந்து சாப்பிட வேண்டும்',
    drinkWater: 'தண்ணீர் குடிக்க வேண்டும்',
    exerciseTime: 'உடற்பயிற்சி நேரம்',
    mealTime: 'உணவு நேரம்',

    // Emotion Indicator
    feelingGood: 'நன்றாக உணர்கிறேன்!',
    aBitDown: 'கொஞ்சம் வீழ்ந்திருக்கிறேனா?',
    feelingWorried: 'கவலை படுகிறேனா?',
    feelingCalm: 'அமைதியாக உணர்கிறேன்',
    intensity: 'தீவிரம்',

    // Games
    brainTraining: 'மூளை பயிற்சி விளையாட்டு',
    memoryTest: 'நினைவு சோதனை',
    rememberWords: '5 விநாடிக்கு வார்த்தைகள் நினைவில் கொள்க',
    typingSpeed: 'தட்டச்சு வேகம்',
    typeQuickly: 'விரைவாக வாக்கியத்தை தட்டச்சு செய்க',
    howManyWords: 'நீங்கள் எத்தனை வார்த்தைகளை நினைவில் கொள்ள முடியும்? தட்டச்சு செய்க:',
    submitAnswer: 'பதிலை சமர்ப்பிக்க',
    typeSentence: 'இந்த வாக்கியத்தை தட்டச்சு செய்க:',
    startTyping: 'இங்கே தட்டச்சு தொடங்குங்கள்...',
    submit: 'சமர்ப்பிக்க',
    time: 'நேரம்',
    greatJob: 'ஆச்சரியமாக வேலை!',
    score: 'மதிப்பெண்',
    playAgain: 'மீண்டும் விளையாட',

    // Caregiver Dashboard
    caregiverDashboard: 'கார்ப்பரேட்டர் டேஷ்போர்ட்',
    monitoring: 'கண்காணிப்பு',
    currentEmotion: 'தற்போதைய உணர்வு',
    riskScore: 'ஆபத்து மதிப்பெண்',
    healthStatus: 'ஆரோக்கிய நிலை',
    lastInteraction: 'கடைசி இடைவினை',
    now: 'இப்போது',
    conversations: 'உரையாடல்கள்',
    dailyMoodTrend: 'தினசரி மனநிலை போக்கு',
    emotionDistribution: 'உணர்வு விநியோகம்',
    cognitionAnomalyDetection: 'பொறுத்தப்பாட்டு & ஆனோமலி கண்டுபிடிப்பு',
    activeAlerts: 'செயல்பாட்டு எச்சரிக்கைகள்',
    logout: 'வெளியேறு',
    exit: 'வெளியேறு',
    language: 'மொழி',

    // Status
    highRisk: 'அதிக ஆபத்து',
    moderateRisk: 'மிதமான ஆபத்து',
    lowRisk: 'குறைந்த ஆபத்து',
    stable: 'நிலையான',
    good: 'நன்றாக',
    stableVitals: 'நிலையான ஆரோக்கியம்',
    unusualBehavior: 'அசாதாரண நடத்தை கண்டறியப்பட்டது',
    medicationReminder: 'மருந்து நினைப்பூட்டல் தவறவிடப்பட்டது',

    // Languages
    english: 'ஆங்கிலம்',
    tamil: 'தமிழ்',
  },
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
