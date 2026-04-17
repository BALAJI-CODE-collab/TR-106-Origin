import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Globe, LogOut } from 'lucide-react';
import { MicButton } from './MicButton';
import { ChatWindow } from './ChatWindow';
import { ReminderPanel } from './ReminderPanel';
import { EmotionIndicator } from './EmotionIndicator';
import { voiceService } from '../../services/voice';
import { useAppState } from '../../hooks/useAppState';
import { apiClient, DiseaseAssessment } from '../../services/api';
import { AlzheimerRisk } from '../AlzheimerRisk';
import { ExternalAlzheimerGame } from './ExternalAlzheimerGame';
import { ExternalParkinsonGame } from './ExternalParkinsonGame';
import { ExternalDementiaGame } from './ExternalDementiaGame';
import { ExternalSpeechTherapyGame } from './ExternalSpeechTherapyGame';

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

interface TestRecommendation {
  show: boolean;
  memoryTest: boolean;
  parkinsonTest: boolean;
  dementiaTest: boolean;
  speechTherapyTest: boolean;
  reason: string;
}

interface UserInputMeta {
  source: 'voice' | 'text';
  confidence?: number;
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

  const ENGLISH_SPEECH_LANGUAGE = 'en-US';

  const [messages, setMessages] = useState<Message[]>([]);
  const [interimText, setInterimText] = useState('');
  const [showGameModule, setShowGameModule] = useState(false);
  const [showParkinsonGameModule, setShowParkinsonGameModule] = useState(false);
  const [showDementiaGameModule, setShowDementiaGameModule] = useState(false);
  const [showSpeechTherapyGameModule, setShowSpeechTherapyGameModule] = useState(false);
  const [externalGameLoading, setExternalGameLoading] = useState(false);
  const [externalParkinsonGameLoading, setExternalParkinsonGameLoading] = useState(false);
  const [externalDementiaGameLoading, setExternalDementiaGameLoading] = useState(false);
  const [externalSpeechTherapyGameLoading, setExternalSpeechTherapyGameLoading] = useState(false);
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
  const [unknownVoiceAlertSent, setUnknownVoiceAlertSent] = useState(false);
  const [testRecommendation, setTestRecommendation] = useState<TestRecommendation>({
    show: false,
    memoryTest: false,
    parkinsonTest: false,
    dementiaTest: false,
    speechTherapyTest: false,
    reason: '',
  });
  const lastFinalTranscriptRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const activeReminder = useMemo(
    () => state.reminders.find((r) => r.id === activeReminderId) || null,
    [state.reminders, activeReminderId]
  );

