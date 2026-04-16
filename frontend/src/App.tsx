import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElderlyInterface } from './components/elderly/ElderlyInterface';
import { CaregiverDashboard } from './components/caregiver/CaregiverDashboard';

type InterfaceType = 'home' | 'elderly' | 'caregiver';

function App() {
  const [currentInterface, setCurrentInterface] = useState<InterfaceType>('home');
  const floatingBubbles = [
    { id: 'b1', size: 'h-56 w-56', color: 'bg-cyan-300', top: 'top-8', left: 'left-4', delay: 0 },
    { id: 'b2', size: 'h-72 w-72', color: 'bg-amber-300', top: 'top-1/3', left: 'left-1/2', delay: 0.6 },
    { id: 'b3', size: 'h-48 w-48', color: 'bg-rose-300', top: 'bottom-12', left: 'right-8', delay: 1.1 },
  ];

  return (
    <AnimatePresence mode="wait">
      {currentInterface === 'home' ? (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-700 via-teal-600 to-emerald-600 flex items-center justify-center p-4"
        >
          <div className="pointer-events-none absolute inset-0">
            {floatingBubbles.map((bubble) => (
              <motion.div
                key={bubble.id}
                className={`absolute ${bubble.size} ${bubble.color} ${bubble.top} ${bubble.left} rounded-full opacity-20 blur-3xl`}
                animate={{ y: [0, -26, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 7, repeat: Infinity, delay: bubble.delay, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-4xl w-full">
            {/* Logo & Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.h1
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-6xl font-bold text-white mb-4"
              >
                🏥
              </motion.h1>
              <h2 className="text-5xl font-bold text-white mb-2">
                Elderly Care AI System
              </h2>
              <p className="text-xl text-blue-100">
                Voice-based cognitive support and caregiver monitoring
              </p>
            </motion.div>

            {/* Interface Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Elderly Interface Card */}
              <motion.button
                whileHover={{ scale: 1.04, rotate: -1.2, boxShadow: '0 24px 48px rgba(0,0,0,0.34)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentInterface('elderly')}
                className="relative overflow-hidden bg-white rounded-2xl shadow-2xl p-10 text-center group cursor-pointer"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="relative z-10 text-7xl mb-6"
                >
                  👴
                </motion.div>
                <h3 className="relative z-10 text-3xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                  Elderly Interface
                </h3>
                <p className="relative z-10 text-gray-600 text-lg mb-6">
                  Simple voice-based interaction with cognitive games
                </p>
                <ul className="relative z-10 text-left text-gray-600 space-y-2 mb-6">
                  <li>✓ Large touch-friendly buttons</li>
                  <li>✓ Voice input and output</li>
                  <li>✓ Daily health reminders</li>
                  <li>✓ Cognitive games</li>
                </ul>
                <motion.div
                  whileHover={{ x: 5 }}
                  className="relative z-10 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold group-hover:bg-blue-700 transition"
                >
                  Open →
                </motion.div>
              </motion.button>

              {/* Caregiver Dashboard Card */}
              <motion.button
                whileHover={{ scale: 1.04, rotate: 1.2, boxShadow: '0 24px 48px rgba(0,0,0,0.34)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentInterface('caregiver')}
                className="relative overflow-hidden bg-white rounded-2xl shadow-2xl p-10 text-center group cursor-pointer"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-rose-50 to-transparent"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                  className="relative z-10 text-7xl mb-6"
                >
                  👩‍⚕️
                </motion.div>
                <h3 className="relative z-10 text-3xl font-bold text-gray-800 mb-2 group-hover:text-red-600 transition">
                  Caregiver Dashboard
                </h3>
                <p className="relative z-10 text-gray-600 text-lg mb-6">
                  Monitor health, emotions, and cognitive status
                </p>
                <ul className="relative z-10 text-left text-gray-600 space-y-2 mb-6">
                  <li>✓ Real-time monitoring</li>
                  <li>✓ Emotion & mood tracking</li>
                  <li>✓ Risk assessment alerts</li>
                  <li>✓ Analytics & reports</li>
                </ul>
                <motion.div
                  whileHover={{ x: 5 }}
                  className="relative z-10 inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-bold group-hover:bg-red-700 transition"
                >
                  Open →
                </motion.div>
              </motion.button>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 bg-white bg-opacity-20 backdrop-blur-lg rounded-xl p-8 text-white"
            >
              <h3 className="text-2xl font-bold mb-6">✨ Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-4xl mb-3">🎤</p>
                  <h4 className="font-bold mb-2">Voice Interface</h4>
                  <p className="text-sm opacity-90">Natural voice interaction in English & Tamil</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl mb-3">🧠</p>
                  <h4 className="font-bold mb-2">Cognitive Assessment</h4>
                  <p className="text-sm opacity-90">Alzheimer's risk detection with ML models</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl mb-3">📊</p>
                  <h4 className="font-bold mb-2">Advanced Analytics</h4>
                  <p className="text-sm opacity-90">Mood trends and behavioral anomaly detection</p>
                </div>
              </div>
            </motion.div>
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
      ) : (
        <motion.div
          key="caregiver"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CaregiverDashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
