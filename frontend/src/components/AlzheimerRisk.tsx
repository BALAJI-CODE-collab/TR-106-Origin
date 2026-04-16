import React from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertCircle, CheckCircle } from 'lucide-react';

interface AlzheimerRiskProps {
  riskScore?: number;
  riskLevel?: 'low' | 'moderate' | 'high';
  confidence?: number;
  features?: Record<string, any>;
  error?: string;
}

export const AlzheimerRisk: React.FC<AlzheimerRiskProps> = ({
  riskScore,
  riskLevel,
  confidence,
  features,
  error,
}) => {
  const getRiskColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' };
      case 'moderate':
        return { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' };
      case 'high':
        return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' };
      default:
        return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700' };
    }
  };

  const colors = getRiskColor(riskLevel);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-4 md:p-6 border-2 ${colors.bg} ${colors.border}`}
    >
      <div className="flex items-start gap-3 mb-4">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Brain className={`w-6 h-6 ${colors.text}`} />
        </motion.div>
        <div className="flex-1">
          <h3 className={`font-bold text-lg ${colors.text}`}>Cognitive Assessment</h3>
          <p className="text-sm text-gray-600">AI-powered dementia risk screening</p>
        </div>
      </div>

      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-gray-200 rounded-lg flex gap-2 items-start"
        >
          <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{error}</p>
        </motion.div>
      ) : riskScore !== undefined && riskLevel ? (
        <div className="space-y-4">
          {/* Main Risk Score */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`inline-block text-5xl font-bold ${colors.text}`}
            >
              {Math.round(riskScore * 100)}%
            </motion.div>
            <p className="text-sm text-gray-600 mt-2 capitalize">
              Risk Level: <span className="font-bold">{riskLevel}</span>
            </p>
            {confidence !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            )}
          </motion.div>

          {/* Risk Progress Bar */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">Overall Risk Assessment</p>
            <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${riskScore * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full ${
                  riskLevel === 'low'
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : riskLevel === 'moderate'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-r from-red-400 to-rose-600'
                }`}
              />
            </div>
          </div>

          {/* Feature Breakdown */}
          {features && Object.keys(features).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-sm font-semibold text-gray-700 mb-2">Cognitive Indicators</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(features)
                  .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v.length < 20))
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white bg-opacity-50 p-2 rounded"
                    >
                      <p className="font-medium text-gray-700 capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-gray-600">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                      </p>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Recommendation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="p-3 bg-white bg-opacity-60 rounded-lg flex gap-2"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-600" />
            <p className="text-xs text-gray-700">
              {riskLevel === 'low' && 'No immediate concerns detected. Regular monitoring recommended.'}
              {riskLevel === 'moderate' && 'Some indicators to monitor. Consider cognitive assessment.'}
              {riskLevel === 'high' && 'Please consult with a healthcare professional for evaluation.'}
            </p>
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-4 text-center text-gray-600"
        >
          <p className="text-sm">Assessment pending...</p>
        </motion.div>
      )}
    </motion.div>
  );
};
