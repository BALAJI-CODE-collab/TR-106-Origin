import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isProcessing?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  isListening,
  onStartListening,
  onStopListening,
  isProcessing = false,
}) => {
  useEffect(() => {}, [isListening]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large Microphone Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? onStopListening : onStartListening}
        disabled={isProcessing}
        className={`
          relative flex h-36 w-36 items-center justify-center rounded-full
          text-white text-xl font-bold transition-all
          ${isListening 
            ? 'bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 shadow-[0_24px_80px_rgba(239,68,68,0.35)]' 
            : 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_24px_80px_rgba(37,99,235,0.25)]'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Pulsing background */}
        {isListening && (
          <>
            <motion.div
              animate={{ scale: [1, 1.3], opacity: [1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-rose-400"
            />
            <motion.div
              animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="absolute inset-0 rounded-full bg-rose-400"
            />
          </>
        )}

        {/* Icon */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {isListening ? (
            <Square className="h-12 w-12" fill="white" />
          ) : (
            <Mic className="h-12 w-12" />
          )}
          <span className="text-xs font-semibold uppercase tracking-[0.28em] opacity-85">
            {isListening ? 'Stop' : 'Speak'}
          </span>
        </div>
      </motion.button>

      {/* Status Text */}
      <div className="text-center">
        <p className="text-lg font-semibold tracking-wide text-slate-800">
          {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Tap to speak'}
        </p>
        {isListening && (
          <p className="mt-2 animate-pulse text-sm font-medium text-blue-600">
            Listening for your voice...
          </p>
        )}
      </div>

      {/* Audio Wave Animation */}
      {isListening && (
        <div className="flex h-8 items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [8, 20, 8] }}
              transition={{
                duration: 0.4,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-1 rounded-full bg-blue-600"
            />
          ))}
        </div>
      )}
    </div>
  );
};
