/**
 * Application State Management Hook
 * Manages conversation history, emotions, reminders, and risk scores
 */

import { useState, useCallback } from 'react';

export interface ConversationTurn {
  id: string;
  userText: string;
  aiResponse: string;
  emotion: {
    label: string;
    score: number;
  };
  timestamp: Date;
  riskScore?: number;
}

export interface Reminder {
  id: string;
  title: string;
  category: 'medicine' | 'water' | 'exercise' | 'meal';
  time: string;
  completed: boolean;
}

export interface GameResult {
  type: 'memory' | 'typing' | 'drawing';
  score: number;
  accuracy: number;
  timeSpent: number; // in seconds
  timestamp: Date;
}

export interface AppState {
  // Conversation
  conversationHistory: ConversationTurn[];
  currentEmotion: string;
  currentRiskScore: number;

  // Reminders
  reminders: Reminder[];

  // Games
  gameResults: GameResult[];
  lastGameType: string | null;

  // UI State
  isListening: boolean;
  isProcessing: boolean;
  selectedLanguage: 'en' | 'ta';
  currentView: 'elderly' | 'caregiver';

  // User
  userId: string;
  userName: string;
}

const INITIAL_STATE: AppState = {
  conversationHistory: [],
  currentEmotion: 'neutral',
  currentRiskScore: 0,
  reminders: [
    {
      id: '1',
      title: 'Take medicine',
      category: 'medicine',
      time: '09:00',
      completed: false,
    },
    {
      id: '2',
      title: 'Drink water',
      category: 'water',
      time: '12:00',
      completed: false,
    },
    {
      id: '3',
      title: 'Exercise time',
      category: 'exercise',
      time: '15:00',
      completed: false,
    },
  ],
  gameResults: [],
  lastGameType: null,
  isListening: false,
  isProcessing: false,
  selectedLanguage: 'en',
  currentView: 'elderly',
  userId: 'elder_001',
  userName: 'Grandpa',
};

export const useAppState = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  // Conversation methods
  const addConversationTurn = useCallback(
    (userText: string, aiResponse: string, emotion: any, riskScore?: number) => {
      const turn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        userText,
        aiResponse,
        emotion: emotion || { label: 'neutral', score: 0 },
        timestamp: new Date(),
        riskScore,
      };

      setState((prev) => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, turn],
        currentEmotion: emotion?.label || 'neutral',
        currentRiskScore: riskScore || 0,
      }));
    },
    []
  );

  const clearConversationHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      conversationHistory: [],
    }));
  }, []);

  // Reminder methods
  const completeReminder = useCallback((reminderId: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === reminderId ? { ...r, completed: true } : r
      ),
    }));
  }, []);

  const addReminder = useCallback((reminder: Reminder) => {
    setState((prev) => ({
      ...prev,
      reminders: [...prev.reminders, reminder],
    }));
  }, []);

  // Game methods
  const addGameResult = useCallback((result: GameResult) => {
    setState((prev) => ({
      ...prev,
      gameResults: [...prev.gameResults, result],
      lastGameType: result.type,
    }));
  }, []);

  // UI methods
  const setListening = useCallback((listening: boolean) => {
    setState((prev) => ({
      ...prev,
      isListening: listening,
    }));
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setState((prev) => ({
      ...prev,
      isProcessing: processing,
    }));
  }, []);

  const setLanguage = useCallback((language: 'en' | 'ta') => {
    setState((prev) => ({
      ...prev,
      selectedLanguage: language,
    }));
  }, []);

  const setCurrentView = useCallback((view: 'elderly' | 'caregiver') => {
    setState((prev) => ({
      ...prev,
      currentView: view,
    }));
  }, []);

  const setUserName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      userName: name,
    }));
  }, []);

  // Stats methods
  const getConversationCount = useCallback(() => {
    return state.conversationHistory.length;
  }, [state.conversationHistory]);

  const getAverageEmotion = useCallback(() => {
    if (state.conversationHistory.length === 0) return 'neutral';
    const emotions: Record<string, number> = {};
    state.conversationHistory.forEach((turn) => {
      emotions[turn.emotion.label] = (emotions[turn.emotion.label] || 0) + 1;
    });
    return Object.keys(emotions).reduce((a, b) => (emotions[a] > emotions[b] ? a : b));
  }, [state.conversationHistory]);

  const getCompletedReminders = useCallback(() => {
    return state.reminders.filter((r) => r.completed).length;
  }, [state.reminders]);

  const getGameAverageScore = useCallback(() => {
    if (state.gameResults.length === 0) return 0;
    const sum = state.gameResults.reduce((acc, game) => acc + game.score, 0);
    return Math.round(sum / state.gameResults.length);
  }, [state.gameResults]);

  return {
    state,
    addConversationTurn,
    clearConversationHistory,
    completeReminder,
    addReminder,
    addGameResult,
    setListening,
    setProcessing,
    setLanguage,
    setCurrentView,
    setUserName,
    getConversationCount,
    getAverageEmotion,
    getCompletedReminders,
    getGameAverageScore,
  };
};
