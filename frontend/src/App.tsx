import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Globe2,
  HeartPulse,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react';
import { ElderlyInterface } from './components/elderly/ElderlyInterface';
import { CaregiverDashboard } from './components/caregiver/CaregiverDashboard';
import { AdminPortal } from './components/admin/AdminPortal';

type InterfaceType = 'home' | 'elderly' | 'caregiver' | 'admin';

function App() {
  const [currentInterface, setCurrentInterface] = useState<InterfaceType>('home');
  const floatingOrbs = [
    { id: 'o1', size: 'h-80 w-80', color: 'bg-cyan-400', top: 'top-0', left: '-left-10', delay: 0 },
    { id: 'o2', size: 'h-96 w-96', color: 'bg-orange-400', top: 'top-1/4', left: 'left-1/3', delay: 0.7 },
    { id: 'o3', size: 'h-72 w-72', color: 'bg-fuchsia-400', top: 'bottom-0', left: 'right-0', delay: 1.2 },
  ];

  const highlights = [
    { label: 'Residents', value: '10' },
    { label: 'Voice Profiles', value: '10/10' },
    { label: 'Guardian Access', value: 'Active' },
    { label: 'Safety Mode', value: 'On' },
  ];

  const dashboardCards = [
    {
      id: 'elderly',
      title: 'Elderly AI Chatbot',
      description: 'Voice-first daily companion for reminders, wellbeing chat, and support.',
      icon: Mic,
      cta: 'Open Elderly Dashboard',
      onClick: () => setCurrentInterface('elderly' as InterfaceType),
      accent: 'from-cyan-400/30 to-blue-500/20',
    },
    {
      id: 'caregiver',
      title: 'Guardian Dashboard',
      description: 'Analyze each resident, monitor risk trends, and review alerts.',
      icon: Users,
      cta: 'Open Guardian Dashboard',
      onClick: () => setCurrentInterface('caregiver' as InterfaceType),
      accent: 'from-emerald-400/25 to-teal-500/20',
    },
    {
      id: 'admin',
      title: 'Admin Portal',
      description: 'Manage home-wide resident profiles, guardian access, and operations.',
      icon: ShieldCheck,
      cta: 'Open Admin Portal',
      onClick: () => setCurrentInterface('admin' as InterfaceType),
      accent: 'from-orange-400/25 to-rose-500/20',
    },
  ];

  return (
    <AnimatePresence mode="wait">
      {currentInterface === 'home' ? (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative min-h-screen overflow-hidden bg-[#050816] text-white"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.18),transparent_30%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:40px_40px]" />
          <div className="pointer-events-none absolute inset-0">
            {floatingOrbs.map((orb) => (
              <motion.div
                key={orb.id}
                className={`absolute ${orb.size} ${orb.color} ${orb.top} ${orb.left} rounded-full opacity-20 blur-3xl`}
                animate={{ y: [0, -30, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 9, repeat: Infinity, delay: orb.delay, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-8 lg:px-10">
            <motion.header
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <p className="font-[Orbitron] text-xs tracking-[0.35em] text-cyan-200/90">ElderCare AI</p>
                  <h1 className="font-[Orbitron] text-lg font-semibold tracking-wide text-white md:text-2xl">
                    Voice Companion Platform
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  English default
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  24/7 support
                </div>
              </div>
            </motion.header>

            <main className="grid flex-1 items-start gap-8 py-8 lg:grid-cols-1 lg:py-12">
              <motion.section
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                className="mx-auto w-full max-w-5xl space-y-8"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 backdrop-blur-md">
                  <Waves className="h-4 w-4" />
                  User Dashboard Opening Screen
                </div>

                <div className="space-y-5">
                  <p className="font-[Orbitron] text-xs tracking-[0.4em] text-cyan-200/80">
                    OLD AGE HOME • VOICE AI • GUARDIAN + ADMIN
                  </p>
                  <h2 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
                    Central dashboard for <span className="text-cyan-300">users</span>, <span className="text-orange-300">guardians</span>, and <span className="text-emerald-300">admin</span>.
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                    Choose the portal you want and continue instantly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {highlights.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                      <p className="mt-2 font-[Orbitron] text-2xl font-semibold text-white">{item.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {dashboardCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + index * 0.08 }}
                      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-5 backdrop-blur-xl`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                          <card.icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-white">{card.title}</h3>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-200">{card.description}</p>
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={card.onClick}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950"
                      >
                        {card.cta}
                        <ArrowRight className="h-3 w-3" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </main>

            <section className="grid gap-4 pb-8 md:grid-cols-3">
              {[
                { icon: Globe2, title: 'Language first', desc: 'English is the default across speech, chatbot, and UI flows.' },
                { icon: ShieldCheck, title: 'Accessible by design', desc: 'Large controls, readable contrast, and minimal cognitive load.' },
                { icon: HeartPulse, title: 'Companion mode', desc: 'Designed to support routines, conversations, and quick checks.' },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + idx * 0.08 }}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                      <item.icon className="h-5 w-5 text-orange-200" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{item.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </section>

            <section className="pb-10">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Unified User Flow</p>
                    <h3 className="mt-2 font-[Orbitron] text-2xl font-semibold text-white md:text-3xl">
                      Opening page now behaves like a dashboard while preserving premium design.
                    </h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentInterface('elderly')}
                    className="inline-flex items-center gap-3 rounded-full bg-orange-400 px-6 py-4 text-sm font-bold text-slate-950 shadow-[0_20px_60px_rgba(251,146,60,0.2)]"
                  >
                    <Mic className="h-4 w-4" />
                    Start User Dashboard
                  </motion.button>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      ) : currentInterface === 'elderly' ? (
        <motion.div
          key="elderly"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ElderlyInterface />
        </motion.div>
      ) : currentInterface === 'caregiver' ? (
        <motion.div
          key="caregiver"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CaregiverDashboard />
        </motion.div>
      ) : (
        <motion.div
          key="admin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AdminPortal />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
