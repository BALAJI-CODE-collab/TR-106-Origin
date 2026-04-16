import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, LogOut } from 'lucide-react';
import { MicButton } from './MicButton';
import { ChatWindow } from './ChatWindow';
import { ReminderPanel } from './ReminderPanel';
import { EmotionIndicator } from './EmotionIndicator';
import { CognitiveGame } from './CognitiveGame';
import { voiceService } from '../../services/voice';
import { useAppState } from '../../hooks/useAppState';
import { apiClient } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const ElderlyInterface: React.FC = () => {
  const {
    state,
    addConversationTurn,
    completeReminder,
    addGameResult,
    setListening,
    setProcessing,
    setLanguage,
  } = useAppState();

  const [messages, setMessages] = useState<Message[]>([]);
  const [interimText, setInterimText] = useState('');
  const [showGameModule, setShowGameModule] = useState(false);
  const [gameTriggered, setGameTriggered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(0);
  const [seenReminderIds, setSeenReminderIds] = useState<string[]>([]);

  const activeReminder = useMemo(
    () => state.reminders.find((r) => r.id === activeReminderId) || null,
    [state.reminders, activeReminderId]
  );

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth <= 768);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    voiceService.setLanguage(state.selectedLanguage === 'ta' ? 'ta-IN' : 'en-US');
  }, [state.selectedLanguage]);

  useEffect(() => {
    if (!isMobile || activeReminderId || freezeSecondsLeft > 0) {
      return;
    }

    const nextReminder = state.reminders.find(
      (reminder) => !reminder.completed && !seenReminderIds.includes(reminder.id)
    );

    if (nextReminder) {
      setActiveReminderId(nextReminder.id);
    }
  }, [
    isMobile,
    state.reminders,
    activeReminderId,
    freezeSecondsLeft,
    seenReminderIds,
  ]);

  useEffect(() => {
    if (freezeSecondsLeft <= 0 || !activeReminderId) {
      return;
    }

    const timer = window.setInterval(() => {
      setFreezeSecondsLeft((prev) => {
        if (prev <= 1) {
          completeReminder(activeReminderId);
          setActiveReminderId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [freezeSecondsLeft, activeReminderId, completeReminder]);

  // Handle speech recognition
  const handleStartListening = () => {
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
        `session_${Date.now()}`
      );

      let spokenResponse = response.response;
      const requestedDisease = response.disease_assessment?.requested;
      if (requestedDisease === 'alzheimer') {
        const risk = response.disease_assessment.alzheimer?.risk_score;
        if (risk) {
          spokenResponse += ` Assessment result: Alzheimer risk is ${risk.risk_level} with score ${risk.risk_score}.`;
        }
      }
      if (requestedDisease === 'parkinson') {
        const risk = response.disease_assessment.parkinson?.risk_score;
        if (risk) {
          spokenResponse += ` Assessment result: Parkinson risk is ${risk.risk_level} with score ${risk.risk_score}.`;
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

      // Store in app state
      addConversationTurn(
        userText,
        spokenResponse,
        response.emotion,
        response.alzheimer_risk?.risk_score?.risk_score
      );

      // Speak response
      await voiceService.speak(
        spokenResponse,
        state.selectedLanguage === 'ta' ? 'ta-IN' : 'en-US',
        0.9
      );

      // Check if game should be triggered
      const riskScore = response.alzheimer_risk?.risk_score?.risk_score || 0;
      if (riskScore > 0.5 && !gameTriggered) {
        setGameTriggered(true);
        setShowGameModule(true);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        text: 'Sorry, I had trouble understanding. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setProcessing(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      await voiceService.speak(
        text,
        state.selectedLanguage === 'ta' ? 'ta-IN' : 'en-US',
        0.9
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
    setFreezeSecondsLeft(300);
  };

  const formatFreezeTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const quickActions = [
    { id: 'q1', label: 'இன்றைய அட்டவணை சொல்லுங்கள்' },
    { id: 'q2', label: 'நினைவாற்றல் விளையாட்டு தொடங்கு' },
    { id: 'q3', label: 'நான் கவலையாக இருக்கிறேன்' },
  ];

  const handleQuickAction = (label: string) => {
    if (label.includes('விளையாட்டு')) {
      setShowGameModule(true);
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
            {/* Language Selector */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-slate-100"
            >
              <Globe className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-xs text-cyan-100">Select Language</span>
                <select
                  value={state.selectedLanguage}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'ta')}
                  className="bg-transparent text-sm font-semibold text-white outline-none"
                >
                  <option value="ta" className="text-slate-900">Tamil</option>
                  <option value="en" className="text-slate-900">English</option>
                </select>
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

      {/* Mobile Freeze Reminder Modal */}
      {isMobile && activeReminder && (
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
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleReminderTaken}
                className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 text-lg font-bold text-slate-950"
              >
                Taken
              </motion.button>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
