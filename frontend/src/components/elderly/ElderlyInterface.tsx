import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Globe, LogOut } from 'lucide-react';
import { MicButton } from './MicButton';
import { ChatWindow } from './ChatWindow';
import { ReminderPanel } from './ReminderPanel';
import { EmotionIndicator } from './EmotionIndicator';
import { CognitiveGame } from './CognitiveGame';
import { voiceService } from '../../services/voice';
import { useAppState } from '../../hooks/useAppState';
import { apiClient, DiseaseAssessment } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ToastNotification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  durationMs: number;
}

export const ElderlyInterface: React.FC = () => {
  const {
    state,
    addConversationTurn,
    completeReminder,
    addGameResult,
    setListening,
    setProcessing,
  } = useAppState();

  const TAMIL_SPEECH_LANGUAGE = 'ta-IN';

  const [messages, setMessages] = useState<Message[]>([]);
  const [interimText, setInterimText] = useState('');
  const [showGameModule, setShowGameModule] = useState(false);
  const [gameTriggered, setGameTriggered] = useState(false);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(0);
  const [noResponseSecondsLeft, setNoResponseSecondsLeft] = useState(0);
  const [seenReminderIds, setSeenReminderIds] = useState<string[]>([]);
  const [freezeReason, setFreezeReason] = useState<'taken' | 'not_taken' | ''>('');
  const [pendingCompletionReminderId, setPendingCompletionReminderId] = useState<string | null>(null);
  const [escalationSent, setEscalationSent] = useState(false);
  const [symptomLock, setSymptomLock] = useState(false);
  const [guardianUsername, setGuardianUsername] = useState('guardian001');
  const [guardianPassword, setGuardianPassword] = useState('guard@001');
  const [allowActivities, setAllowActivities] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [latestDiseaseAssessment, setLatestDiseaseAssessment] = useState<DiseaseAssessment | null>(null);

  const activeReminder = useMemo(
    () => state.reminders.find((r) => r.id === activeReminderId) || null,
    [state.reminders, activeReminderId]
  );

  useEffect(() => {
    voiceService.setLanguage(TAMIL_SPEECH_LANGUAGE);
  }, [TAMIL_SPEECH_LANGUAGE]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  const pushNotification = (text: string, type: ToastNotification['type'] = 'info', durationMs: number = 5000) => {
    const id = `ntf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [...prev, { id, text, type, durationMs }]);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('ElderCare Alert', { body: text });
      } catch (error) {
        console.error(error);
      }
    }

    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, durationMs);
  };

  useEffect(() => {
    const loadResidentPolicy = async () => {
      try {
        const residents = await apiClient.getResidents();
        const currentResident = residents.find((r) => r.resident_id === state.userId);
        setAllowActivities(Boolean(currentResident?.allow_activities));
      } catch (error) {
        console.error(error);
        setAllowActivities(false);
      }
    };
    void loadResidentPolicy();
  }, [state.userId]);

  useEffect(() => {
    if (activeReminderId || freezeSecondsLeft > 0) {
      return;
    }

    const nextReminder = state.reminders.find(
      (reminder) => !reminder.completed && !seenReminderIds.includes(reminder.id)
    );

    if (nextReminder) {
      setActiveReminderId(nextReminder.id);
    }
  }, [
    state.reminders,
    activeReminderId,
    freezeSecondsLeft,
    seenReminderIds,
  ]);

  useEffect(() => {
    if (activeReminderId && freezeSecondsLeft === 0 && !escalationSent) {
      setNoResponseSecondsLeft((prev) => (prev > 0 ? prev : 45));
    }
  }, [activeReminderId, freezeSecondsLeft, escalationSent]);

  useEffect(() => {
    if (freezeSecondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setFreezeSecondsLeft((prev) => {
        if (prev <= 1) {
          if (freezeReason === 'taken' && pendingCompletionReminderId) {
            completeReminder(pendingCompletionReminderId);
          }
          setActiveReminderId(null);
          setPendingCompletionReminderId(null);
          setFreezeReason('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [freezeSecondsLeft, pendingCompletionReminderId, completeReminder, freezeReason]);

  useEffect(() => {
    if (!activeReminderId || freezeSecondsLeft > 0 || noResponseSecondsLeft <= 0 || escalationSent) {
      return;
    }

    const timer = window.setInterval(() => {
      setNoResponseSecondsLeft((prev) => {
        if (prev <= 1) {
          void apiClient.escalateAlert({
            resident_id: state.userId,
            reason: 'No response to medication confirmation notification',
            symptoms: symptomLock ? ['fever', 'sore throat'] : [],
            reminder_id: activeReminderId,
            no_response_seconds: 45,
          });
          pushNotification('No response detected. Alert sent to children and nearby guardians.', 'warning', 300000);
          setEscalationSent(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeReminderId, freezeSecondsLeft, noResponseSecondsLeft, escalationSent, state.userId, symptomLock]);

  // Handle speech recognition
  const handleStartListening = () => {
    if (symptomLock) {
      return;
    }
    setListening(true);
    setInterimText('');

    voiceService.startListening(
      (result) => {
        if (!result.isFinal) {
          setInterimText(result.text);
        } else {
          handleUserInput(result.text);
          setInterimText('');
        }
      },
      (error) => {
        console.error(error);
        setListening(false);
      }
    );
  };

  const handleStopListening = () => {
    voiceService.stopListening();
    setListening(false);
  };

  const buildSeniorFriendlyTamilSpeech = (rawText: string) => {
    let text = rawText;

    // Convert mixed English care words into simpler Tamil terms for clearer elderly TTS.
    text = text.replace(/\bbreakfast\b/gi, 'காலை உணவு');
    text = text.replace(/\blunch\b/gi, 'மதிய உணவு');
    text = text.replace(/\bdinner\b/gi, 'இரவு உணவு');
    text = text.replace(/\bmeal\b/gi, 'உணவு');

    // Keep replacements conservative so full sentence content is preserved.
    text = text.replace(/\bhi\s+my\s+name\s+is\s+/gi, 'வணக்கம். என் பெயர் ');
    text = text.replace(/\bmy\s+name\s+is\s+/gi, 'என் பெயர் ');
    text = text.replace(/\bi\s+remember\s*[:]?\s*/gi, 'எனக்கு நினைவில் உள்ளது. ');
    text = text.replace(/\bupcoming\s+meal\s+at\s+/gi, 'அடுத்த உணவு நேரம் ');

    // Read times as words for better audio understanding.
    text = text.replace(/(\d{1,2}):(\d{2})/g, '$1 மணி $2 நிமிடம்');

    // Translate risk labels when they appear in mixed output.
    text = text.replace(/\blow\b/gi, 'குறைவு');
    text = text.replace(/\bmoderate\b/gi, 'மிதமான');
    text = text.replace(/\bhigh\b/gi, 'அதிகம்');

    // Add pauses for clearer speech cadence.
    text = text.replace(/;/g, '. ');
    text = text.replace(/\s+/g, ' ').trim();

    // Safety: if formatting accidentally collapses content, use original text.
    if (text.length < Math.max(24, Math.floor(rawText.length * 0.45))) {
      return rawText;
    }

    return text;
  };

  // Handle user input
  const handleUserInput = async (userText: string) => {
    if (!userText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setProcessing(true);

    try {
      // Call backend API
      const response = await apiClient.processInteraction(
        userText,
        state.userId,
        `session_${Date.now()}`,
        'ta'
      );

      let spokenResponse = response.response;
      const requestedDisease = response.disease_assessment?.requested;
      if (requestedDisease === 'alzheimer') {
        const risk = response.disease_assessment.alzheimer?.risk_score;
        if (risk) {
          spokenResponse += ` மதிப்பீட்டு முடிவு: அல்சைமர் ஆபத்து நிலை ${risk.risk_level}, மதிப்பு ${risk.risk_score}.`;
        }
      }
      if (requestedDisease === 'parkinson') {
        const risk = response.disease_assessment.parkinson?.risk_score;
        if (risk) {
          spokenResponse += ` மதிப்பீட்டு முடிவு: பார்கின்சன் ஆபத்து நிலை ${risk.risk_level}, மதிப்பு ${risk.risk_score}.`;
        }
      }

      // Add AI response
      const aiMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        text: spokenResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLatestDiseaseAssessment(response.disease_assessment || null);

      const lowered = userText.toLowerCase();
      const hasFever = lowered.includes('fever') || userText.includes('காய்ச்சல்');
      const hasSoreThroat = lowered.includes('sore throat') || userText.includes('தொண்டை வலி');
      if (hasFever && hasSoreThroat) {
        setSymptomLock(true);
        const medicineReminder = state.reminders.find((r) => r.category === 'medicine' && !r.completed);
        if (medicineReminder) {
          setActiveReminderId(medicineReminder.id);
          setNoResponseSecondsLeft(45);
        }
      }

      // Store in app state
      addConversationTurn(
        userText,
        spokenResponse,
        response.emotion,
        response.alzheimer_risk?.risk_score?.risk_score
      );

      // Speak response
      const speechText = buildSeniorFriendlyTamilSpeech(spokenResponse);
      await voiceService.speak(
        speechText,
        TAMIL_SPEECH_LANGUAGE,
        0.92
      );

      // Check if game should be triggered
      const riskScore = response.alzheimer_risk?.risk_score?.risk_score || 0;
      if (allowActivities && riskScore > 0.5 && !gameTriggered) {
        setGameTriggered(true);
        setShowGameModule(true);
      }
    } catch (error) {
      console.error('Error:', error);
      pushNotification('Chatbot connection issue. Please try again.', 'error');
      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        text: 'மன்னிக்கவும், உங்கள் கோரிக்கையை புரிந்துகொள்ள சிரமம் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setProcessing(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      const speechText = buildSeniorFriendlyTamilSpeech(text);
      await voiceService.speak(
        speechText,
        TAMIL_SPEECH_LANGUAGE,
        0.92
      );
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleReminderTaken = () => {
    if (!activeReminderId) {
      return;
    }
    setSeenReminderIds((prev) => [...prev, activeReminderId]);
    setPendingCompletionReminderId(activeReminderId);
    setActiveReminderId(null);
    setNoResponseSecondsLeft(0);
    setFreezeReason('taken');
    setFreezeSecondsLeft(300);
    pushNotification('Medication marked as taken. Screen frozen for 5 minutes.', 'success', 300000);
  };

  const handleReminderNotTaken = async () => {
    if (!activeReminderId) {
      return;
    }
    setFreezeReason('not_taken');
    setFreezeSecondsLeft(300);
    setNoResponseSecondsLeft(0);
    if (!escalationSent) {
      try {
        await apiClient.escalateAlert({
          resident_id: state.userId,
          reason: 'Medication not taken confirmation received',
          symptoms: symptomLock ? ['fever', 'sore throat'] : [],
          reminder_id: activeReminderId,
          no_response_seconds: 0,
        });
        setEscalationSent(true);
        pushNotification('Medication not taken. Alert sent to children and nearby guardians.', 'warning', 300000);
      } catch (error) {
        console.error(error);
        pushNotification('Failed to send escalation alert. Please try again.', 'error');
      }
    }
  };

  const handleGuardianUnlock = async () => {
    try {
      const result = await apiClient.guardianLogin(guardianUsername, guardianPassword);
      if (!result.ok) {
        pushNotification('Invalid guardian credentials.', 'error');
        return;
      }
      setSymptomLock(false);
      pushNotification('Guardian verified. Safety lock removed.', 'success');
    } catch (error) {
      console.error(error);
      pushNotification('Unable to verify guardian credentials right now.', 'error');
    }
  };

  const formatFreezeTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const quickActions = [
    { id: 'q1', label: 'இன்றைய அட்டவணை சொல்லுங்கள்' },
    { id: 'q2', label: 'நினைவாற்றல் விளையாட்டு தொடங்கு' },
    { id: 'q3', label: 'பார்கின்சன் பரிசோதனை செய்யவும்' },
    { id: 'q4', label: 'நான் கவலையாக இருக்கிறேன்' },
  ];

  const getRiskBadgeClasses = (riskLevel?: string) => {
    if (riskLevel === 'high') {
      return 'bg-rose-500/20 text-rose-100 border border-rose-300/30';
    }
    if (riskLevel === 'moderate') {
      return 'bg-amber-500/20 text-amber-100 border border-amber-300/30';
    }
    return 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/30';
  };

  const triggerAlzheimerGame = () => {
    if (symptomLock) {
      return;
    }
    setShowGameModule(true);
    void handleUserInput('alzheimer screening செய்யவும்');
  };

  const triggerParkinsonCheck = () => {
    if (symptomLock) {
      return;
    }
    void handleUserInput('parkinson screening செய்யவும்');
  };

  const handleQuickAction = (label: string) => {
    if (symptomLock) {
      return;
    }
    if (label.includes('விளையாட்டு')) {
      setShowGameModule(true);
      void handleUserInput('alzheimer screening செய்யவும்');
      return;
    }
    handleUserInput(label);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071226] p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.22),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.2),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-8 left-8 h-56 w-56 rounded-full bg-sky-400 opacity-20 blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-12 right-10 h-64 w-64 rounded-full bg-indigo-400 opacity-20 blur-3xl"
          animate={{ y: [0, 18, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-6xl mx-auto mb-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-5 shadow-2xl backdrop-blur-xl">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50">வரவேற்கிறோம், {state.userName}</h1>
            <p className="text-slate-200 mt-2">குரல் மூலம் பேசலாம். நான் உடனே பதில் அளிக்கிறேன்.</p>
          </div>

          <div className="flex gap-3">
            {/* Tamil-Only Speech Mode */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-slate-100"
            >
              <Globe className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-xs text-cyan-100">Speech Language</span>
                <span className="text-sm font-semibold text-white">Tamil (தமிழ்)</span>
              </div>
            </motion.div>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-3 font-bold text-white transition hover:bg-rose-700"
            >
              <LogOut className="w-5 h-5" />
              Exit
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Chat & Microphone */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Microphone Button */}
          <div className="rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-md">
            <MicButton
              isListening={state.isListening}
              onStartListening={handleStartListening}
              onStopListening={handleStopListening}
              isProcessing={state.isProcessing}
            />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {quickActions.map((action, idx) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleQuickAction(action.label)}
                  className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
                >
                  {action.label}
                </motion.button>
              ))}
            </div>

            {/* Interim Text Display */}
            {interimText && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-lg italic text-slate-600"
              >
                "{interimText}"
              </motion.p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex items-center gap-2 text-cyan-800">
                  <Brain className="h-5 w-5" />
                  <h3 className="font-semibold">Alzheimer Game</h3>
                </div>
                <p className="mt-2 text-sm text-cyan-900">Run memory game + Alzheimer screening in one tap.</p>
                <button
                  onClick={triggerAlzheimerGame}
                  className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Alzheimer Game
                </button>
                {latestDiseaseAssessment?.alzheimer?.risk_score && (
                  <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(latestDiseaseAssessment.alzheimer.risk_score.risk_level)}`}>
                    Risk: {latestDiseaseAssessment.alzheimer.risk_score.risk_level} ({Math.round(latestDiseaseAssessment.alzheimer.risk_score.risk_score * 100)}%)
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-center gap-2 text-indigo-800">
                  <Activity className="h-5 w-5" />
                  <h3 className="font-semibold">Parkinson Check</h3>
                </div>
                <p className="mt-2 text-sm text-indigo-900">Run speech-based Parkinson risk analysis.</p>
                <button
                  onClick={triggerParkinsonCheck}
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Parkinson Check
                </button>
                {latestDiseaseAssessment?.parkinson?.risk_score && (
                  <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(latestDiseaseAssessment.parkinson.risk_score.risk_level)}`}>
                    Risk: {latestDiseaseAssessment.parkinson.risk_score.risk_level} ({Math.round(latestDiseaseAssessment.parkinson.risk_score.risk_score * 100)}%)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div className="h-96 overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
            <ChatWindow messages={messages} onPlayAudio={handlePlayAudio} />
          </div>
        </motion.div>

        {/* Right Column - Reminders & Emotion */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {/* Emotion Indicator */}
          <EmotionIndicator emotion={state.currentEmotion} score={state.currentRiskScore} />

          {/* Reminder Panel */}
          <ReminderPanel reminders={state.reminders} onCompleteReminder={completeReminder} />
        </motion.div>
      </div>

      {/* Cognitive Game Module */}
      {showGameModule && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto mt-8"
        >
          <CognitiveGame
            isVisible={showGameModule}
            onGameComplete={(result) => {
              addGameResult({
                ...result,
                timestamp: new Date(),
              });
              setShowGameModule(false);
            }}
          />
        </motion.div>
      )}

      {/* Freeze Reminder Modal */}
      {activeReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl border border-cyan-400/40 bg-slate-900/95 p-6 text-slate-100 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-cyan-200">மருந்து/நினைவூட்டல் உறுதிப்படுத்தல்</h3>
            <p className="mt-3 text-sm text-slate-300">இந்த அறிவிப்பை உறுதிப்படுத்தும் வரை திரை முடக்கப்பட்டிருக்கும்.</p>
            <div className="mt-5 rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-300">Reminder</p>
              <p className="mt-1 text-lg font-semibold">{activeReminder.title}</p>
              <p className="text-sm text-slate-400">Time: {activeReminder.time}</p>
            </div>

            {freezeSecondsLeft > 0 ? (
              <div className="mt-5 rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-center">
                <p className="text-sm text-amber-100">Screen will unlock after</p>
                <p className="mt-1 text-3xl font-bold text-amber-200">{formatFreezeTimer(freezeSecondsLeft)}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReminderTaken}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-lg font-bold text-slate-950"
                >
                  Yes, Taken
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReminderNotTaken}
                  className="w-full rounded-xl bg-rose-500 px-4 py-3 text-lg font-bold text-white"
                >
                  No, Not Taken
                </motion.button>
                {noResponseSecondsLeft > 0 && (
                  <p className="text-center text-sm text-rose-200">Escalation countdown: {noResponseSecondsLeft}s</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {symptomLock && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/95 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-300/40 bg-slate-950/95 p-6 text-white">
            <h3 className="font-[Orbitron] text-2xl font-bold text-rose-200">Health Safety Lock</h3>
            <p className="mt-3 text-sm text-slate-300">
              Fever and sore throat symptoms detected. Guardian authentication is required to continue.
            </p>
            <div className="mt-5 space-y-3">
              <input
                value={guardianUsername}
                onChange={(e) => setGuardianUsername(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-slate-900 px-4 py-3"
                placeholder="Guardian username"
              />
              <input
                type="password"
                value={guardianPassword}
                onChange={(e) => setGuardianPassword(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-slate-900 px-4 py-3"
                placeholder="Guardian password"
              />
              <button
                onClick={handleGuardianUnlock}
                className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950"
              >
                Guardian Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {freezeReason === 'taken' && freezeSecondsLeft > 0 && (
        <div className="fixed right-4 top-20 z-[78] w-full max-w-sm">
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/20 px-4 py-3 text-amber-50 shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-semibold">Medication confirmation freeze is active</p>
            <p className="mt-1 text-sm">You can continue using chatbot features. Freeze ends in:</p>
            <p className="mt-2 text-2xl font-bold text-amber-100">{formatFreezeTimer(freezeSecondsLeft)}</p>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="fixed right-4 top-4 z-[80] w-full max-w-sm space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
                item.type === 'success'
                  ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-50'
                  : item.type === 'warning'
                    ? 'border-amber-300/40 bg-amber-500/20 text-amber-50'
                    : item.type === 'error'
                      ? 'border-rose-300/40 bg-rose-500/20 text-rose-50'
                      : 'border-cyan-300/40 bg-cyan-500/20 text-cyan-50'
              }`}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