  useEffect(() => {
    voiceService.setLanguage(ENGLISH_SPEECH_LANGUAGE);
  }, [ENGLISH_SPEECH_LANGUAGE]);

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
          const ctx = getReminderEscalationContext(activeReminder?.category);
          void apiClient.escalateAlert({
            resident_id: state.userId,
            reason: `No response to ${ctx.itemLabel} confirmation notification`,
            category: activeReminder?.category || 'reminder',
            symptoms: symptomLock ? ['fever', 'sore throat'] : [],
            reminder_id: activeReminderId,
            no_response_seconds: 45,
            details: {
              reminder_title: activeReminder?.title || '',
              missed_item: ctx.itemLabel,
              status: 'no_response',
            },
          });
          pushNotification(`No response detected for ${ctx.itemLabel}. Alert mail sent to children and guardians.`, 'warning', 300000);
          setEscalationSent(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeReminderId, freezeSecondsLeft, noResponseSecondsLeft, escalationSent, state.userId, symptomLock, activeReminder]);

  // Handle speech recognition
  const handleStartListening = () => {
    if (symptomLock) {
      return;
    }

    const diagnostics = voiceService.getRecognitionDiagnostics();
    if (!diagnostics.supported) {
      pushNotification('Speech recognition is not supported in this browser. Use latest Chrome or Edge.', 'error', 9000);
      return;
    }
    if (!diagnostics.secureContext && !diagnostics.localhost) {
      pushNotification('Voice input needs HTTPS (or localhost). Open the app on a secure URL.', 'error', 9000);
      return;
    }

    setListening(true);
    setInterimText('');

    void voiceService.startListening(
      (result) => {
        if (!result.isFinal) {
          setInterimText(result.text);
        } else {
          const normalized = result.text.trim();
          const now = Date.now();
          const isDuplicateFinal =
            normalized &&
            normalized.toLowerCase() === lastFinalTranscriptRef.current.text.toLowerCase() &&
            now - lastFinalTranscriptRef.current.at < 2500;

          if (!normalized || normalized.length < 2 || isDuplicateFinal) {
            setInterimText('');
            return;
          }

          lastFinalTranscriptRef.current = { text: normalized, at: now };
          const maybeUnknownVoice = result.confidence > 0 && result.confidence < 0.35;
          if (maybeUnknownVoice && !unknownVoiceAlertSent) {
            setUnknownVoiceAlertSent(true);
            void apiClient.escalateAlert({
              resident_id: state.userId,
              reason: 'Unknown voice pattern detected during speech input',
              category: 'unknown_voice',
              details: {
                confidence: result.confidence,
                transcript_preview: result.text.slice(0, 120),
              },
            });
            pushNotification('Unknown voice detected. Escalation mail sent to children and guardians.', 'warning', 12000);
          }
          handleUserInput(normalized, {
            source: 'voice',
            confidence: result.confidence,
          });
          setInterimText('');
        }
      },
      (error) => {
        console.error(error);
        setListening(false);
        pushNotification(error || 'Speech transcription failed. Please try again.', 'error', 8000);
      }
    );
  };

  const handleStopListening = () => {
    voiceService.stopListening();
    setListening(false);
  };

  const buildSeniorFriendlyEnglishSpeech = (rawText: string) => {
    let text = rawText;

    // Expand common abbreviations and improve cadence for clearer speech output.
    text = text.replace(/\be\.g\.\b/gi, 'for example');
    text = text.replace(/\bi\.e\.\b/gi, 'that is');
    text = text.replace(/;/g, '. ');
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length < Math.max(24, Math.floor(rawText.length * 0.45))) {
      return rawText;
    }

    return text;
  };

  const buildVoiceCognitiveData = (text: string, confidence?: number): Record<string, number> => {
    const safeConfidence =
      typeof confidence === 'number' && Number.isFinite(confidence)
        ? Math.max(0, Math.min(1, confidence))
        : 0.7;

    const fillerMatches = text.match(/\b(uh|um|hmm|er|ah)\b/gi);
    const fillerCount = fillerMatches ? fillerMatches.length : 0;
    const punctuationPauseCount = (text.match(/[,.!?]/g) || []).length;

    const speechPause = Math.min(6, fillerCount + Math.floor(punctuationPauseCount / 2));
    const voiceStability = Math.round(40 + safeConfidence * 55);
    const speechRate = Math.round(85 + safeConfidence * 45);

    return {
      voice_stability: voiceStability,
      speech_pause: speechPause,
      speech_rate: speechRate,
      voice_confidence: Math.round(safeConfidence * 100),
    };
  };

  const sanitizeAssistantResponse = (userText: string, rawResponse: string) => {
    const loweredUser = userText.toLowerCase();
    const asksSchedule = /\b(schedule|plan|calendar|reminder)\b/.test(loweredUser);
    const asksRecall = /\b(remember|recall|earlier|last time|what did i say|previous|before)\b/.test(loweredUser);

    let cleaned = rawResponse.trim();

    // Remove noisy memory suffix unless the user explicitly asked to recall earlier context.
    if (!asksRecall && cleaned.includes(' I remember:')) {
      cleaned = cleaned.split(' I remember:')[0].trim();
    }

    // Replace stale schedule fallback with a direct practical answer.
    if (
      asksSchedule &&
      cleaned.includes('I do not see a scheduled item right now')
    ) {
      return [
        'I can help you make a schedule right now. Suggested plan for today:',
        '8:00 AM medicine, 1:00 PM lunch, 5:30 PM evening walk, and 8:30 PM night medicine.',
        'Tell me your preferred times and I will adjust it for you.',
      ].join(' ');
    }

    return cleaned;
  };

  // Handle user input
  const handleUserInput = async (userText: string, inputMeta: UserInputMeta = { source: 'text' }) => {
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
      const voiceCognitiveData =
        inputMeta.source === 'voice' ? buildVoiceCognitiveData(userText, inputMeta.confidence) : undefined;

      // Call backend API
      const response = await apiClient.processInteraction(
        userText,
        state.userId,
        `session_${Date.now()}`,
        'en',
        voiceCognitiveData
      );

      let spokenResponse = sanitizeAssistantResponse(userText, response.response);
      const requestedDisease = response.disease_assessment?.requested;
      if (requestedDisease === 'alzheimer') {
        const risk = response.disease_assessment.alzheimer?.risk_score;
        if (risk) {
          spokenResponse += ` Assessment result: Alzheimer risk level is ${risk.risk_level}, score ${risk.risk_score}.`;
        }
      }
      if (requestedDisease === 'parkinson') {
        const risk = response.disease_assessment.parkinson?.risk_score;
        if (risk) {
          spokenResponse += ` Assessment result: Parkinson risk level is ${risk.risk_level}, score ${risk.risk_score}.`;
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

      const memorySignal = /(memory|forget|forgot|confused|recall)/i.test(userText);
      const motorSignal = /(tremor|shaking|balance|stiff|parkinson)/i.test(userText);
      const alzheimerScore = response.alzheimer_risk?.risk_score?.risk_score || 0;
      const parkinsonScore = response.disease_assessment?.parkinson?.risk_score?.risk_score || 0;
      const alzheimerFeatures = response.alzheimer_risk?.risk_score?.features || {};
      const parkinsonFeatures = response.disease_assessment?.parkinson?.risk_score?.features || {};

      const voiceStability = Number(alzheimerFeatures.voice_stability ?? voiceCognitiveData?.voice_stability ?? 100);
      const speechPause = Number(alzheimerFeatures.speech_pause ?? voiceCognitiveData?.speech_pause ?? 0);
      const speechRate = Number(parkinsonFeatures.speech_rate ?? voiceCognitiveData?.speech_rate ?? 120);
      const lowVoiceConfidence =
        inputMeta.source === 'voice' && typeof inputMeta.confidence === 'number' && inputMeta.confidence > 0 && inputMeta.confidence < 0.55;

      const voiceMemorySignal = speechPause >= 2 || voiceStability < 70 || (lowVoiceConfidence && alzheimerScore >= 0.3);
      const voiceMotorSignal = speechRate < 90 || (lowVoiceConfidence && parkinsonScore >= 0.3);
      const voiceDementiaSignal = speechPause >= 3 || (voiceStability < 65 && alzheimerScore >= 0.3);
      const voiceTherapySignal = lowVoiceConfidence || voiceStability < 68 || speechRate < 88;

      const recommendMemory = memorySignal || alzheimerScore >= 0.45 || (inputMeta.source === 'voice' && voiceMemorySignal);
      const recommendParkinson = motorSignal || parkinsonScore >= 0.45 || (inputMeta.source === 'voice' && voiceMotorSignal);
      const recommendDementia = inputMeta.source === 'voice' && (voiceDementiaSignal || alzheimerScore >= 0.35);
      const recommendSpeechTherapy = inputMeta.source === 'voice' && (voiceTherapySignal || voiceMotorSignal);

      if (recommendMemory || recommendParkinson || recommendDementia || recommendSpeechTherapy) {
        const reason =
          inputMeta.source === 'voice'
            ? 'Based on voice pattern signals (clarity, pause, and speech rate), a quick assessment game is recommended.'
            : 'Based on this speech interaction, a quick assessment is recommended.';

        setTestRecommendation({
          show: true,
          memoryTest: recommendMemory,
          parkinsonTest: recommendParkinson,
          dementiaTest: recommendDementia,
          speechTherapyTest: recommendSpeechTherapy,
          reason,
        });
      } else {
        setTestRecommendation({
          show: false,
          memoryTest: false,
          parkinsonTest: false,
          dementiaTest: false,
          speechTherapyTest: false,
          reason: '',
        });
      }

      const lowered = userText.toLowerCase();
      const hasFever = lowered.includes('fever');
      const hasSoreThroat = lowered.includes('sore throat');
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
      const speechText = buildSeniorFriendlyEnglishSpeech(spokenResponse);
      await voiceService.speak(
        speechText,
        ENGLISH_SPEECH_LANGUAGE,
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
        text: 'Sorry, I had trouble understanding your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setProcessing(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      const speechText = buildSeniorFriendlyEnglishSpeech(text);
      await voiceService.speak(
        speechText,
        ENGLISH_SPEECH_LANGUAGE,
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

  const getReminderEscalationContext = (reminderCategory?: string) => {
    if (reminderCategory === 'water') {
      return { reason: 'Water intake reminder not followed', itemLabel: 'water' };
    }
    if (reminderCategory === 'medicine') {
      return { reason: 'Medication reminder not followed', itemLabel: 'tablet/medicine' };
    }
    return { reason: 'Critical reminder not followed', itemLabel: 'scheduled care task' };
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
        const ctx = getReminderEscalationContext(activeReminder?.category);
        await apiClient.escalateAlert({
          resident_id: state.userId,
          reason: ctx.reason,
          category: activeReminder?.category || 'reminder',
          symptoms: symptomLock ? ['fever', 'sore throat'] : [],
          reminder_id: activeReminderId,
          no_response_seconds: 0,
          details: {
            reminder_title: activeReminder?.title || '',
            missed_item: ctx.itemLabel,
            status: 'not_taken',
          },
        });
        setEscalationSent(true);
        pushNotification(`${ctx.itemLabel} not taken. Alert mail sent to children and guardians.`, 'warning', 300000);
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
    { id: 'q1', label: 'How is my day going?' },
    { id: 'q2', label: 'Tell me something comforting' },
    { id: 'q3', label: 'Let us do a memory warm-up' },
    { id: 'q4', label: 'I want to talk for a while' },
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
  };

  const handleExternalAlzheimerGameResult = async (result: { mmse: number; cdr: number; digital: number }) => {
    addGameResult({
      type: 'memory',
      score: result.mmse,
      accuracy: result.digital,
      timeSpent: 0,
      timestamp: new Date(),
    });

    setExternalGameLoading(true);
    try {
      const response = await apiClient.processInteraction(
        'Please run Alzheimer screening',
        state.userId,
        `alzheimer_game_${Date.now()}`,
        'en',
        {
          mmse: result.mmse,
          cdr: result.cdr,
          digital_score: result.digital,
          typing_speed: result.digital,
          typing_errors: Math.max(0, 100 - result.digital),
          voice_stability: 75,
          speech_pause: 1,
          age: 65,
        }
      );

      setLatestDiseaseAssessment(response.disease_assessment || null);
      pushNotification('Alzheimer game completed and analysis updated.', 'success', 9000);
    } catch (error) {
      console.error(error);
      pushNotification('Game completed, but analysis update failed.', 'error', 9000);
    } finally {
      setExternalGameLoading(false);
      setShowGameModule(false);
    }
  };

  const triggerParkinsonCheck = () => {
    if (symptomLock) {
      return;
    }
    setShowParkinsonGameModule(true);
  };

  const handleExternalParkinsonGameResult = async (result: { tremor: number; coordination: number; reaction: number }) => {
    addGameResult({
      type: 'typing',
      score: result.coordination,
      accuracy: 100 - result.tremor,
      timeSpent: 0,
      timestamp: new Date(),
    });

    setExternalParkinsonGameLoading(true);
    try {
      const response = await apiClient.processInteraction(
        'Please run Parkinson screening',
        state.userId,
        `parkinson_game_${Date.now()}`,
        'en',
        {
          parkinson_tremor: result.tremor,
          parkinson_coordination: result.coordination,
          parkinson_reaction: result.reaction,
          speech_rate: Math.max(45, result.reaction),
          typing_speed: result.coordination,
        }
      );

      setLatestDiseaseAssessment(response.disease_assessment || null);
      pushNotification('Parkinson game completed and analysis updated.', 'success', 9000);
    } catch (error) {
      console.error(error);
      pushNotification('Game completed, but Parkinson analysis update failed.', 'error', 9000);
    } finally {
      setExternalParkinsonGameLoading(false);
      setShowParkinsonGameModule(false);
    }
  };

  const triggerDementiaGame = () => {
    if (symptomLock) {
      return;
    }
    setShowDementiaGameModule(true);
  };

  const sendGameAssessmentMail = async (
    gameName: string,
    reason: string,
    details: Record<string, any>
  ) => {
    try {
      const mailResponse = await apiClient.escalateAlert({
        resident_id: state.userId,
        reason,
        category: 'game_assessment',
        details: {
          game_name: gameName,
          ...details,
        },
      });

      const status = mailResponse?.result?.status;
      if (status === 'sent') {
        pushNotification(`${gameName} report sent to children and guardians.`, 'success', 8000);
      } else if (status === 'logged_only_no_smtp') {
        pushNotification(`${gameName} report saved, but SMTP is not configured.`, 'warning', 9000);
      } else if (status === 'logged_only_mail_failed') {
        pushNotification(`${gameName} report saved, but mail delivery failed.`, 'warning', 9000);
      }
    } catch (error) {
      console.error(error);
      pushNotification(`${gameName} report could not be mailed, but scores are saved.`, 'warning', 9000);
    }
  };

  const handleExternalDementiaGameResult = async (result: { recall: number; orientation: number; attention: number }) => {
    addGameResult({
      type: 'memory',
      score: result.recall,
      accuracy: result.orientation,
      timeSpent: 0,
      timestamp: new Date(),
    });

    setExternalDementiaGameLoading(true);
    try {
      const normalizedRecall = Math.max(0, Math.min(100, result.recall));
      const normalizedOrientation = Math.max(0, Math.min(100, result.orientation));
      const normalizedAttention = Math.max(0, Math.min(100, result.attention));
      const dementiaCompositeScore = Math.round((normalizedRecall * 0.4) + (normalizedOrientation * 0.35) + (normalizedAttention * 0.25));

      const response = await apiClient.processInteraction(
        'Please run Alzheimer screening',
        state.userId,
        `dementia_game_${Date.now()}`,
        'en',
        {
          mmse: normalizedRecall,
          cdr: Math.max(0.0, Math.min(2.0, (100 - normalizedOrientation) / 50)),
          digital_score: normalizedAttention,
          typing_speed: normalizedAttention,
          typing_errors: Math.max(0, 100 - normalizedAttention),
          dementia_recall: normalizedRecall,
          dementia_orientation: normalizedOrientation,
          dementia_attention: normalizedAttention,
          dementia_composite: dementiaCompositeScore,
        }
      );

      setLatestDiseaseAssessment(response.disease_assessment || null);
      pushNotification('Dementia game completed and analysis updated.', 'success', 9000);

      await sendGameAssessmentMail(
        'Dementia Focus Game',
        'Dementia game assessment completed',
        {
          dementia_recall: normalizedRecall,
          dementia_orientation: normalizedOrientation,
          dementia_attention: normalizedAttention,
          dementia_composite: dementiaCompositeScore,
          alzheimer_risk_level: response.disease_assessment?.alzheimer?.risk_score?.risk_level || 'unknown',
          alzheimer_risk_score: response.disease_assessment?.alzheimer?.risk_score?.risk_score ?? null,
        }
      );
    } catch (error) {
      console.error(error);
      pushNotification('Game completed, but Dementia analysis update failed.', 'error', 9000);
    } finally {
      setExternalDementiaGameLoading(false);
      setShowDementiaGameModule(false);
    }
  };

  const triggerSpeechTherapyGame = () => {
    if (symptomLock) {
      return;
    }
    setShowSpeechTherapyGameModule(true);
  };

  const handleExternalSpeechTherapyGameResult = async (result: { clarity: number; pace: number; stability: number }) => {
    addGameResult({
      type: 'typing',
      score: result.clarity,
      accuracy: result.stability,
      timeSpent: 0,
      timestamp: new Date(),
    });

    setExternalSpeechTherapyGameLoading(true);
    try {
      const normalizedClarity = Math.max(0, Math.min(100, result.clarity));
      const normalizedPace = Math.max(0, Math.min(100, result.pace));
      const normalizedStability = Math.max(0, Math.min(100, result.stability));
      const speechTherapyCompositeScore = Math.round((normalizedClarity * 0.45) + (normalizedPace * 0.25) + (normalizedStability * 0.3));

      const response = await apiClient.processInteraction(
        'Please run Parkinson screening',
        state.userId,
        `speech_therapy_game_${Date.now()}`,
        'en',
        {
          parkinson_tremor: Math.max(0, 100 - normalizedStability),
          parkinson_coordination: normalizedClarity,
          parkinson_reaction: normalizedPace,
          speech_rate: Math.max(45, normalizedPace),
          voice_stability: normalizedStability,
          speech_therapy_clarity: normalizedClarity,
          speech_therapy_pace: normalizedPace,
          speech_therapy_stability: normalizedStability,
          speech_therapy_composite: speechTherapyCompositeScore,
        }
      );

      setLatestDiseaseAssessment(response.disease_assessment || null);
      pushNotification('Speech therapy game completed and analysis updated.', 'success', 9000);

      await sendGameAssessmentMail(
        'Speech Therapy Game',
        'Speech therapy game assessment completed',
        {
          speech_therapy_clarity: normalizedClarity,
          speech_therapy_pace: normalizedPace,
          speech_therapy_stability: normalizedStability,
          speech_therapy_composite: speechTherapyCompositeScore,
          parkinson_risk_level: response.disease_assessment?.parkinson?.risk_score?.risk_level || 'unknown',
          parkinson_risk_score: response.disease_assessment?.parkinson?.risk_score?.risk_score ?? null,
        }
      );
    } catch (error) {
      console.error(error);
      pushNotification('Game completed, but Speech therapy analysis update failed.', 'error', 9000);
    } finally {
      setExternalSpeechTherapyGameLoading(false);
      setShowSpeechTherapyGameModule(false);
    }
  };

  const handleQuickAction = (label: string) => {
    if (symptomLock) {
      return;
    }
    if (label.toLowerCase().includes('game')) {
      setShowGameModule(true);
      void handleUserInput('Please run Alzheimer screening');
      return;
    }
    handleUserInput(label);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] p-4 md:p-8">
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
        className="relative z-10 mx-auto mb-8 max-w-7xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Companion Space</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-50 md:text-4xl">Welcome, {state.userName}</h1>
            <p className="mt-2 max-w-2xl text-slate-200">I am here to talk, listen, and guide you gently whenever you need support.</p>
          </div>

          <div className="flex gap-3">
            {/* English Speech Mode */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-slate-100"
            >
              <Globe className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-xs text-cyan-100">Speech Language</span>
                <span className="text-sm font-semibold text-white">English (US)</span>
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
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        {/* Left Column - Chat & Microphone */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {/* Microphone Button */}
          <div className="rounded-[28px] border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Companion Mode</p>
                <h2 className="mt-1 text-lg font-bold text-slate-800">Speak naturally. I will stay with you.</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800">Voice</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Chat</span>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">Care</span>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-slate-700 shadow-sm">
              <p className="text-sm font-semibold text-cyan-900">Your companion is ready.</p>
              <p className="mt-1 text-sm">Try a quick question, or tap one of the suggested actions below.</p>
            </div>

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
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
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
                className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-center text-base italic text-slate-700"
              >
                "{interimText}"
              </motion.p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
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
                  <div className="mt-3">
                    <AlzheimerRisk
                      riskScore={latestDiseaseAssessment.alzheimer.risk_score.risk_score}
                      riskLevel={latestDiseaseAssessment.alzheimer.risk_score.risk_level}
                      confidence={latestDiseaseAssessment.alzheimer.risk_score.confidence}
                      features={latestDiseaseAssessment.alzheimer.risk_score.features}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-800">
                  <Activity className="h-5 w-5" />
                  <h3 className="font-semibold">Parkinson Check</h3>
                </div>
                <p className="mt-2 text-sm text-indigo-900">Run speech-based Parkinson risk analysis.</p>
                <button
                  onClick={triggerParkinsonCheck}
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Parkinson Game
                </button>
                {latestDiseaseAssessment?.parkinson?.risk_score && (
                  <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(latestDiseaseAssessment.parkinson.risk_score.risk_level)}`}>
                    Risk: {latestDiseaseAssessment.parkinson.risk_score.risk_level} ({Math.round(latestDiseaseAssessment.parkinson.risk_score.risk_score * 100)}%)
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-violet-800">
                  <Brain className="h-5 w-5" />
                  <h3 className="font-semibold">Dementia Focus Game</h3>
                </div>
                <p className="mt-2 text-sm text-violet-900">Run recall and orientation game from ML folder.</p>
                <button
                  onClick={triggerDementiaGame}
                  className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Dementia Game
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Activity className="h-5 w-5" />
                  <h3 className="font-semibold">Speech Therapy Game</h3>
                </div>
                <p className="mt-2 text-sm text-emerald-900">Run voice clarity and pace game from ML folder.</p>
                <button
                  onClick={triggerSpeechTherapyGame}
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Speech Therapy Game
                </button>
              </div>
            </div>

            {testRecommendation.show && (
              <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
                <h3 className="text-base font-bold text-amber-900">Recommended Next Step</h3>
                <p className="mt-1 text-sm text-amber-800">{testRecommendation.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {testRecommendation.memoryTest && (
                    <button
                      onClick={triggerAlzheimerGame}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Take Memory Test
                    </button>
                  )}
                  {testRecommendation.parkinsonTest && (
                    <button
                      onClick={triggerParkinsonCheck}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Take Parkinson Test
                    </button>
                  )}
                  {testRecommendation.dementiaTest && (
                    <button
                      onClick={triggerDementiaGame}
                      className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Take Dementia Game
                    </button>
                  )}
                  {testRecommendation.speechTherapyTest && (
                    <button
                      onClick={triggerSpeechTherapyGame}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Take Speech Therapy Game
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat Window */}
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/95 shadow-2xl backdrop-blur-md">
            <ChatWindow messages={messages} onPlayAudio={handlePlayAudio} />
          </div>
        </motion.div>

        {/* Right Column - Reminders & Emotion */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 lg:sticky lg:top-6 lg:self-start"
        >
          {/* Emotion Indicator */}
          <EmotionIndicator emotion={state.currentEmotion} score={state.currentRiskScore} />

          {/* Reminder Panel */}
          <ReminderPanel reminders={state.reminders} onCompleteReminder={completeReminder} />
        </motion.div>
      </div>

      {/* Cognitive Game Module */}
      {showGameModule && (
        <ExternalAlzheimerGame
          isVisible={showGameModule}
          onClose={() => setShowGameModule(false)}
          onGameResult={(result) => {
            void handleExternalAlzheimerGameResult(result);
          }}
        />
      )}

      {showParkinsonGameModule && (
        <ExternalParkinsonGame
          isVisible={showParkinsonGameModule}
          onClose={() => setShowParkinsonGameModule(false)}
          onGameResult={(result) => {
            void handleExternalParkinsonGameResult(result);
          }}
        />
      )}

      {showDementiaGameModule && (
        <ExternalDementiaGame
          isVisible={showDementiaGameModule}
          onClose={() => setShowDementiaGameModule(false)}
          onGameResult={(result) => {
            void handleExternalDementiaGameResult(result);
          }}
        />
      )}

      {showSpeechTherapyGameModule && (
        <ExternalSpeechTherapyGame
          isVisible={showSpeechTherapyGameModule}
          onClose={() => setShowSpeechTherapyGameModule(false)}
          onGameResult={(result) => {
            void handleExternalSpeechTherapyGameResult(result);
          }}
        />
      )}

      {externalGameLoading && (
        <div className="fixed bottom-4 right-4 z-[95] rounded-full border border-cyan-300/30 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-50 backdrop-blur-xl">
          Updating Alzheimer analysis...
        </div>
      )}

      {externalParkinsonGameLoading && (
        <div className="fixed bottom-16 right-4 z-[95] rounded-full border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-50 backdrop-blur-xl">
          Updating Parkinson analysis...
        </div>
      )}

      {externalDementiaGameLoading && (
        <div className="fixed bottom-28 right-4 z-[95] rounded-full border border-violet-300/30 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-50 backdrop-blur-xl">
          Updating Dementia analysis...
        </div>
      )}

      {externalSpeechTherapyGameLoading && (
        <div className="fixed bottom-40 right-4 z-[95] rounded-full border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-50 backdrop-blur-xl">
          Updating Speech therapy analysis...
        </div>
      )}

      {/* Freeze Reminder Modal */}
      {activeReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm rounded-2xl border border-cyan-400/40 bg-slate-900/95 p-6 text-slate-100 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-cyan-200">Medication/Reminder Confirmation</h3>
            <p className="mt-3 text-sm text-slate-300">The screen remains locked until this reminder is confirmed.</p>
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
