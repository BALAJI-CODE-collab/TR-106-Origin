import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, TrendingUp, Heart, Brain, LogOut } from 'lucide-react';
import { apiClient, AlzheimerPrediction, GameAssessmentReport, ParkinsonPrediction, ResidentProfile, UserStats } from '../../services/api';
import { AlzheimerRisk } from '../AlzheimerRisk';

type CareItemStatus = 'taken' | 'missed' | 'unknown';

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
  const [dailyCareStatus, setDailyCareStatus] = useState<{
    breakfast: CareItemStatus;
    lunch: CareItemStatus;
    dinner: CareItemStatus;
    tablets: CareItemStatus;
    water: CareItemStatus;
    notes: string;
  }>({
    breakfast: 'unknown',
    lunch: 'unknown',
    dinner: 'unknown',
    tablets: 'unknown',
    water: 'unknown',
    notes: '',
  });
  const [submittingDailyCareStatus, setSubmittingDailyCareStatus] = useState(false);
  const [gameReports, setGameReports] = useState<GameAssessmentReport[]>([]);
  const [showMailFailuresOnly, setShowMailFailuresOnly] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<'all' | '7d' | '30d'>('all');
  const [retryingReportKey, setRetryingReportKey] = useState('');
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

  const visibleGameReports = useMemo(() => {
    const now = Date.now();
    const filteredByDate = gameReports.filter((report) => {
      if (reportDateRange === 'all') {
        return true;
      }
      const reportTime = new Date(report.sent_at || '').getTime();
      if (Number.isNaN(reportTime)) {
        return false;
      }
      const maxAgeMs = reportDateRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      return now - reportTime <= maxAgeMs;
    });

    if (!showMailFailuresOnly) {
      return filteredByDate;
    }
    return filteredByDate.filter((report) => report.mail_status !== 'sent');
  }, [gameReports, reportDateRange, showMailFailuresOnly]);

  const retryCountByOriginalSentAt = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const report of gameReports) {
      const details = report.details || {};
      const originalSentAt = typeof details.retry_of_sent_at === 'string' ? details.retry_of_sent_at : '';
      if (!originalSentAt) {
        continue;
      }
      counts[originalSentAt] = (counts[originalSentAt] || 0) + 1;
    }
    return counts;
  }, [gameReports]);

  const loadGameReports = async (residentId: string) => {
    const reportResult = await apiClient.getGameAssessmentReports(residentId, 50);
    setGameReports(reportResult);
  };

  const handleRetryGameReportMail = async (report: GameAssessmentReport) => {
    const key = `${report.sent_at}_${report.game_name}`;
    setRetryingReportKey(key);
    try {
      const result = await apiClient.retryGameAssessmentMail({
        resident_id: report.resident_id,
        sent_at: report.sent_at,
        game_name: report.game_name,
      });

      const status = result?.mail?.status;
      if (status === 'sent') {
        pushNotification('Retry mail sent successfully.', 'success');
      } else if (status === 'logged_only_no_smtp') {
        pushNotification('Retry saved, but SMTP is not configured.', 'warning');
      } else {
        pushNotification('Retry attempted, but mail delivery still failed.', 'warning');
      }

      await loadGameReports(report.resident_id);
    } catch (error) {
      console.error(error);
      pushNotification('Failed to retry game report mail.', 'error');
    } finally {
      setRetryingReportKey('');
    }
  };

  const exportVisibleGameReportsCsv = () => {
    if (!visibleGameReports.length) {
      pushNotification('No game reports to export for current filter.', 'warning');
      return;
    }

    const escapeCsv = (value: unknown): string => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = [
      'resident_id',
      'sent_at',
      'game_name',
      'mail_status',
      'recipients',
      'mail_errors',
      'risk_level',
      'risk_score',
      'dementia_recall',
      'dementia_orientation',
      'dementia_attention',
      'dementia_composite',
      'speech_therapy_clarity',
      'speech_therapy_pace',
      'speech_therapy_stability',
      'speech_therapy_composite',
    ];

    const rows = visibleGameReports.map((report) => {
      const details = report.details || {};
      return [
        report.resident_id,
        report.sent_at,
        report.game_name,
        report.mail_status,
        (report.mail_sent_to || []).join('; '),
        (report.mail_errors || []).join('; '),
        details.risk_level ?? '',
        details.risk_score ?? '',
        details.dementia_recall ?? '',
        details.dementia_orientation ?? '',
        details.dementia_attention ?? '',
        details.dementia_composite ?? '',
        details.speech_therapy_clarity ?? '',
        details.speech_therapy_pace ?? '',
        details.speech_therapy_stability ?? '',
        details.speech_therapy_composite ?? '',
      ];
    });

    const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `game_reports_${selectedResidentId || 'resident'}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    pushNotification(`Exported ${visibleGameReports.length} game report rows.`, 'success');
  };

  const pushNotification = (text: string, type: ToastNotification['type'] = 'info') => {
    const id = `ntf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [...prev, { id, text, type }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  };

  const handleDailyCareStatusSubmit = async () => {
    if (!selectedResidentId) {
      pushNotification('Select a resident before sending daily care mail.', 'warning');
      return;
    }

    setSubmittingDailyCareStatus(true);
    try {
      const result = await apiClient.submitDailyCareStatus({
        resident_id: selectedResidentId,
        breakfast: dailyCareStatus.breakfast,
        lunch: dailyCareStatus.lunch,
        dinner: dailyCareStatus.dinner,
        tablets: dailyCareStatus.tablets,
        water: dailyCareStatus.water,
        notes: dailyCareStatus.notes,
      });

      const mailStatus = result?.mail?.status;
      if (mailStatus === 'logged_only_no_smtp') {
        pushNotification('Daily care saved, but SMTP is not configured. Set SMTP_HOST or MAIL_HOST and SMTP_FROM or MAIL_FROM.', 'warning');
        return;
      }
      if (mailStatus === 'logged_only_mail_failed') {
        pushNotification('Daily care saved, but mail delivery failed. Check SMTP settings.', 'warning');
        return;
      }

      if (result?.missing_items?.length) {
        pushNotification(`Alert mail sent. Missed: ${result.missing_items.join(', ')}`, 'warning');
      } else {
        pushNotification('Daily care update mail sent successfully.', 'success');
      }
    } catch (error) {
      console.error(error);
      pushNotification('Failed to send daily care status mail.', 'error');
    } finally {
      setSubmittingDailyCareStatus(false);
    }
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
        await loadGameReports(selectedResidentId);

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
        setGameReports([]);
      } finally {
        setLoadingResidentData(false);
      }
    };

    void loadResidentAnalytics();
  }, [isAuthorized, selectedResidentId, residents]);

  useEffect(() => {
    if (!isAuthorized || !selectedResidentId) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadGameReports(selectedResidentId);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [isAuthorized, selectedResidentId]);

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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto mb-8 max-w-7xl"
      >
        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
          <h3 className="mb-2 text-xl font-bold">Daily Care Mail Pipeline</h3>
          <p className="mb-4 text-sm text-slate-300">
            Send a status mail to children and guardians for meals, tablets, and water. Missed items are auto-marked as alert.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {([
              ['breakfast', 'Breakfast'],
              ['lunch', 'Lunch'],
              ['dinner', 'Dinner'],
              ['tablets', 'Tablets'],
              ['water', 'Water'],
            ] as Array<[keyof typeof dailyCareStatus, string]>).map(([key, label]) => (
              <div key={key} className="rounded-xl border border-white/15 bg-slate-900/40 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-200">{label}</p>
                <select
                  value={dailyCareStatus[key] as string}
                  onChange={(e) =>
                    setDailyCareStatus((prev) => ({
                      ...prev,
                      [key]: e.target.value as CareItemStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="unknown">Unknown</option>
                  <option value="taken">Taken</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-200">Notes</label>
            <textarea
              value={dailyCareStatus.notes}
              onChange={(e) => setDailyCareStatus((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes for today..."
              className="min-h-[90px] w-full rounded-xl border border-white/20 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDailyCareStatusSubmit}
              disabled={submittingDailyCareStatus}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingDailyCareStatus ? 'Sending...' : 'Send Daily Care Mail'}
            </button>
            <p className="text-xs text-slate-300">This action also stores a daily care log in backend records.</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto mb-8 max-w-7xl"
      >
        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
          <h3 className="mb-2 text-xl font-bold">Dementia and Speech Therapy Game Reports</h3>
          <p className="mb-4 text-sm text-slate-300">
            Real score reports from completed games and whether mail reached children/guardians.
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowMailFailuresOnly((prev) => !prev)}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                showMailFailuresOnly
                  ? 'border-amber-300/60 bg-amber-500/25 text-amber-100'
                  : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/20'
              }`}
            >
              {showMailFailuresOnly ? 'Showing Mail Failures Only' : 'Show Mail Failures Only'}
            </button>
            <button
              onClick={exportVisibleGameReportsCsv}
              className="rounded-xl border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30"
            >
              Export CSV
            </button>
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100">
              <span className="mr-2 text-slate-300">Date Range:</span>
              <select
                value={reportDateRange}
                onChange={(e) => setReportDateRange(e.target.value as 'all' | '7d' | '30d')}
                className="bg-transparent font-semibold outline-none"
              >
                <option value="all" className="text-slate-900">All</option>
                <option value="7d" className="text-slate-900">Last 7 days</option>
                <option value="30d" className="text-slate-900">Last 30 days</option>
              </select>
            </div>
            <span className="text-xs text-slate-300">
              Rows: {visibleGameReports.length} / {gameReports.length}
            </span>
            <span className="text-xs text-slate-400">Auto-refresh: 30s</span>
          </div>

          {visibleGameReports.length === 0 ? (
            <div className="rounded-xl border border-white/15 bg-slate-900/40 p-4 text-sm text-slate-200">
              {gameReports.length === 0
                ? 'No game reports yet for this resident.'
                : 'No rows match the current filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/15 bg-slate-900/40">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/15 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Game</th>
                    <th className="px-4 py-3">Key Scores</th>
                    <th className="px-4 py-3">Mail Status</th>
                    <th className="px-4 py-3">Retry History</th>
                    <th className="px-4 py-3">Recipients</th>
                    <th className="px-4 py-3">Mail Errors</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGameReports.map((report, index) => {
                    const details = report.details || {};
                    const scoreSummary =
                      report.game_name.toLowerCase().includes('dementia')
                        ? `Recall ${details.dementia_recall ?? '-'}, Orientation ${details.dementia_orientation ?? '-'}, Attention ${details.dementia_attention ?? '-'}, Composite ${details.dementia_composite ?? '-'}`
                        : `Clarity ${details.speech_therapy_clarity ?? '-'}, Pace ${details.speech_therapy_pace ?? '-'}, Stability ${details.speech_therapy_stability ?? '-'}, Composite ${details.speech_therapy_composite ?? '-'}`;

                    const statusClass =
                      report.mail_status === 'sent'
                        ? 'bg-emerald-500/25 text-emerald-100 border-emerald-300/40'
                        : report.mail_status === 'logged_only_no_smtp'
                          ? 'bg-amber-500/25 text-amber-100 border-amber-300/40'
                          : 'bg-rose-500/25 text-rose-100 border-rose-300/40';

                    const reportKey = `${report.sent_at}_${report.game_name}`;
                    const canRetry = report.mail_status !== 'sent';
                    const retryCount = retryCountByOriginalSentAt[report.sent_at || ''] || 0;

                    return (
                      <tr key={`${report.sent_at}_${index}`} className="border-b border-white/10 last:border-b-0">
                        <td className="px-4 py-3 text-slate-200">{report.sent_at ? new Date(report.sent_at).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3 font-semibold text-white">{report.game_name}</td>
                        <td className="px-4 py-3 text-slate-200">{scoreSummary}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
                            {report.mail_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              retryCount > 0
                                ? 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100'
                                : 'border-white/20 bg-white/10 text-slate-300'
                            }`}
                          >
                            {retryCount > 0 ? `${retryCount} retr${retryCount === 1 ? 'y' : 'ies'}` : 'No retries'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {report.mail_sent_to?.length ? report.mail_sent_to.join(', ') : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {report.mail_errors?.length ? report.mail_errors.join(' | ') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {canRetry ? (
                            <button
                              onClick={() => void handleRetryGameReportMail(report)}
                              disabled={retryingReportKey === reportKey}
                              className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {retryingReportKey === reportKey ? 'Retrying...' : 'Retry Mail'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Delivered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
