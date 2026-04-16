import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: {
    label: string;
    score: number;
  };
  timestamp: Date;
}

interface ChatDisplayProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatDisplay: React.FC<ChatDisplayProps> = ({ messages, isLoading }) => {
  const emotionColors: Record<string, string> = {
    happy: 'from-yellow-400 to-orange-400',
    sad: 'from-blue-400 to-blue-600',
    anxious: 'from-orange-400 to-red-500',
    neutral: 'from-gray-400 to-gray-600',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50 to-white p-6 space-y-4">
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-full flex flex-col items-center justify-center text-center"
        >
          <MessageCircle className="w-16 h-16 text-blue-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Hello! 👋</h2>
          <p className="text-gray-500 text-lg">How are you feeling today?</p>
        </motion.div>
      )}

      {messages.map((msg, idx) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`flex gap-3 max-w-xs lg:max-w-md ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-green-400'
                  : 'bg-blue-400'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-6 h-6 text-white" />
              ) : (
                <MessageCircle className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <motion.div
                className={`px-4 py-3 rounded-lg text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-green-400 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                {msg.content}
              </motion.div>

              {msg.emotion && msg.role === 'user' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${
                    emotionColors[msg.emotion.label] || emotionColors.neutral
                  } text-white text-sm font-semibold w-fit`}
                >
                  <span>Mood: {msg.emotion.label}</span>
                  <span className="text-xs opacity-75">
                    ({Math.abs(Math.round(msg.emotion.score * 100))}%)
                  </span>
                </motion.div>
              )}

              <span className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </motion.div>
      ))}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2 p-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ delay: i * 0.1, repeat: Infinity, duration: 1 }}
              className="w-3 h-3 bg-blue-400 rounded-full"
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};
