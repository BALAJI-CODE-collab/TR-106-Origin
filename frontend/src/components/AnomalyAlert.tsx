import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface AnomalyAlertProps {
  isAnomaly: boolean;
  reasons: string[];
  zScores: Record<string, number>;
}

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({
  isAnomaly,
  reasons,
  zScores,
}) => {
  const getScoreColor = (score: number) => {
    const absScore = Math.abs(score);
    if (absScore < 1) return 'text-green-500';
    if (absScore < 2) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    const absScore = Math.abs(score);
    if (absScore < 1) return 'bg-green-100';
    if (absScore < 2) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 md:p-6 ${
        isAnomaly ? 'bg-red-50 border-2 border-red-300' : 'bg-green-50 border-2 border-green-300'
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        {isAnomaly ? (
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity }}>
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
          </motion.div>
        ) : (
          <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
        )}

        <div className="flex-1">
          <h3 className={`font-bold text-lg ${isAnomaly ? 'text-red-700' : 'text-green-700'}`}>
            {isAnomaly ? 'Unusual Pattern Detected' : 'All Normal'}
          </h3>
          <p className={`text-sm ${isAnomaly ? 'text-red-600' : 'text-green-600'}`}>
            {isAnomaly
              ? 'Your recent interaction shows some changes'
              : 'No concerning patterns detected'}
          </p>
        </div>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <motion.div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Observations:</p>
          <ul className="space-y-1">
            {reasons.map((reason, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="text-sm text-gray-700 flex items-center gap-2"
              >
                <span className="text-amber-500">•</span>
                {reason}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Z-Scores */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Health Metrics
        </p>
        <div className="space-y-2">
          {Object.entries(zScores).map(([key, value]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <span className="text-sm font-medium text-gray-600 capitalize flex-shrink-0 w-24">
                {key.replace(/_/g, ' ')}:
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(value) * 10, 100)}%` }}
                  className={`h-full ${getScoreColor(value).replace('text-', 'bg-')}`}
                />
              </div>
              <span
                className={`text-sm font-semibold ${getScoreColor(value)} px-2 py-1 rounded ${getScoreBgColor(
                  value
                )}`}
              >
                {value.toFixed(2)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
