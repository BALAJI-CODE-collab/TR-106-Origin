import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Smile, AlertCircle } from 'lucide-react';

interface EmotionIndicatorProps {
  label: string;
  score: number;
}

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({ label, score }) => {
  const emotionConfig = {
    happy: {
      icon: Smile,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      gradientFrom: 'from-yellow-300',
      gradientTo: 'to-orange-400',
      message: '😊 Feeling positive!',
    },
    sad: {
      icon: AlertCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      gradientFrom: 'from-blue-400',
      gradientTo: 'to-blue-600',
      message: '😔 A bit down?',
    },
    anxious: {
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      gradientFrom: 'from-orange-400',
      gradientTo: 'to-red-500',
      message: '😰 Feeling worried?',
    },
    neutral: {
      icon: Heart,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      gradientFrom: 'from-gray-400',
      gradientTo: 'to-gray-600',
      message: '😐 Neutral mood',
    },
  };

  const config = emotionConfig[label as keyof typeof emotionConfig] || emotionConfig.neutral;
  const Icon = config.icon;
  const intensityPercentage = Math.abs(score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`${config.bgColor} rounded-xl p-4 md:p-6`}
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Icon className={`${config.color} w-10 h-10 md:w-12 md:h-12`} />
        </motion.div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700 capitalize">{label} Emotion</p>
          <p className="text-xs text-gray-600">{config.message}</p>

          <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${intensityPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Intensity: {Math.round(intensityPercentage)}%
          </p>
        </div>
      </div>
    </motion.div>
  );
};
