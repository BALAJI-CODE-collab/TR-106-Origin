import { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, TrendingUp, Heart, Brain, LogOut } from 'lucide-react';

interface UserData {
  userId: string;
  name: string;
  emotion: string;
  riskScore: number;
  lastInteraction: Date;
}

interface InteractionData {
  time: string;
  mood: number;
  cognition: number;
  anomaly: number;
}

export const CaregiverDashboard: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<'today' | 'week' | 'month'>('today');
  const [userData] = useState<UserData>({
    userId: 'elder_001',
    name: 'Grandpa',
    emotion: 'happy',
    riskScore: 0.46,
    lastInteraction: new Date(),
  });

  const [interactionData] = useState<InteractionData[]>([
    { time: '09:00', mood: 70, cognition: 65, anomaly: 10 },
    { time: '12:00', mood: 75, cognition: 70, anomaly: 8 },
    { time: '15:00', mood: 68, cognition: 68, anomaly: 15 },
    { time: '18:00', mood: 72, cognition: 72, anomaly: 12 },
    { time: '21:00', mood: 65, cognition: 60, anomaly: 20 },
  ]);

  const emotionDistribution = [
    { name: 'Happy', value: 45, color: '#FBBF24' },
    { name: 'Neutral', value: 35, color: '#9CA3AF' },
    { name: 'Sad', value: 15, color: '#60A5FA' },
    { name: 'Anxious', value: 5, color: '#F87171' },
  ];

  const alerts = [
    {
      id: 1,
      type: 'high-risk',
      message: 'Alzheimer risk score elevated to 0.68',
      timestamp: '2 hours ago',
      severity: 'high',
    },
    {
      id: 2,
      type: 'behavior-change',
      message: 'Unusual behavioral pattern detected',
      timestamp: '1 hour ago',
      severity: 'medium',
    },
    {
      id: 3,
      type: 'medication',
      message: 'Medication reminder missed',
      timestamp: '30 minutes ago',
      severity: 'medium',
    },
  ];

  const rangeMultiplier = selectedRange === 'today' ? 1 : selectedRange === 'week' ? 1.08 : 1.15;
  const chartData = interactionData.map((row) => ({
    ...row,
    mood: Math.min(100, Math.round(row.mood * rangeMultiplier)),
    cognition: Math.min(100, Math.round(row.cognition * rangeMultiplier)),
    anomaly: Math.min(100, Math.round(row.anomaly * (rangeMultiplier - 0.04))),
  }));

  const rangeButtons: Array<{ id: 'today' | 'week' | 'month'; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center justify-between bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <div>
            <h1 className="text-4xl font-bold text-white">📊 Caregiver Dashboard</h1>
            <p className="text-gray-400 mt-2">Monitoring {userData.name}</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </motion.button>
        </div>
      </motion.div>

      {/* Interactive Controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-3"
      >
        {rangeButtons.map((range) => (
          <motion.button
            key={range.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedRange(range.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
              selectedRange === range.id
                ? 'bg-cyan-500 border-cyan-300 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {range.label}
          </motion.button>
        ))}

        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="rounded-full border border-emerald-400 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300"
        >
          Live Monitoring Active
        </motion.div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        {/* Emotion Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Current Emotion</p>
              <p className="text-3xl font-bold capitalize">{userData.emotion}</p>
            </div>
            <p className="text-5xl">😊</p>
          </div>
        </motion.div>

        {/* Risk Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Risk Score</p>
              <p className="text-3xl font-bold">{(userData.riskScore * 100).toFixed(0)}%</p>
              <p className="text-xs mt-1">Moderate Risk</p>
            </div>
            <Brain className="w-12 h-12" />
          </div>
        </motion.div>

        {/* Health Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Health Status</p>
              <p className="text-2xl font-bold">Good</p>
              <p className="text-xs mt-1">Stable vitals</p>
            </div>
            <Heart className="w-12 h-12" />
          </div>
        </motion.div>

        {/* Interaction Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Last Interaction</p>
              <p className="text-2xl font-bold">Now</p>
              <p className="text-xs mt-1">5 conversations</p>
            </div>
            <TrendingUp className="w-12 h-12" />
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
      >
        {/* Mood Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700"
        >
          <h3 className="text-xl font-bold text-white mb-4">📈 Daily Mood Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#FFF' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#FBBF24"
                strokeWidth={3}
                dot={{ fill: '#FBBF24', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Emotion Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700"
        >
          <h3 className="text-xl font-bold text-white mb-4">😊 Emotion Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={emotionDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {emotionDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Cognition & Anomaly Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 lg:col-span-2"
        >
          <h3 className="text-xl font-bold text-white mb-4">🧠 Cognition & Anomaly Detection</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#FFF' }}
              />
              <Legend />
              <Bar dataKey="cognition" fill="#60A5FA" />
              <Bar dataKey="anomaly" fill="#F87171" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Alerts Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto"
      >
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Active Alerts
          </h3>

          <div className="space-y-4">
            {alerts.map((alert, idx) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`
                  p-4 rounded-lg border-l-4 flex items-start justify-between
                  ${alert.severity === 'high'
                    ? 'bg-red-900 border-red-500 text-red-100'
                    : 'bg-yellow-900 border-yellow-500 text-yellow-100'
                  }
                `}
              >
                <div>
                  <p className="font-semibold">{alert.message}</p>
                  <p className="text-sm opacity-75 mt-1">{alert.timestamp}</p>
                </div>
                <span
                  className={`
                    px-3 py-1 rounded-full text-xs font-bold
                    ${alert.severity === 'high'
                      ? 'bg-red-700 text-white'
                      : 'bg-yellow-700 text-white'
                    }
                  `}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
