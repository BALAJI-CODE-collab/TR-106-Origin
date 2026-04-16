import React from 'react';
import { motion } from 'framer-motion';

interface EmotionIndicatorProps {
  emotion: string;
  score?: number;
}

const emotionConfig: Record<string, any> = {
  happy: {
    tone: 'Positive',
    color: 'from-yellow-400 to-orange-400',
    message: 'Feeling good!',
    textColor: 'text-yellow-600',
  },
  sad: {
    tone: 'Low',
    color: 'from-blue-400 to-blue-600',
    message: 'A bit down?',
    textColor: 'text-blue-600',
  },
  anxious: {
    tone: 'Sensitive',
    color: 'from-orange-400 to-red-500',
    message: 'Feeling worried?',
    textColor: 'text-orange-600',
  },
  neutral: {
    tone: 'Balanced',
    color: 'from-gray-400 to-gray-600',
    message: 'Feeling calm',
    textColor: 'text-gray-600',
  },
};

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({
  emotion = 'neutral',
  score = 0,
}) => {
  const config = emotionConfig[emotion.toLowerCase()] || emotionConfig.neutral;
  const absoluteScore = Math.abs(score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        bg-gradient-to-r ${config.color} rounded-2xl p-8
        text-white shadow-lg text-center
      `}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-white/70 bg-white/20"
      />

      {/* Message */}
      <p className="text-2xl font-bold mb-2 capitalize">{emotion}</p>
      <p className="text-lg opacity-90">{config.message}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-80">{config.tone}</p>

      {/* Intensity Bar */}
      {score !== 0 && (
        <div className="mt-4">
          <div className="w-full bg-white bg-opacity-30 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(absoluteScore, 100)}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-white bg-opacity-70"
            />
          </div>
          <p className="text-xs mt-2 opacity-90">
            Intensity: {Math.round(absoluteScore)}%
          </p>
        </div>
      )}
    </motion.div>
  );
};
