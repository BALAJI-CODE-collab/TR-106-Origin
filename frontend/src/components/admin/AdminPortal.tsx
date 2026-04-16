import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserRound, Waves, Home, Mic, Lock } from 'lucide-react';
import { apiClient, ResidentProfile } from '../../services/api';

export const AdminPortal: React.FC = () => {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getResidents();
        setResidents(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] px-4 py-6 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_90%_20%,rgba(251,146,60,0.14),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.16),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          <p className="font-[Orbitron] text-xs uppercase tracking-[0.33em] text-cyan-200">Admin Control</p>
          <h1 className="mt-2 font-[Orbitron] text-3xl font-bold text-white">Old Age Home Resident Control Panel</h1>
          <p className="mt-2 text-slate-300">10 residents are seeded with voice profile defaults. Fun activities are disabled by default.</p>
        </motion.div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { icon: UserRound, label: 'Residents', value: residents.length.toString() },
            { icon: Mic, label: 'Voice Profiles', value: residents.length.toString() },
            { icon: Lock, label: 'Guardian Access', value: 'Enabled' },
            { icon: Waves, label: 'Activity Mode', value: 'Off by default' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3 text-cyan-300">
                <item.icon className="h-5 w-5" />
                <p className="text-sm uppercase tracking-[0.2em]">{item.label}</p>
              </div>
              <p className="mt-2 font-[Orbitron] text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="text-slate-300">Loading residents...</p>
            ) : (
              residents.map((resident) => (
                <motion.div
                  key={resident.resident_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{resident.name}</h3>
                    <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">{resident.resident_id}</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <p className="flex items-center gap-2"><Home className="h-4 w-4" /> Room {resident.room}</p>
                    <p className="flex items-center gap-2"><Shield className="h-4 w-4" /> Guardian: {resident.guardian_username}</p>
                    <p className="flex items-center gap-2"><Mic className="h-4 w-4" /> Voice: {resident.voice_profile}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
