import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserRound, Waves, Home, Mic, Lock } from 'lucide-react';
import { apiClient, AdminResidentReport, ResidentProfile } from '../../services/api';

export const AdminPortal: React.FC = () => {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<AdminResidentReport | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getResidents();
        setResidents(data);
        if (data.length > 0) {
          setSelectedResidentId(data[0].resident_id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedResidentId) {
        return;
      }
      setReportLoading(true);
      setErrorText('');
      try {
        const data = await apiClient.getAdminResidentReport(selectedResidentId);
        setReport(data);
      } catch (error) {
        console.error(error);
        setErrorText('Failed to load resident report');
      } finally {
        setReportLoading(false);
      }
    };
    void loadReport();
  }, [selectedResidentId]);

  const handleDownloadPdf = async () => {
    if (!selectedResidentId) {
      return;
    }
    try {
      const blob = await apiClient.downloadAdminResidentPdf(selectedResidentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedResidentId}_report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setErrorText('Unable to download PDF report');
    }
  };

  const handleDownloadJson = async () => {
    if (!selectedResidentId) {
      return;
    }
    try {
      const blob = await apiClient.downloadAdminResidentJson(selectedResidentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedResidentId}_report.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setErrorText('Unable to download JSON report');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">Admin Control</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800">Old Age Home Resident Control Panel</h1>
          <p className="mt-2 text-slate-600">Manage resident analytics, guardian alerts, and downloadable reports in one place.</p>
        </motion.div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { icon: UserRound, label: 'Residents', value: residents.length.toString() },
            { icon: Mic, label: 'Voice Profiles', value: residents.length.toString() },
            { icon: Lock, label: 'Guardian Access', value: 'Enabled' },
            { icon: Waves, label: 'Activity Mode', value: 'Off by default' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 text-blue-600">
                <item.icon className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span>Selected resident</span>
              <select
                value={selectedResidentId}
                onChange={(event) => setSelectedResidentId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                {residents.map((resident) => (
                  <option key={resident.resident_id} value={resident.resident_id}>
                    {resident.name} ({resident.resident_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => selectedResidentId && apiClient.getAdminResidentReport(selectedResidentId).then(setReport).catch(() => setErrorText('Failed to refresh report'))}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Save/Refresh Report
              </button>
              <button
                onClick={handleDownloadPdf}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Download PDF
              </button>
              <button
                onClick={handleDownloadJson}
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Download JSON
              </button>
            </div>
          </div>

          {reportLoading ? (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              Building and saving analytics report...
            </div>
          ) : report ? (
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Average Happiness</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{report.average_happiness.toFixed(1)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Threshold</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{report.threshold.toFixed(0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Happy Times</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{report.happy_times.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase text-slate-500">Not Happy Times</p>
                <p className="mt-1 text-2xl font-bold text-rose-300">{report.unhappy_times.length}</p>
              </div>
            </div>
          ) : null}

          {report?.low_happiness_mail_sent && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              Happiness dropped below threshold (&lt; 50). Alert mail sent to children/guardians to visit the resident.
            </div>
          )}

          {errorText && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {errorText}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="text-slate-300">Loading residents...</p>
            ) : (
              residents.map((resident) => (
                <motion.div
                  key={resident.resident_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">{resident.name}</h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{resident.resident_id}</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><Home className="h-4 w-4" /> Room {resident.room}</p>
                    <p className="flex items-center gap-2"><Shield className="h-4 w-4" /> Guardian: {resident.guardian_username}</p>
                    <p className="flex items-center gap-2"><Mic className="h-4 w-4" /> Voice: {resident.voice_profile}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {report && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-bold text-slate-800">Mood Timeline (happy vs not happy by time)</h3>
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Emotion</th>
                      <th className="px-3 py-2">Happiness</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...report.timeline].reverse().slice(0, 60).map((item, index) => (
                      <tr key={`${item.timestamp}_${index}`} className="border-t border-slate-200 text-slate-700">
                        <td className="px-3 py-2">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2 capitalize">{item.emotion}</td>
                        <td className="px-3 py-2">{item.happiness_score.toFixed(1)}</td>
                        <td className="px-3 py-2">
                          {item.is_happy ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Happy</span>
                          ) : (
                            <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">Not Happy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
