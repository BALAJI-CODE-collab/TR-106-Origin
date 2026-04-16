import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface CaregiverDashboardProps {
  dailyNudges: string[];
  weeklySummary: {
    user_id: string;
    total_interactions: number;
    missed_reminders: number;
    silence_period_hours: number;
    frequent_emotions: Record<string, number>;
    top_concerns: string[];
  };
  alerts: string[];
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  dailyNudges,
  weeklySummary,
  alerts,
}) => {
  const emotionData = Object.entries(weeklySummary.frequent_emotions)
    .map(([label, count]) => ({
      name: label.charAt(0).toUpperCase() + label.slice(1),
      value: count,
    }))
    .filter((item) => item.value > 0);

  const EMOTION_COLORS = {
    happy: '#FBBF24',
    sad: '#60A5FA',
    anxious: '#FB923C',
    neutral: '#9CA3AF',
  };

  const getMoodColor = (emotion: string) => {
    const lower = emotion.toLowerCase();
    return EMOTION_COLORS[lower as keyof typeof EMOTION_COLORS] || '#9CA3AF';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Users className="w-8 h-8 text-blue-600" />
        <h2 className="text-3xl font-bold text-gray-800">Caregiver Dashboard</h2>
      </motion.div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border-2 border-red-300 rounded-xl p-4 md:p-6"
        >
          <div className="flex gap-3 mb-3">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity }}>
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            </motion.div>
            <h3 className="font-bold text-red-700 text-lg">Active Alerts</h3>
          </div>
          <ul className="space-y-2">
            {alerts.map((alert, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 text-red-700 text-sm"
              >
                <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0" />
                {alert}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 shadow-md"
        >
          <p className="text-gray-600 text-sm font-semibold mb-2">Weekly Interactions</p>
          <p className="text-4xl font-bold text-blue-600">{weeklySummary.total_interactions}</p>
          <p className="text-xs text-gray-500 mt-1">conversations</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 shadow-md"
        >
          <p className="text-gray-600 text-sm font-semibold mb-2">Missed Reminders</p>
          <p className={`text-4xl font-bold ${weeklySummary.missed_reminders > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {weeklySummary.missed_reminders}
          </p>
          <p className="text-xs text-gray-500 mt-1">this week</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 shadow-md"
        >
          <p className="text-gray-600 text-sm font-semibold mb-2">Longest Silence</p>
          <p className="text-4xl font-bold text-indigo-600">
            {Math.round(weeklySummary.silence_period_hours)}
          </p>
          <p className="text-xs text-gray-500 mt-1">hours</p>
        </motion.div>
      </div>

      {/* Emotion Distribution */}
      {emotionData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md">
            <h3 className="font-bold text-gray-800 mb-4">Mood Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={emotionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {emotionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getMoodColor(entry.name)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Concerns */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 md:p-6 shadow-md"
          >
            <h3 className="font-bold text-gray-800 mb-4">Top Concerns</h3>
            <ul className="space-y-3">
              {weeklySummary.top_concerns.slice(0, 4).map((concern, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-2 bg-amber-50 rounded-lg"
                >
                  <span className="text-amber-600 font-bold flex-shrink-0 mt-1">{idx + 1}.</span>
                  <p className="text-gray-700 text-sm">{concern}</p>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}

      {/* Daily Nudges for Caregiver */}
      {dailyNudges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 rounded-xl p-4 md:p-6 border-l-4 border-blue-400"
        >
          <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Suggested Care Actions
          </h3>
          <ul className="space-y-2">
            {dailyNudges.map((nudge, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 text-blue-800 text-sm"
              >
                <span className="text-lg flex-shrink-0">✓</span>
                <span>{nudge}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
};
