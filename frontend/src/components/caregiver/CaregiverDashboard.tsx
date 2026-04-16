import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, TrendingUp, Heart, Brain, LogOut } from 'lucide-react';
import { apiClient, AlzheimerPrediction, ParkinsonPrediction, ResidentProfile, UserStats } from '../../services/api';
import { AlzheimerRisk } from '../AlzheimerRisk';

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

interface ToastNotification {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const CaregiverDashboard: React.FC = () => {
  const [guardianUsername, setGuardianUsername] = useState('guardian001');
  const [guardianPassword, setGuardianPassword] = useState('guard@001');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [alzheimerPrediction, setAlzheimerPrediction] = useState<AlzheimerPrediction | null>(null);
  const [parkinsonPrediction, setParkinsonPrediction] = useState<ParkinsonPrediction | null>(null);
  const [loadingResidentData, setLoadingResidentData] = useState(false);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [selectedRange, setSelectedRange] = useState<'today' | 'week' | 'month'>('today');
  const [userData, setUserData] = useState<UserData>({
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

  const emotionDistribution = useMemo(() => {
    const distribution = stats?.emotion_distribution || {};
    const total = Object.values(distribution).reduce((acc, value) => acc + value, 0) || 1;
    const palette: Record<string, string> = {
      happy: '#FBBF24',
      neutral: '#9CA3AF',
      sad: '#60A5FA',
      anxious: '#F87171',
      unknown: '#8B5CF6',
    };
    const entries = Object.entries(distribution);
    if (!entries.length) {
      return [
        { name: 'No Data', value: 100, color: '#475569' },
      ];
    }
    return entries.map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: palette[name] || '#8B5CF6',
    }));
  }, [stats]);

  const alerts = useMemo(() => {
    const concerns: string[] = summary?.top_concerns || [];
    if (!concerns.length) {
      return [
        {
          id: 1,
          message: 'No active critical concerns for this resident.',
          timestamp: 'just now',
          severity: 'medium',
        },
      ];
    }
    return concerns.map((item, index) => ({
      id: index + 1,
      message: item,
      timestamp: 'latest',
      severity: item.toLowerCase().includes('missed') || item.toLowerCase().includes('silence') ? 'high' : 'medium',
    }));
  }, [summary]);

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

  const pushNotification = (text: string, type: ToastNotification['type'] = 'info') => {
    const id = `ntf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [...prev, { id, text, type }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  };

  const handleGuardianLogin = async () => {
    try {
      const result = await apiClient.guardianLogin(guardianUsername, guardianPassword);
      if (!result.ok) {
        pushNotification('Invalid guardian credentials.', 'error');
        return;
      }
      const residentsData = await apiClient.getResidents();
      setResidents(residentsData);
      const preferredResidentId = result.resident_id || residentsData[0]?.resident_id || '';
      setSelectedResidentId(preferredResidentId);
      setIsAuthorized(true);
      pushNotification('Guardian login successful.', 'success');
    } catch (error) {
      console.error(error);
      pushNotification('Unable to login right now.', 'error');
    }
  };

  useEffect(() => {
    const loadResidentAnalytics = async () => {
      if (!isAuthorized || !selectedResidentId) {
        return;
      }

      setLoadingResidentData(true);
      try {
        const [statsResult, summaryResult, alzheimerResult, parkinsonResult] = await Promise.all([
          apiClient.getUserStats(selectedResidentId),
          apiClient.getWeeklySummary(selectedResidentId),
          apiClient.getAlzheimerPrediction(selectedResidentId),
          apiClient.getParkinsonPrediction(selectedResidentId),
        ]);
        setStats(statsResult);
        setSummary(summaryResult);
        setAlzheimerPrediction(alzheimerResult);
        setParkinsonPrediction(parkinsonResult);

        const resident = residents.find((r) => r.resident_id === selectedResidentId);
        const dominantEmotion = Object.entries(statsResult.emotion_distribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
        const risk = Math.min(0.95, ((summaryResult.missed_reminders || 0) * 0.2) + ((summaryResult.silence_period_hours || 0) / 100));

        setUserData({
          userId: selectedResidentId,
          name: resident?.name || selectedResidentId,
          emotion: dominantEmotion,
          riskScore: risk,
          lastInteraction: statsResult.last_interaction ? new Date(statsResult.last_interaction) : new Date(),
        });
      } catch (error) {
        console.error(error);
        setAlzheimerPrediction(null);
        setParkinsonPrediction(null);
      } finally {
        setLoadingResidentData(false);
      }
    };

    void loadResidentAnalytics();
  }, [isAuthorized, selectedResidentId, residents]);

  if (!isAuthorized) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050816] p-4 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(251,146,60,0.14),transparent_30%)]" />
        <div className="relative z-10 mx-auto mt-16 max-w-md rounded-2xl border border-white/15 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl">
          <h2 className="font-[Orbitron] text-2xl font-bold">Guardian Login</h2>
          <p className="mt-2 text-sm text-slate-300">Only enrolled guardians can access this portal.</p>
          <div className="mt-6 space-y-4">
            <input
              value={guardianUsername}
              onChange={(e) => setGuardianUsername(e.target.value)}
              placeholder="Guardian username"
              className="w-full rounded-xl border border-white/20 bg-slate-900/60 px-4 py-3 text-white outline-none"
            />
            <input
              type="password"
              value={guardianPassword}
              onChange={(e) => setGuardianPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-white/20 bg-slate-900/60 px-4 py-3 text-white outline-none"
            />
            <button
              onClick={handleGuardianLogin}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950"
            >
              Access Guardian Portal
            </button>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="fixed right-4 top-4 z-[80] w-full max-w-sm space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
                  item.type === 'success'
                    ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-50'
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
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.16),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.16),transparent_34%)]" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <h1 className="font-[Orbitron] text-4xl font-bold text-white">Caregiver Command Center</h1>
            <p className="text-slate-300 mt-2">Monitoring {userData.name}</p>
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto mb-8"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-4 text-xl font-bold text-white">Alzheimer Prediction</h3>
            <AlzheimerRisk
              riskScore={alzheimerPrediction?.risk_score?.risk_score}
              riskLevel={alzheimerPrediction?.risk_score?.risk_level}
              confidence={alzheimerPrediction?.risk_score?.confidence}
              features={alzheimerPrediction?.risk_score?.features}
              error={alzheimerPrediction?.ok ? undefined : alzheimerPrediction?.error || 'Unable to generate prediction'}
            />
            <p className="mt-3 text-xs text-slate-300">
              Source: {alzheimerPrediction?.source || 'n/a'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
            <h3 className="mb-4 text-xl font-bold text-white">Parkinson Prediction</h3>
            {parkinsonPrediction?.ok && parkinsonPrediction?.risk_score ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/15 bg-slate-900/40 p-4">
                  <p className="text-sm text-slate-300">Risk Level</p>
                  <p className="text-2xl font-bold capitalize">{parkinsonPrediction.risk_score.risk_level}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Score: {(parkinsonPrediction.risk_score.risk_score * 100).toFixed(0)}% | Confidence: {(parkinsonPrediction.risk_score.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(parkinsonPrediction.risk_score.features || {}).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-xs uppercase text-slate-300">{key.replace(/_/g, ' ')}</p>
                      <p className="mt-1 font-semibold text-white">{typeof value === 'number' ? value.toFixed(2) : String(value)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-300">Source: {parkinsonPrediction.source || 'n/a'}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
                {parkinsonPrediction?.error || 'Unable to generate Parkinson prediction'}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Interactive Controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto mb-6 flex flex-wrap gap-3"
      >
        <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100">
          <span className="mr-2 text-slate-300">Resident:</span>
          <select
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            className="bg-transparent font-semibold outline-none"
          >
            {residents.map((resident) => (
              <option key={resident.resident_id} value={resident.resident_id} className="text-slate-900">
                {resident.name} ({resident.room})
              </option>
            ))}
          </select>
        </div>

        {rangeButtons.map((range) => (
          <motion.button
            key={range.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedRange(range.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
              selectedRange === range.id
                ? 'bg-cyan-500 border-cyan-300 text-white'
                : 'bg-white/10 border-white/20 text-slate-100 hover:bg-white/20'
            }`}
          >
            {range.label}
          </motion.button>
        ))}

        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="rounded-full border border-emerald-400 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200"
        >
          Live Monitoring Active
        </motion.div>

        {loadingResidentData && (
          <div className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            Updating resident analytics...
          </div>
        )}
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
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
              <p className="text-5xl">Active</p>
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
              <p className="text-2xl font-bold">{userData.lastInteraction.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-xs mt-1">{stats?.total_interactions || 0} conversations</p>
            </div>
            <TrendingUp className="w-12 h-12" />
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
      >
        {/* Mood Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h3 className="text-xl font-bold text-white mb-4">Daily Mood Trend</h3>
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
          className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h3 className="text-xl font-bold text-white mb-4">Emotion Distribution</h3>
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
          className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl lg:col-span-2"
        >
          <h3 className="text-xl font-bold text-white mb-4">Cognition & Anomaly Detection</h3>
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
        className="relative z-10 max-w-7xl mx-auto"
      >
        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
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

      {notifications.length > 0 && (
        <div className="fixed right-4 top-4 z-[80] w-full max-w-sm space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
                item.type === 'success'
                  ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-50'
                  : item.type === 'error'
                    ? 'border-rose-300/40 bg-rose-500/20 text-rose-50'
                    : item.type === 'warning'
                      ? 'border-amber-300/40 bg-amber-500/20 text-amber-50'
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
